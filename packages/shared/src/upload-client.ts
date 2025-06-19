/**
 * PIP AI Upload API Client - Direct S3 Uploads Only
 * TypeScript client for direct S3 uploads using presigned URLs
 */

export interface UploadResponse {
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

/**
 * Direct S3 upload using presigned URLs - bypasses Vercel 4.5MB limit
 * This is the recommended method for all file uploads
 */
export async function uploadFileDirect(
  file: File,
  userId: string = 'demo-user',
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  try {
    console.log(`🚀 Starting direct S3 upload for: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
    
    // Step 1: Get presigned URL
    onProgress?.(5);
    const presignedResponse = await fetch('/api/upload/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        userId
      })
    });

    if (!presignedResponse.ok) {
      const error = await presignedResponse.json();
      throw new Error(error.error || 'Failed to get upload URL');
    }

    const { presignedUrl, fileUrl, s3Key, fileId } = await presignedResponse.json();
    
    // Step 2: Upload directly to S3
    onProgress?.(10);
    console.log(`📤 Uploading directly to S3...`);
    
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!uploadResponse.ok) {
      throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    onProgress?.(70);
    console.log(`✅ Direct S3 upload successful`);

    // Step 3: Notify API that upload is complete
    onProgress?.(80);
    console.log(`🔔 Notifying API of upload completion...`);
    
    const completeResponse = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileUrl,
        fileName: file.name,
        s3Key,
        fileId,
        userId,
        fileSize: file.size
      })
    });

    if (!completeResponse.ok) {
      const error = await completeResponse.json();
      throw new Error(error.error || 'Failed to complete upload');
    }

    const result = await completeResponse.json();
    onProgress?.(100);
    
    console.log(`🎉 Direct upload complete: ${file.name} → Workflow ${result.workflow_id}`);
    
    return {
      file_id: result.file_id,
      filename: result.filename,
      s3_key: result.s3_key,
      size: file.size,
      content_type: file.type,
      workflow_id: result.workflow_id,
      upload_url: result.file_url,
      status: result.status,
      created_at: result.created_at
    };
    
  } catch (error) {
    console.error('❌ Direct upload failed:', error);
    throw error;
  }
}

/**
 * Default export for convenience
 */
export default uploadFileDirect;
