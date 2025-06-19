/**
 * PIP AI Unified Upload API - TypeScript/Next.js Version
 * Complete construction document analysis with EstimAItor
 * Handles file uploads to S3 and triggers Temporal workflows for analysis
 */

import { HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Connection, Client as TemporalClient } from '@temporalio/client';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Environment configuration with validation
const config = {
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.AWS_S3_BUCKET_NAME || '',
  },
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

// Validate required environment variables (only in runtime, not during build)
const requiredEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY', 
  'AWS_S3_BUCKET_NAME',
  'TEMPORAL_API_KEY'
];

// Only validate in non-build environments
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV) {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`⚠️  Environment variable ${envVar} is not set`);
    }
  }
}

// Initialize clients
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

const redis = config.redis.url && config.redis.token ? new Redis({
  url: config.redis.url,
  token: config.redis.token,
}) : null;

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
      connectionOptions.tls = {};
      connectionOptions.apiKey = config.temporal.apiKey;
      console.log('   Using Temporal Cloud with TLS and API key');
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
interface UploadResponse {
  file_id: string;
  filename: string;
  s3_key: string;
  size: number;
  content_type: string;
  workflow_id: string;
  upload_url: string;
  status: string;
  created_at: string;
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

// Helper functions
function generateS3Key(userId: string, filename: string): string {
  const fileId = uuidv4();
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '/');
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `uploads/${userId}/${timestamp}/${fileId}_${safeFilename}`;
}

async function uploadToS3(file: File, key: string): Promise<string> {
  if (!config.aws.bucketName) {
    throw new Error('AWS S3 bucket name is not configured');
  }

  console.log('🪣 Uploading to S3:', { bucket: config.aws.bucketName, key });

  const buffer = Buffer.from(await file.arrayBuffer());
  
  const uploadCommand = new PutObjectCommand({
    Bucket: config.aws.bucketName,
    Key: key,
    Body: buffer,
    ContentType: file.type,
    Metadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  await s3Client.send(uploadCommand);
  
  const fileUrl = `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
  console.log('✅ S3 upload successful:', fileUrl);
  return fileUrl;
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

// Health check endpoint
export async function GET() {
  const healthStatus = {
    api: "healthy",
    s3: "unknown",
    temporal: "unknown",
    redis: "unknown"
  };

  // Test S3 connection
  try {
    if (config.aws.bucketName) {
      await s3Client.send(new HeadBucketCommand({ Bucket: config.aws.bucketName }));
      healthStatus.s3 = "healthy";
    } else {
      healthStatus.s3 = "not_configured";
    }
  } catch (error) {
    healthStatus.s3 = `unhealthy: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // Test Temporal connection  
  try {
    if (temporalClient) {
      healthStatus.temporal = "healthy";
    } else {
      healthStatus.temporal = "not_connected";
    }
  } catch (error) {
    healthStatus.temporal = `unhealthy: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // Test Redis connection
  try {
    if (redis) {
      await redis.ping();
      healthStatus.redis = "healthy";
    } else {
      healthStatus.redis = "not_configured";
    }
  } catch (error) {
    healthStatus.redis = `unhealthy: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  const overallHealthy = Object.values(healthStatus).every(status => 
    status === "healthy" || status === "not_configured"
  );

  return NextResponse.json({
    message: "PIP AI Unified API",
    version: "2.0.0", 
    status: overallHealthy ? "healthy" : "degraded",
    services: healthStatus,
    timestamp: new Date().toISOString(),
  });
}

// Upload endpoint
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string || 'demo-user';
    // Analysis type is handled in workflow configuration

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 100MB.' 
      }, { status: 400 });
    }

    if (!file.name) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    console.log(`📤 Processing upload: ${file.name} (${file.size} bytes)`);

    // Generate S3 key and upload
    const s3Key = generateS3Key(userId, file.name);
    const fileId = s3Key.split('/').pop()?.split('_')[0] || uuidv4();
    
    console.log(`🔄 Uploading to S3...`);
    const fileUrl = await uploadToS3(file, s3Key);

    // Store progress in Redis if available
    if (redis) {
      await redis.hset(`workflow:upload:${fileId}`, {
        userId,
        fileName: file.name,
        fileUrl,
        s3Key,
        status: 'uploaded',
        createdAt: new Date().toISOString(),
      });
    }

    console.log(`🚀 Starting EstimAItor analysis workflow...`);
    const workflowId = await startAnalysisWorkflow(fileUrl, file.name, userId, s3Key);

    // Store workflow info in Redis if available
    if (redis) {
      await redis.hset(`workflow:${workflowId}`, {
        userId,
        fileName: file.name,
        fileUrl,
        s3Key,
        status: 'started',
        createdAt: new Date().toISOString(),
      });
    }

    const response: UploadResponse = {
      file_id: fileId,
      filename: file.name,
      s3_key: s3Key,
      size: file.size,
      content_type: file.type,
      workflow_id: workflowId,
      upload_url: fileUrl,
      status: "uploaded",
      created_at: new Date().toISOString(),
    };

    console.log(`✅ Upload successful: ${file.name} → Workflow ${workflowId}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Upload failed:', error);
    return NextResponse.json(
      { 
        error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
