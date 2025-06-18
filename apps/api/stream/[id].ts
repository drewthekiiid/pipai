/**
 * Dynamic SSE streaming endpoint for PIP AI
 * Handles [id].ts dynamic routing for workflow and file streams
 * Consumes Upstash Redis streams and pipes Server-Sent Events to browser
 */

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { Temporal } from '@temporalio/client';

// Types
interface StreamEvent {
  id: string;
  timestamp: number;
  data: Record<string, any>;
}

interface StreamOptions {
  lastEventId?: string;
  block?: number;
  count?: number;
}

// Initialize clients
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

let temporalClient: Temporal.Client | null = null;

async function getTemporalClient() {
  if (!temporalClient) {
    temporalClient = await Temporal.Client.connect({
      address: process.env.TEMPORAL_HOST || 'us-east-1.aws.api.temporal.io:7233',
      namespace: process.env.TEMPORAL_NAMESPACE || 'pip-ai.ts7wf',
      apiKey: process.env.TEMPORAL_API_KEY,
      tls: true,
    });
  }
  return temporalClient;
}

// Stream types and key generators
const getStreamKey = (type: string, id: string): string => {
  switch (type) {
    case 'workflow':
      return `pip-ai:workflow:${id}:progress`;
    case 'file':
      return `pip-ai:file:${id}:analysis`;
    case 'user':
      return `pip-ai:user:${id}:events`;
    default:
      throw new Error(`Invalid stream type: ${type}`);
  }
};

// SSE utility functions
const formatSSE = (event: string, data: any, id?: string): string => {
  const lines: string[] = [];
  
  if (id) {
    lines.push(`id: ${id}`);
  }
  
  lines.push(`event: ${event}`);
  lines.push(`data: ${JSON.stringify(data)}`);
  lines.push(''); // Empty line to end the event
  
  return lines.join('\n') + '\n';
};

const createSSEHeaders = () => ({
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
});

// Stream managers
class StreamManager {
  private activeStreams = new Set<string>();
  private abortControllers = new Map<string, AbortController>();

