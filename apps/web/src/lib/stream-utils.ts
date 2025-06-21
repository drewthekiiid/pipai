// Stream publisher utilities for PIP AI
import type { Redis } from '@upstash/redis';

// Initialize Redis client lazily
let redisClient: Redis | null = null;

async function getRedisClient(): Promise<Redis> {
  if (!redisClient) {
    const { Redis } = await import('@upstash/redis');
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

export interface StreamEvent {
  id: string;
  timestamp: string;
  type: string;
  data: Record<string, unknown>;
}

// Publisher utility for sending events to Redis streams
export async function publishEvent(streamKey: string, event: Omit<StreamEvent, 'id' | 'timestamp'>) {
  const eventWithMeta: StreamEvent = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...event,
  };

  const redis = await getRedisClient();
  // Convert to Redis-compatible format
  const redisFields = {
    id: eventWithMeta.id,
    timestamp: eventWithMeta.timestamp,
    type: eventWithMeta.type,
    data: JSON.stringify(eventWithMeta.data),
  };
  
  await redis.xadd(streamKey, '*', redisFields);
  return eventWithMeta;
}

// Workflow event publishers
export async function publishWorkflowStarted(workflowId: string, data: Record<string, unknown> = {}) {
  return publishEvent(`workflow:${workflowId}`, {
    type: 'workflow.started',
    data: { workflowId, ...data },
  });
}

export async function publishWorkflowProgress(workflowId: string, progress: number, message?: string) {
  return publishEvent(`workflow:${workflowId}`, {
    type: 'workflow.progress',
    data: { workflowId, progress, message },
  });
}

export async function publishWorkflowCompleted(workflowId: string, result: Record<string, unknown> = {}) {
  return publishEvent(`workflow:${workflowId}`, {
    type: 'workflow.completed',
    data: { workflowId, result },
  });
}

export async function publishWorkflowFailed(workflowId: string, error: string) {
  return publishEvent(`workflow:${workflowId}`, {
    type: 'workflow.failed',
    data: { workflowId, error },
  });
}

// File event publishers
export async function publishFileUploaded(fileId: string, filename: string, size: number) {
  return publishEvent(`file:${fileId}`, {
    type: 'file.uploaded',
    data: { fileId, filename, size },
  });
}

export async function publishFileAnalysisStarted(fileId: string, analysisType: string) {
  return publishEvent(`file:${fileId}`, {
    type: 'file.analysis.started',
    data: { fileId, analysisType },
  });
}

export async function publishFileAnalysisProgress(fileId: string, progress: number, message?: string) {
  return publishEvent(`file:${fileId}`, {
    type: 'file.analysis.progress',
    data: { fileId, progress, message },
  });
}

export async function publishFileAnalysisCompleted(fileId: string, results: Record<string, unknown>) {
  return publishEvent(`file:${fileId}`, {
    type: 'file.analysis.completed',
    data: { fileId, results },
  });
}

// User event publishers
export async function publishUserActivity(userId: string, activity: string, metadata: Record<string, unknown> = {}) {
  return publishEvent(`user:${userId}`, {
    type: 'user.activity',
    data: { userId, activity, metadata },
  });
}

// Stream consumer
export async function* consumeStream(streamKey: string, lastId: string = '0') {
  let currentId = lastId;
  const redis = await getRedisClient();
  
  while (true) {
    try {
      // Read from Redis stream using Upstash syntax
      const result = await redis.xread(
        [streamKey], 
        [currentId], 
        { 
          blockMS: 1000, // Block for 1 second
          count: 10,
        }
      );

      if (result && Array.isArray(result) && result.length > 0) {
        const [, messages] = result[0] as [string, Array<[string, Record<string, string>]>];
        
        for (const [id, fields] of messages) {
          currentId = id;
          
          // Convert Redis stream fields back to event format
          const event: StreamEvent = {
            id: fields.id || id,
            timestamp: fields.timestamp || new Date().toISOString(),
            type: fields.type,
            data: typeof fields.data === 'string' ? JSON.parse(fields.data) : (fields.data as Record<string, unknown>) || {},
          };
          
          yield event;
        }
      }
    } catch (error) {
      console.error('Error reading from Redis stream:', error);
      // On error, wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Health check utilities
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

export async function checkTemporalHealth(): Promise<boolean> {
  try {
    const { Client, Connection } = await import('@temporalio/client');
    
    const temporalAddress = process.env.TEMPORAL_ADDRESS || 'us-east-1.aws.api.temporal.io:7233';
    const connectionOptions: Record<string, unknown> = {
      address: temporalAddress,
    };

    // Only add TLS and API key for Temporal Cloud
    if (temporalAddress.includes('temporal.io')) {
      connectionOptions.tls = true;
      
      // Ensure API key doesn't have Bearer prefix and clean it
      let cleanApiKey = process.env.TEMPORAL_API_KEY || '';
      if (cleanApiKey.startsWith('Bearer ')) {
        cleanApiKey = cleanApiKey.substring(7);
      }
      connectionOptions.apiKey = cleanApiKey;
    }
    
    const connection = await Connection.connect(connectionOptions);
    
    const client = new Client({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE || 'pip-ai.ts7wf',
    });
    
    await client.workflowService.getSystemInfo({});
    return true;
  } catch (error) {
    console.error('Temporal health check failed:', error);
    return false;
  }
}
