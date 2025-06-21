/**
 * PIP AI Stream API - Server-Sent Events for Workflow Progress
 * GET /api/stream/[workflowId] - Stream workflow execution progress
 */

// Configure route as dynamic for API functionality
export const dynamic = 'force-dynamic';

import { Connection, Client as TemporalClient } from '@temporalio/client';
import { NextRequest, NextResponse } from 'next/server';

// Environment configuration
const config = {
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'us-east-1.aws.api.temporal.io:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'pip-ai.ts7wf',
    apiKey: process.env.TEMPORAL_API_KEY || '',
  },
};

let temporalClient: TemporalClient;

async function getTemporalClient(): Promise<TemporalClient> {
  if (!temporalClient) {
    const connectionOptions: Record<string, unknown> = {
      address: config.temporal.address,
    };

    // Only add TLS and API key for Temporal Cloud
    if (config.temporal.address.includes('temporal.io')) {
      connectionOptions.tls = true;
      
      // Ensure API key doesn't have Bearer prefix and clean it
      let cleanApiKey = config.temporal.apiKey;
      if (cleanApiKey.startsWith('Bearer ')) {
        cleanApiKey = cleanApiKey.substring(7);
      }
      connectionOptions.apiKey = cleanApiKey;
    }

    temporalClient = new TemporalClient({
      connection: await Connection.connect(connectionOptions),
      namespace: config.temporal.namespace,
    });
  }
  return temporalClient;
}

// Types for construction analysis progress
interface AnalysisStatus {
  step: string;
  progress: number;
  error?: string;
  result?: Record<string, unknown>;
  canceled?: boolean;
}

/**
 * Extract agent name from construction analysis step
 */
function extractAgentFromStep(step: string): string {
  if (!step) return 'System';
  
  if (step.includes('Manager Agent')) return 'Manager';
  if (step.includes('File Reader Agent')) return 'File Reader';
  if (step.includes('Trade Mapper Agent')) return 'Trade Mapper';
  if (step.includes('Estimator Agent')) return 'Estimator';
  if (step.includes('Exporter Agent')) return 'Exporter';
  
  return 'System';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await params;

  if (!workflowId) {
    return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
  }

  console.log(`🔄 Starting SSE stream for workflow: ${workflowId}`);

  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false;
      let pollInterval: NodeJS.Timeout | null = null;
      
      // Safe sendEvent that checks if controller is still open
      const sendEvent = (event: string, data: Record<string, unknown>) => {
        if (isClosed) return;
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('Error sending SSE event:', error);
          cleanup();
        }
      };

      // Cleanup function to properly close everything
      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        try {
          controller.close();
        } catch (error) {
          // Controller might already be closed
        }
      };

      try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(workflowId);

        // Send initial connection event
        sendEvent('connected', {
          workflowId,
          timestamp: new Date().toISOString(),
          message: 'Connected to workflow stream'
        });

        // Enhanced polling for construction analysis progress
        let lastStatus = '';
        let lastProgress = -1;
        let pollCount = 0;
        const maxPolls = 300; // 5 minutes max
        
        pollInterval = setInterval(async () => {
          if (isClosed) return;
          
          pollCount++;
          
          try {
            // Get workflow description
            const description = await handle.describe();
            const currentStatus = description.status.name;
            
            // Send status update if changed
            if (currentStatus !== lastStatus) {
              sendEvent('status', {
                workflowId,
                status: currentStatus,
                timestamp: new Date().toISOString(),
                pollCount
              });
              lastStatus = currentStatus;
            }

            // Query construction analysis progress
            try {
              const progressStatus = await handle.query('getAnalysisStatus') as AnalysisStatus;
              
              if (progressStatus && progressStatus.progress !== lastProgress) {
                // Send detailed construction progress
                sendEvent('progress', {
                  workflowId,
                  step: progressStatus.step,
                  progress: progressStatus.progress,
                  agent: extractAgentFromStep(progressStatus.step),
                  timestamp: new Date().toISOString(),
                  error: progressStatus.error || null
                });
                
                lastProgress = progressStatus.progress;
                
                // Send completion event when progress reaches 100%
                if (progressStatus.progress >= 100) {
                  sendEvent('analysis_complete', {
                    workflowId,
                    step: progressStatus.step,
                    timestamp: new Date().toISOString()
                  });
                }
              }
            } catch {
              // Query might fail during early workflow stages - that's normal
              if (pollCount % 30 === 0) { // Log only every 30 seconds to avoid spam
                console.log('Query not yet available for workflow:', workflowId);
              }
            }

            // If workflow completed, get final result
            if (currentStatus === 'COMPLETED') {
              try {
                const result = await handle.result();
                sendEvent('completed', {
                  workflowId,
                  result,
                  timestamp: new Date().toISOString()
                });
              } catch {
                sendEvent('completed', {
                  workflowId,
                  result: { 
                    message: 'Construction analysis completed successfully',
                    status: 'success'
                  },
                  timestamp: new Date().toISOString()
                });
              }
              
              cleanup();
              return;
            }
            
            if (currentStatus === 'FAILED' || currentStatus === 'TERMINATED') {
              sendEvent('failed', {
                workflowId,
                status: currentStatus,
                error: 'Construction analysis workflow failed',
                timestamp: new Date().toISOString()
              });
              
              cleanup();
              return;
            }

            // Send periodic heartbeat with connection status
            if (pollCount % 15 === 0) {
              sendEvent('heartbeat', {
                workflowId,
                pollCount,
                message: 'Construction analysis in progress...',
                timestamp: new Date().toISOString()
              });
            }

            // Stop polling after max attempts
            if (pollCount >= maxPolls) {
              sendEvent('timeout', {
                workflowId,
                message: 'Construction analysis timeout - please check workflow status',
                timestamp: new Date().toISOString()
              });
              
              cleanup();
            }
            
          } catch (error) {
            console.error('Error polling workflow:', error);
            sendEvent('error', {
              workflowId,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            });
            
            // For workflow not found errors, close the stream
            if (error instanceof Error && error.message.includes('workflow not found')) {
              cleanup();
            }
          }
        }, 800); // Poll more frequently for better UX

      } catch (error) {
        console.error('Error setting up workflow stream:', error);
        sendEvent('error', {
          workflowId,
          error: error instanceof Error ? error.message : 'Failed to connect to workflow',
          timestamp: new Date().toISOString()
        });
        cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