  async createWorkflowStream(workflowId: string, options: StreamOptions = {}) {
    const streamId = `workflow:${workflowId}`;
    const streamKey = getStreamKey('workflow', workflowId);
    
    return this.createGenericStream(streamId, streamKey, options, async () => {
      // Also query Temporal for workflow status
      try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(workflowId);
        const status = await handle.query('getAnalysisStatus');
        
        return {
          event: 'temporal_status',
          data: {
            workflow_id: workflowId,
            status,
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        // Workflow might not support queries or be completed
        return null;
      }
    });
  }

  async createFileStream(fileId: string, options: StreamOptions = {}) {
    const streamId = `file:${fileId}`;
    const streamKey = getStreamKey('file', fileId);
    
    return this.createGenericStream(streamId, streamKey, options);
  }

  async createUserStream(userId: string, options: StreamOptions = {}) {
    const streamId = `user:${userId}`;
    
    // User streams read from multiple Redis streams
    const streamKeys = [
      'pip-ai:workflow:progress',
      'pip-ai:file:progress', 
      'pip-ai:notifications',
      `pip-ai:user:${userId}:events`,
    ];
    
    return this.createMultiStream(streamId, streamKeys, options, (event) => {
      // Filter events for this user
      const data = event.data;
      return (
        data.user_id === userId ||
        data.workflow_id?.includes(userId) ||
        data.file_id?.includes(userId)
      );
    });
  }

  private async createGenericStream(
    streamId: string,
    streamKey: string,
    options: StreamOptions = {},
    additionalDataProvider?: () => Promise<{ event: string; data: any } | null>
  ) {
    if (this.activeStreams.has(streamId)) {
      throw new Error(`Stream ${streamId} already active`);
    }

    this.activeStreams.add(streamId);
    const abortController = new AbortController();
    this.abortControllers.set(streamId, abortController);

    const { lastEventId = '0', block = 1000, count = 10 } = options;
    
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection event
        const connectEvent = formatSSE('connected', {
          stream_id: streamId,
          timestamp: new Date().toISOString(),
        });
        controller.enqueue(new TextEncoder().encode(connectEvent));

        let currentLastId = lastEventId;

        try {
          while (!abortController.signal.aborted) {
            try {
              // Read from Redis stream
              const results = await redis.xread(
                'BLOCK', block,
                'COUNT', count,
                'STREAMS', streamKey, currentLastId
              );

              if (results && results.length > 0) {
                for (const [, entries] of results) {
                  for (const [id, fields] of entries as [string, string[]][]) {
                    currentLastId = id;
                    
                    // Convert Redis fields array to object
                    const data: Record<string, any> = {};
                    for (let i = 0; i < fields.length; i += 2) {
                      data[fields[i]] = fields[i + 1];
                    }

                    // Parse JSON fields
                    Object.keys(data).forEach(key => {
                      try {
                        data[key] = JSON.parse(data[key]);
                      } catch {
                        // Keep as string if not JSON
                      }
                    });

                    const eventType = data.event_type || 'progress';
                    const eventData = {
                      ...data,
                      timestamp: new Date().toISOString(),
                    };

                    const sseEvent = formatSSE(eventType, eventData, id);
                    controller.enqueue(new TextEncoder().encode(sseEvent));
                  }
                }
              }

              // Get additional data if provider exists
              if (additionalDataProvider) {
                const additionalData = await additionalDataProvider();
                if (additionalData) {
                  const sseEvent = formatSSE(
                    additionalData.event,
                    additionalData.data
                  );
                  controller.enqueue(new TextEncoder().encode(sseEvent));
                }
              }

              // Small delay to prevent overwhelming
              await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
              if (!abortController.signal.aborted) {
                console.error(`Stream ${streamId} error:`, error);
                
                const errorEvent = formatSSE('error', {
                  message: error instanceof Error ? error.message : 'Unknown error',
                  timestamp: new Date().toISOString(),
                });
                controller.enqueue(new TextEncoder().encode(errorEvent));
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
        } finally {
          // Send disconnect event
          const disconnectEvent = formatSSE('disconnected', {
            stream_id: streamId,
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(new TextEncoder().encode(disconnectEvent));
          
          controller.close();
          this.cleanup(streamId);
        }
      },

      cancel() {
        abortController.abort();
        this.cleanup(streamId);
      }
    });

    return stream;
  }

  private async createMultiStream(
    streamId: string,
    streamKeys: string[],
    options: StreamOptions = {},
    filter?: (event: { data: any }) => boolean
  ) {
    if (this.activeStreams.has(streamId)) {
      throw new Error(`Stream ${streamId} already active`);
    }

    this.activeStreams.add(streamId);
    const abortController = new AbortController();
    this.abortControllers.set(streamId, abortController);

    const { block = 1000, count = 5 } = options;
    
    const stream = new ReadableStream({
      async start(controller) {
        const connectEvent = formatSSE('connected', {
          stream_id: streamId,
          timestamp: new Date().toISOString(),
        });
        controller.enqueue(new TextEncoder().encode(connectEvent));

        const lastIds: Record<string, string> = {};
        streamKeys.forEach(key => {
          lastIds[key] = '0';
        });

        try {
          while (!abortController.signal.aborted) {
            try {
              // Build STREAMS argument
              const streamsArgs: string[] = ['BLOCK', block.toString(), 'COUNT', count.toString(), 'STREAMS'];
              streamKeys.forEach(key => streamsArgs.push(key));
              Object.values(lastIds).forEach(id => streamsArgs.push(id));

              const results = await redis.xread(...streamsArgs);

              if (results && results.length > 0) {
                for (const [streamName, entries] of results) {
                  for (const [id, fields] of entries as [string, string[]][]) {
                    lastIds[streamName] = id;
                    
                    // Convert to object
                    const data: Record<string, any> = {};
                    for (let i = 0; i < fields.length; i += 2) {
                      data[fields[i]] = fields[i + 1];
                    }

                    // Parse JSON
                    Object.keys(data).forEach(key => {
                      try {
                        data[key] = JSON.parse(data[key]);
                      } catch {
                        // Keep as string
                      }
                    });

                    // Apply filter if provided
                    if (filter && !filter({ data })) {
                      continue;
                    }

                    const eventType = data.event_type || 'notification';
                    const eventData = {
                      ...data,
                      stream_source: streamName,
                      timestamp: new Date().toISOString(),
                    };

                    const sseEvent = formatSSE(eventType, eventData, id);
                    controller.enqueue(new TextEncoder().encode(sseEvent));
                  }
                }
              }

              await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
              if (!abortController.signal.aborted) {
                console.error(`Multi-stream ${streamId} error:`, error);
                
                const errorEvent = formatSSE('error', {
                  message: error instanceof Error ? error.message : 'Unknown error',
                  timestamp: new Date().toISOString(),
                });
                controller.enqueue(new TextEncoder().encode(errorEvent));
                
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
        } finally {
          const disconnectEvent = formatSSE('disconnected', {
            stream_id: streamId,
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(new TextEncoder().encode(disconnectEvent));
          
          controller.close();
          this.cleanup(streamId);
        }
      },

      cancel() {
        abortController.abort();
        this.cleanup(streamId);
      }
    });

    return stream;
  }

  private cleanup(streamId: string) {
    this.activeStreams.delete(streamId);
    const controller = this.abortControllers.get(streamId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(streamId);
    }
  }

  stopStream(streamId: string) {
    this.cleanup(streamId);
  }

  getActiveStreams() {
    return Array.from(this.activeStreams);
  }
}

// Global stream manager
const streamManager = new StreamManager();

// API Route Handler
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const streamType = searchParams.get('type') || 'workflow';
  const lastEventId = request.headers.get('Last-Event-ID') || '0';
  const block = parseInt(searchParams.get('block') || '1000');
  const count = parseInt(searchParams.get('count') || '10');

  const { id } = params;

  try {
    let stream: ReadableStream;

    switch (streamType) {
      case 'workflow':
        stream = await streamManager.createWorkflowStream(id, {
          lastEventId,
          block,
          count,
        });
        break;
      
      case 'file':
        stream = await streamManager.createFileStream(id, {
          lastEventId,
          block,
          count,
        });
        break;
      
      case 'user':
        stream = await streamManager.createUserStream(id, {
          lastEventId,
          block,
          count,
        });
        break;
      
      default:
        return NextResponse.json(
          { error: `Invalid stream type: ${streamType}` },
          { status: 400 }
        );
    }

    return new NextResponse(stream, {
      headers: createSSEHeaders(),
    });

  } catch (error) {
    console.error('Stream creation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create stream',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: createSSEHeaders(),
  });
}

// Publisher utilities (for use in other API routes)
export class StreamPublisher {
  static async publishWorkflowProgress(workflowId: string, data: Record<string, any>) {
    const streamKey = getStreamKey('workflow', workflowId);
    const streamData = {
      workflow_id: workflowId,
      timestamp: new Date().toISOString(),
      event_type: 'workflow_progress',
      ...data,
    };

    // Convert to Redis stream format
    const fields: string[] = [];
    Object.entries(streamData).forEach(([key, value]) => {
      fields.push(key, typeof value === 'string' ? value : JSON.stringify(value));
    });

    await redis.xadd(streamKey, '*', ...fields);
  }

  static async publishFileProgress(fileId: string, data: Record<string, any>) {
    const streamKey = getStreamKey('file', fileId);
    const streamData = {
      file_id: fileId,
      timestamp: new Date().toISOString(),
      event_type: 'file_progress',
      ...data,
    };

    const fields: string[] = [];
    Object.entries(streamData).forEach(([key, value]) => {
      fields.push(key, typeof value === 'string' ? value : JSON.stringify(value));
    });

    await redis.xadd(streamKey, '*', ...fields);
  }

  static async publishUserNotification(userId: string, data: Record<string, any>) {
    const streamKey = getStreamKey('user', userId);
    const streamData = {
      user_id: userId,
      timestamp: new Date().toISOString(),
      event_type: 'notification',
      ...data,
    };

    const fields: string[] = [];
    Object.entries(streamData).forEach(([key, value]) => {
      fields.push(key, typeof value === 'string' ? value : JSON.stringify(value));
    });

    await redis.xadd(streamKey, '*', ...fields);
  }
}

// Health check utility
export async function checkStreamHealth() {
  try {
    // Test Redis connection
    await redis.ping();
    
    // Test Temporal connection
    const client = await getTemporalClient();
    await client.connection.workflowService.getSystemInfo({});
    
    return {
      status: 'healthy',
      services: {
        redis: 'healthy',
        temporal: 'healthy',
      },
      active_streams: streamManager.getActiveStreams().length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}
