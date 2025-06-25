/**
 * PIP AI Upload API Client
 * TypeScript client for the Edge Upload API
 */

export interface UploadOptions {
  userId?: string;
  extractImages?: boolean;
  generateSummary?: boolean;
  detectLanguage?: boolean;
  analysisType?: 'auto' | 'document' | 'code' | 'data' | 'image';
}

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

export interface WorkflowStatus {
  workflow_id: string;
  status: {
    step: string;
    progress: number;
    error?: string;
    result?: any;
    canceled?: boolean;
    workflow_status?: string;
  };
  timestamp: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded';
  services: {
    api: string;
    s3: string;
    temporal: string;
  };
  timestamp: string;
}

export class PipAIUploadClient {
  private baseUrl: string;
  private defaultOptions: UploadOptions;

  constructor(baseUrl: string, defaultOptions: UploadOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultOptions = {
      userId: 'default-user',
      extractImages: true,
      generateSummary: true,
      detectLanguage: true,
      analysisType: 'auto',
      ...defaultOptions,
    };
  }

  /**
   * Check API health
   */
  async health(): Promise<HealthStatus> {
    const response = await fetch(`${this.baseUrl}/upload`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Upload file and start analysis workflow
   */
  async upload(file: File, options: UploadOptions = {}): Promise<UploadResponse> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    const formData = new FormData();
    formData.append('file', file);
    
    if (mergedOptions.userId) {
      formData.append('user_id', mergedOptions.userId);
    }
    if (mergedOptions.extractImages !== undefined) {
      formData.append('extract_images', mergedOptions.extractImages.toString());
    }
    if (mergedOptions.generateSummary !== undefined) {
      formData.append('generate_summary', mergedOptions.generateSummary.toString());
    }
    if (mergedOptions.detectLanguage !== undefined) {
      formData.append('detect_language', mergedOptions.detectLanguage.toString());
    }
    if (mergedOptions.analysisType) {
      formData.append('analysis_type', mergedOptions.analysisType);
    }

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Upload failed: ${error.detail || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    const response = await fetch(`${this.baseUrl}/workflow/${workflowId}/status`);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to get workflow status: ${error.detail || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Cancel workflow
   */
  async cancelWorkflow(workflowId: string): Promise<{ workflow_id: string; status: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/workflow/${workflowId}/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to cancel workflow: ${error.detail || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Poll workflow status until completion
   */
  async waitForCompletion(
    workflowId: string,
    options: {
      pollInterval?: number;
      timeout?: number;
      onProgress?: (status: WorkflowStatus) => void;
    } = {}
  ): Promise<WorkflowStatus> {
    const { pollInterval = 2000, timeout = 300000, onProgress } = options; // 5 minute timeout
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.getWorkflowStatus(workflowId);
        
        if (onProgress) {
          onProgress(status);
        }

        // Check if completed (workflow status indicates completion)
        if (
          status.status.progress >= 100 ||
          status.status.error ||
          status.status.canceled ||
          status.status.workflow_status === 'COMPLETED' ||
          status.status.workflow_status === 'FAILED' ||
          status.status.workflow_status === 'CANCELED'
        ) {
          return status;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        // If workflow not found, it might have completed and been cleaned up
        if (error instanceof Error && error.message.includes('not found')) {
          throw new Error('Workflow completed or was cleaned up');
        }
        throw error;
      }
    }

    throw new Error(`Workflow ${workflowId} timed out after ${timeout}ms`);
  }

  /**
   * Upload file and wait for analysis completion
   */
  async uploadAndWait(
    file: File,
    uploadOptions: UploadOptions = {},
    waitOptions: Parameters<typeof this.waitForCompletion>[1] = {}
  ): Promise<{ upload: UploadResponse; result: WorkflowStatus }> {
    const upload = await this.upload(file, uploadOptions);
    const result = await this.waitForCompletion(upload.workflow_id, waitOptions);
    
    return { upload, result };
  }
}

/**
 * Create a new PipAI Upload Client instance
 */
export function createPipAIClient(baseUrl: string, defaultOptions?: UploadOptions): PipAIUploadClient {
  return new PipAIUploadClient(baseUrl, defaultOptions);
}

/**
 * Default export for convenience
 */
export default PipAIUploadClient;

/**
 * Direct S3 upload using presigned URLs - bypasses Vercel 4.5MB limit
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
    const presignedResponse = await fetch('/api/upload/presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        userId
      })
    });

    if (!presignedResponse.ok) {
      const error = await presignedResponse.json();
      throw new Error(error.error || 'Failed to get upload URL');
    }

    const { uploadUrl, s3Key, fileId } = await presignedResponse.json();
    
    // Step 2: Upload directly to S3
    onProgress?.(10);
    console.log(`📤 Uploading directly to S3...`);
    
    const uploadResponse = await fetch(uploadUrl, {
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
        s3Key,
        fileName: file.name,
        userId,
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
