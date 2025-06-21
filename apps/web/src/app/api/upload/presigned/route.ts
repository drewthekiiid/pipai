/**
 * Presigned URL API - Generate secure URLs for direct S3 uploads
 * This bypasses Vercel's 4.5MB body size limit by allowing direct uploads to S3
 */

// Configure route as dynamic for API functionality
export const dynamic = 'force-dynamic';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Environment configuration
const config = {
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.AWS_S3_BUCKET_NAME || '',
  },
};

// Initialize S3 client
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

// Types
interface PresignedUrlRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
  userId?: string;
}

interface PresignedUrlResponse {
  uploadUrl: string;
  s3Key: string;
  fileId: string;
  fileName: string;
  expiresIn: number;
}

// Helper functions
function generateS3Key(userId: string, filename: string): string {
  const fileId = uuidv4();
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '/');
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `uploads/${userId}/${timestamp}/${fileId}_${safeFilename}`;
}

// Generate presigned URL for S3 upload
export async function POST(request: NextRequest) {
  try {
    const body: PresignedUrlRequest = await request.json();
    const { fileName, fileSize, contentType, userId = 'demo-user' } = body;

    // Validate input
    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    if (!fileSize || fileSize <= 0) {
      return NextResponse.json({ error: 'Valid fileSize is required' }, { status: 400 });
    }

    if (!contentType) {
      return NextResponse.json({ error: 'contentType is required' }, { status: 400 });
    }

    // Validate file size (100MB limit - our application limit)
    if (fileSize > 100 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 100MB.' 
      }, { status: 400 });
    }

    if (!config.aws.bucketName) {
      return NextResponse.json({ error: 'AWS S3 bucket not configured' }, { status: 500 });
    }

    console.log(`🔗 Generating presigned URL for: ${fileName} (${fileSize} bytes)`);

    // Generate S3 key and file ID
    const s3Key = generateS3Key(userId, fileName);
    const fileId = s3Key.split('/').pop()?.split('_')[0] || uuidv4();

    // Create presigned URL for PUT operation
    const putObjectCommand = new PutObjectCommand({
      Bucket: config.aws.bucketName,
      Key: s3Key,
      ContentType: contentType,
      ContentLength: fileSize,
      Metadata: {
        originalName: fileName,
        userId: userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate presigned URL (expires in 10 minutes)
    const expiresIn = 10 * 60; // 10 minutes
    const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn,
    });

    const response: PresignedUrlResponse = {
      uploadUrl,
      s3Key,
      fileId,
      fileName,
      expiresIn,
    };

    console.log(`✅ Presigned URL generated for ${fileName} → ${fileId}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Failed to generate presigned URL:', error);
    return NextResponse.json(
      {
        error: `Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}    