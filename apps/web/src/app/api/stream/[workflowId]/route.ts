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
      let cleanupExecuted = false;
      
      // Safe sendEvent that handles all controller closure scenarios
      const sendEvent = (event: string, data: Record<string, unknown>): boolean => {
        // Multiple safety checks before attempting to send
        if (isClosed || cleanupExecuted) {
          return false;
        }
        
        // Check if controller is still writable
        try {
          // Test controller state before attempting to enqueue
          if (!controller.desiredSize && controller.desiredSize !== 0) {
            console.log('🔌 Controller no longer writable, client disconnected');
            safeCleanup();
            return false;
          }
          
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
          return true;
          
        } catch (error: unknown) {
          // Handle all controller error scenarios
          if (error instanceof TypeError) {
            if (error.message.includes('Controller is already closed') || 
                error.message.includes('Invalid state')) {
              console.log('🔌 SSE controller closed by client, cleaning up gracefully');
            } else {
              console.error('SSE TypeError:', error.message);
            }
          } else {
            console.error('SSE send error:', error);
          }
          
          // Always cleanup on any controller error
          safeCleanup();
          return false;
        }
      };

      // Safe cleanup function that prevents multiple executions
      const safeCleanup = () => {
        if (cleanupExecuted) return;
        
        console.log(`🧹 Cleaning up SSE stream for workflow: ${workflowId}`);
        
        // Set flags first to prevent race conditions
        cleanupExecuted = true;
        isClosed = true;
        
        // Clear polling interval immediately
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        
        // Safely close controller with multiple checks
        try {
          // Only attempt to close if controller appears to be open
          if (controller && typeof controller.close === 'function') {
            controller.close();
          }
        } catch (error) {
          // Controller might already be closed, which is fine
          if (error instanceof TypeError && error.message.includes('Controller is already closed')) {
            console.log('✅ Controller already closed during cleanup');
          } else {
            console.log('⚠️ Controller cleanup warning:', error);
          }
        }
      };

      try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(workflowId);

        // Send initial connection event
        if (!sendEvent('connected', {
          workflowId,
          timestamp: new Date().toISOString(),
          message: 'Connected to workflow stream'
        })) {
          return; // Client already disconnected
        }

        // Enhanced polling for construction analysis progress
        let lastStatus = '';
        let lastProgress = -1;
        let pollCount = 0;
        let queryFailureCount = 0;
        const maxPolls = 600; // 8 minutes max (workflows can take 5-7 minutes)
        const maxQueryFailures = 60; // Allow 60 query failures before giving up
        
        pollInterval = setInterval(async () => {
          // Early exit if stream is closed
          if (isClosed || cleanupExecuted) {
            safeCleanup();
            return;
          }
          
          pollCount++;
          
          try {
            // Get workflow description
            const description = await handle.describe();
            const currentStatus = description.status.name;
            
            // Send status update if changed
            if (currentStatus !== lastStatus) {
              console.log(`📊 Workflow ${workflowId} status changed: ${lastStatus} → ${currentStatus} (poll ${pollCount})`);
              
              if (!sendEvent('status', {
                workflowId,
                status: currentStatus,
                timestamp: new Date().toISOString(),
                pollCount
              })) {
                return; // Client disconnected during send
              }
              lastStatus = currentStatus;
            }

            // Query construction analysis progress
            try {
              const progressStatus = await handle.query('getAnalysisStatus') as AnalysisStatus;
              
              // Reset query failure count on successful query
              queryFailureCount = 0;
              
              if (progressStatus && progressStatus.progress !== lastProgress) {
                // Send detailed construction progress
                if (!sendEvent('message', {
                  type: 'progress',
                  workflowId,
                  step: progressStatus.step,
                  message: progressStatus.step,
                  progress: progressStatus.progress,
                  agent: extractAgentFromStep(progressStatus.step),
                  timestamp: new Date().toISOString(),
                  error: progressStatus.error || null
                })) {
                  return; // Client disconnected during send
                }
                
                lastProgress = progressStatus.progress;
              }
            } catch {
              queryFailureCount++;
              
              // Query might fail during early workflow stages - that's normal
              if (pollCount % 60 === 0) { // Log only every minute to avoid spam
                console.log(`Query not yet available for workflow: ${workflowId} (failures: ${queryFailureCount})`);
              }
              
              // If too many query failures and workflow isn't complete, there might be an issue
              if (queryFailureCount > maxQueryFailures && currentStatus !== 'COMPLETED') {
                console.warn(`Too many query failures for workflow ${workflowId}, but continuing to monitor status`);
              }
            }

            // If workflow completed, get final result
            if (currentStatus === 'COMPLETED') {
              console.log(`✅ Workflow ${workflowId} completed, sending completion event`);
              
              try {
                const result = await handle.result();
                console.log('📊 Workflow result preview:', {
                  summary: result.summary?.substring(0, 100) + '...',
                  insightsCount: result.insights?.length || 0,
                  extractedTextLength: result.extractedText?.length || 0,
                  embeddingsLength: result.embeddings?.length || 0,
                  status: result.status
                });
                
                // Filter out embeddings and large data from UI display
                const uiResult = {
                  summary: result.summary || 'Construction document analysis completed successfully.',
                  insights: result.insights || ['Document processed', 'Analysis complete'],
                  keyTopics: result.keyTopics || [],
                  status: result.status || 'success',
                  analysisId: result.analysisId || 'unknown',
                  // Only include extracted text if it's reasonable length
                  extractedText: (result.extractedText && result.extractedText.length < 10000) 
                    ? result.extractedText 
                    : result.extractedText?.substring(0, 5000) + '\n\n... (content truncated for display)'
                };
                
                sendEvent('message', {
                  type: 'complete',
                  workflowId,
                  message: 'Analysis complete! Here are the detailed results:',
                  analysisResult: uiResult,
                  timestamp: new Date().toISOString()
                });
              } catch (error) {
                console.error('Error getting workflow result:', error);
                sendEvent('message', {
                  type: 'error',
                  workflowId,
                  message: `Failed to retrieve analysis results: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  timestamp: new Date().toISOString()
                });
              }
              
              safeCleanup();
              return;
            }
            
            if (currentStatus === 'FAILED' || currentStatus === 'TERMINATED') {
              sendEvent('message', {
                type: 'error',
                workflowId,
                message: `Analysis failed: ${currentStatus.toLowerCase()}`,
                timestamp: new Date().toISOString()
              });
              
              safeCleanup();
              return;
            }

            // Send periodic heartbeat with connection status (every 30 seconds)
            if (pollCount % 40 === 0 && pollCount > 0) {
              const elapsedMinutes = Math.floor((pollCount * 800) / 60000);
              if (!sendEvent('message', {
                type: 'progress',
                workflowId,
                step: 'heartbeat',
                message: `Analysis in progress... (${elapsedMinutes}m elapsed, Status: ${currentStatus})`,
                progress: Math.min(lastProgress + 5, 95), // Gradual progress increase
                timestamp: new Date().toISOString()
              })) {
                return; // Client disconnected during heartbeat
              }
            }

            // Stop polling after max attempts
            if (pollCount >= maxPolls) {
              sendEvent('message', {
                type: 'error',
                workflowId,
                message: 'Analysis timeout - workflow is taking longer than expected. Please check Temporal dashboard for status.',
                timestamp: new Date().toISOString()
              });
              
              safeCleanup();
            }
            
          } catch (error) {
            console.error('Error polling workflow:', error);
            sendEvent('message', {
              type: 'error',
              workflowId,
              message: `Workflow polling error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date().toISOString()
            });
            
            // For workflow not found errors, close the stream
            if (error instanceof Error && 
                (error.message.includes('workflow not found') || 
                 error.message.includes('NOT_FOUND'))) {
              console.log(`Workflow ${workflowId} not found, closing stream`);
              safeCleanup();
            }
          }
        }, 800); // Poll every 800ms for responsive UX

      } catch (error) {
        console.error('Error setting up workflow stream:', error);
        sendEvent('message', {
          type: 'error',
          workflowId,
          message: `Failed to connect to workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        });
        safeCleanup();
      }
    },
    
    // Handle client disconnection
    cancel() {
      console.log(`🔌 Client disconnected from SSE stream for workflow: ${workflowId}`);
      // This will be handled by the cleanup logic above
    }
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
