import { Connection, Client as TemporalClient } from '@temporalio/client';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// Configure API route
export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute for workflow initiation
export const dynamic = 'force-dynamic';

const config = {
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'us-east-1.aws.api.temporal.io:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'pip-ai.ts7wf',
    apiKey: process.env.TEMPORAL_API_KEY || '',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'pip-ai-task-queue',
  },
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  },
};

const redis = config.redis.url && config.redis.token ? new Redis({
  url: config.redis.url,
  token: config.redis.token,
}) : null;

let temporalClient: TemporalClient | null = null;

// Initialize Temporal client
async function getTemporalClient(): Promise<TemporalClient> {
  if (!temporalClient) {
    console.log('🔗 Creating Temporal client...');

    const connectionOptions: any = {
      address: config.temporal.address,
    };

    // Only add TLS and API key for Temporal Cloud
    if (config.temporal.address.includes('temporal.io')) {
      connectionOptions.tls = {};
      connectionOptions.apiKey = config.temporal.apiKey;
    }

    temporalClient = new TemporalClient({
      connection: await Connection.connect(connectionOptions),
      namespace: config.temporal.namespace,
    });

    console.log('✅ Temporal client created successfully');
  }
  return temporalClient;
}

interface AnalysisInput {
  fileUrl: string;
  userId: string;
  fileName: string;
  s3Key: string;
  analysisType: 'document' | 'code' | 'data' | 'image';
  options?: {
    extractImages?: boolean;
    generateSummary?: boolean;
    detectLanguage?: boolean;
  };
}

async function startAnalysisWorkflow(fileUrl: string, fileName: string, userId: string, s3Key: string): Promise<string> {
  const client = await getTemporalClient();
  const workflowId = `analyze-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const analysisInput: AnalysisInput = {
    fileUrl,
    userId,
    fileName,
    s3Key,
    analysisType: 'document', // Default to document for construction analysis
    options: {
      extractImages: false,
      generateSummary: true,
      detectLanguage: true,
    },
  };

  try {
    const handle = await client.workflow.start('analyzeDocumentWorkflow', {
      args: [analysisInput],
      taskQueue: config.temporal.taskQueue,
      workflowId,
    });

    console.log(`✅ Started workflow ${workflowId} for file ${fileName}`);
    return workflowId;
  } catch (error) {
    console.error('❌ Failed to start workflow:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, fileName, s3Key, fileId, userId = 'demo-user', fileSize } = await request.json();

    if (!fileUrl || !fileName || !s3Key) {
      return NextResponse.json({ 
        error: 'fileUrl, fileName, and s3Key are required' 
      }, { status: 400 });
    }

    console.log(`📤 Processing upload completion: ${fileName} → ${fileUrl}`);

    // Store upload info in Redis if available
    if (redis) {
      await redis.hset(`workflow:upload:${fileId}`, {
        userId,
        fileName,
        fileUrl,
        s3Key,
        fileSize: fileSize || 0,
        status: 'uploaded',
        createdAt: new Date().toISOString(),
      });
    }

    console.log(`🚀 Starting EstimAItor analysis workflow for: ${fileName}`);
    const workflowId = await startAnalysisWorkflow(fileUrl, fileName, userId, s3Key);

    // Store workflow info in Redis if available
    if (redis) {
      await redis.hset(`workflow:${workflowId}`, {
        userId,
        fileName,
        fileUrl,
        s3Key,
        fileSize: fileSize || 0,
        status: 'started',
        createdAt: new Date().toISOString(),
      });
    }

    const response = {
      success: true,
      file_id: fileId,
      filename: fileName,
      s3_key: s3Key,
      file_url: fileUrl,
      workflow_id: workflowId,
      status: "analyzing",
      created_at: new Date().toISOString(),
      message: `Successfully started analysis workflow for ${fileName}`
    };

    console.log(`✅ Upload completion processed: ${fileName} → Workflow ${workflowId}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Upload completion failed:', error);
    
    return NextResponse.json({
      error: `Failed to process upload completion: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 