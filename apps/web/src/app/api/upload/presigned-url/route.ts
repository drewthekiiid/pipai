import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Configure API route
export const runtime = 'nodejs';
export const maxDuration = 30; // Quick presigned URL generation
export const maxRequestSize = '10mb'; // Only handling metadata, not files

const config = {
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.AWS_S3_BUCKET_NAME || '',
  },
};

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

function generateS3Key(userId: string, filename: string): string {
  const fileId = uuidv4();
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '/');
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `uploads/${userId}/${timestamp}/${fileId}_${safeFilename}`;
}

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, fileSize, userId = 'demo-user' } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ 
        error: 'fileName and fileType are required' 
      }, { status: 400 });
    }

    // Validate file size (allow up to 500MB for direct S3 uploads)
    const maxFileSize = 500 * 1024 * 1024; // 500MB
    if (fileSize && fileSize > maxFileSize) {
      return NextResponse.json({ 
        error: `File "${fileName}" is too large (${Math.round(fileSize / 1024 / 1024)}MB). Maximum size is 500MB.`,
        hint: 'For files larger than 500MB, please compress or split them.'
      }, { status: 413 });
    }

    if (!config.aws.bucketName) {
      return NextResponse.json({ 
        error: 'AWS S3 bucket not configured' 
      }, { status: 500 });
    }

    console.log(`🔗 Generating presigned URL for: ${fileName} (${Math.round(fileSize / 1024 / 1024)}MB)`);

    // Generate S3 key
    const s3Key = generateS3Key(userId, fileName);
    const fileId = s3Key.split('/').pop()?.split('_')[0] || uuidv4();

    // Create presigned URL for PUT operation
    const putCommand = new PutObjectCommand({
      Bucket: config.aws.bucketName,
      Key: s3Key,
      ContentType: fileType,
      Metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
        userId: userId,
      },
    });

    // Generate presigned URL valid for 10 minutes
    const presignedUrl = await getSignedUrl(s3Client, putCommand, { 
      expiresIn: 600 // 10 minutes
    });

    const fileUrl = `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${s3Key}`;

    console.log(`✅ Presigned URL generated for: ${fileName}`);

    return NextResponse.json({
      presignedUrl,
      fileUrl,
      s3Key,
      fileId,
      expiresIn: 600,
      instructions: {
        method: 'PUT',
        headers: {
          'Content-Type': fileType
        }
      }
    });

  } catch (error) {
    console.error('❌ Presigned URL generation failed:', error);
    return NextResponse.json({
      error: `Failed to generate upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
} 