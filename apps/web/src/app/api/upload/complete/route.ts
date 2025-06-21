/**
 * Complete Upload API - Triggers workflow after presigned upload
 * Call this endpoint after successfully uploading via presigned URL
 */

import { Connection, Client as TemporalClient } from '@temporalio/client';
import { NextRequest, NextResponse } from 'next/server';

// Environment configuration
const config = {
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'us-east-1.aws.api.temporal.io:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'pip-ai.ts7wf',
    apiKey: process.env.TEMPORAL_API_KEY || '',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'pip-ai-task-queue',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.AWS_S3_BUCKET_NAME || '',
  },
};

let temporalClient: TemporalClient | null = null;

// Initialize Temporal client
async function getTemporalClient(): Promise<TemporalClient> {
  if (!temporalClient) {
    console.log('🔗 Creating Temporal client...');

    const connectionOptions: Record<string, unknown> = {
      address: config.temporal.address,
    };

    // Only add TLS and API key for Temporal Cloud
    if (config.temporal.address.includes('temporal.io')) {
      connectionOptions.tls = true;
      connectionOptions.apiKey = config.temporal.apiKey;
      console.log('   Using Temporal Cloud with TLS and API key authentication');
    } else {
      console.log('   Using local Temporal server');
    }

    temporalClient = new TemporalClient({
      connection: await Connection.connect(connectionOptions),
      namespace: config.temporal.namespace,
    });

    console.log('✅ Temporal client created successfully');
  }
  return temporalClient;
}

// Types
interface CompleteUploadRequest {
  s3Key: string;
  fileName: string;
  userId?: string;
  fileSize?: number;
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
    await client.workflow.start('analyzeDocumentWorkflow', {
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

// Complete upload and trigger workflow
export async function POST(request: NextRequest) {
  try {
    const body: CompleteUploadRequest = await request.json();
    const { s3Key, fileName, userId = 'demo-user', fileSize } = body;

    // Validate input
    if (!s3Key) {
      return NextResponse.json({ error: 's3Key is required' }, { status: 400 });
    }

    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    if (!config.aws.bucketName) {
      return NextResponse.json({ error: 'AWS S3 bucket not configured' }, { status: 500 });
    }

    console.log(`🎯 Completing upload for: ${fileName} (S3 Key: ${s3Key})`);

    // Construct file URL
    const fileUrl = `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;

    // Start analysis workflow
    console.log(`🚀 Starting EstimAItor analysis workflow...`);
    const workflowId = await startAnalysisWorkflow(fileUrl, fileName, userId, s3Key);

    const response = {
      success: true,
      workflow_id: workflowId,
      file_url: fileUrl,
      s3_key: s3Key,
      status: 'workflow_started',
      created_at: new Date().toISOString(),
    };

    console.log(`✅ Upload completed: ${fileName} → Workflow ${workflowId}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Failed to complete upload:', error);
    return NextResponse.json(
      {
        error: `Failed to complete upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 