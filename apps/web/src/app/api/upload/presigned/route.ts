/**
 * Presigned URL API for Direct S3 Uploads
 * Bypasses Vercel function payload limits by allowing direct browser-to-S3 uploads
 */

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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

// Helper function to generate S3 key
function generateS3Key(userId: string, filename: string): string {
  const fileId = uuidv4();
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '/');
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `uploads/${userId}/${timestamp}/${fileId}_${safeFilename}`;
}

// Types
interface PresignedUrlRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
  userId?: string;
}

interface PresignedUrlResponse {
  uploadUrl: string;
  downloadUrl: string;
  s3Key: string;
  fileId: string;
  expiresIn: number;
}

// Generate presigned URL for upload
export async function POST(request: NextRequest) {
  try {
    const body: PresignedUrlRequest = await request.json();
    const { fileName, fileSize, contentType, userId = 'demo-user' } = body;

    // Validate input
    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    if (!fileSize || fileSize <= 0) {
      return NextResponse.json({ error: 'fileSize must be greater than 0' }, { status: 400 });
    }

    // File size limit (500MB for presigned uploads)
    if (fileSize > 500 * 1024 * 1024) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 500MB for direct uploads.'
      }, { status: 400 });
    }

    if (!config.aws.bucketName) {
      return NextResponse.json({ error: 'AWS S3 bucket not configured' }, { status: 500 });
    }

    // Generate S3 key
    const s3Key = generateS3Key(userId, fileName);
    const fileId = s3Key.split('/').pop()?.split('_')[0] || uuidv4();

    console.log(`🔗 Generating presigned URL for: ${fileName} (${fileSize} bytes)`);

    // Create presigned URL for upload (expires in 1 hour)
    const putCommand = new PutObjectCommand({
      Bucket: config.aws.bucketName,
      Key: s3Key,
      ContentType: contentType,
      Metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
        userId,
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 });

    // Create presigned URL for download (expires in 24 hours)
    const getCommand = new GetObjectCommand({
      Bucket: config.aws.bucketName,
      Key: s3Key,
    });

    const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 86400 });

    const response: PresignedUrlResponse = {
      uploadUrl,
      downloadUrl,
      s3Key,
      fileId,
      expiresIn: 3600, // 1 hour
    };

    console.log(`✅ Presigned URL generated for: ${fileName}`);
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