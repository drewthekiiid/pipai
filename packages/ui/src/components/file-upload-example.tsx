/**
 * Example React component showing how to use the PIP AI Upload API
 */

'use client';

import { uploadFileDirect, type UploadResponse } from '@pip-ai/shared';
import React, { useCallback, useState } from 'react';

interface UploadProgress {
  upload?: UploadResponse;
  progress: number;
  step: string;
  status?: any;
  error?: string;
}

export function FileUploadExample() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress({
      progress: 0,
      step: 'Starting upload...',
    });

    try {
      // Upload file directly to S3 using presigned URLs
      const upload = await uploadFileDirect(file, 'demo-user', (progress) => {
        setUploadProgress(prev => ({
          ...prev!,
          progress,
          step: progress < 10 ? 'Getting upload URL...' : 
                progress < 70 ? 'Uploading to S3...' : 
                progress < 100 ? 'Completing upload...' : 'Upload complete!',
        }));
      });

      setUploadProgress(prev => ({
        ...prev!,
        upload,
        progress: 100,
        step: 'Upload completed successfully!',
      }));

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress(prev => ({
        ...prev!,
        progress: 0,
        step: 'Upload failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleCancel = useCallback(async () => {
    // For direct uploads, we can't cancel S3 uploads once started
    // This would need to be implemented via workflow cancellation if needed
    setUploadProgress(prev => ({
      ...prev!,
      step: 'Upload cancelled',
      error: 'Cancelled by user',
    }));
    setIsUploading(false);
  }, []);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4">Upload Document for Analysis</h2>
      
      {/* File Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select File
        </label>
        <input
          type="file"
          onChange={handleFileUpload}
          disabled={isUploading}
          accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.csv,.json"
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
      </div>

      {/* Progress Display */}
      {uploadProgress && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {uploadProgress.step}
            </span>
            {isUploading && (
              <button
                onClick={handleCancel}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Cancel
              </button>
            )}
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                uploadProgress.error ? 'bg-red-500' : 'bg-blue-600'
              }`}
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>
          
          <div className="text-xs text-gray-500 mt-1">
            {uploadProgress.progress}% complete
          </div>
        </div>
      )}

      {/* Error Display */}
      {uploadProgress?.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-800">
            <strong>Error:</strong> {uploadProgress.error}
          </div>
        </div>
      )}

      {/* Results Display */}
      {uploadProgress?.status?.status.result && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="text-sm text-green-800">
            <strong>Analysis Complete!</strong>
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(uploadProgress.status.status.result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* File Info */}
      {uploadProgress?.upload && (
        <div className="text-xs text-gray-500 space-y-1">
          <div><strong>File:</strong> {uploadProgress.upload.filename}</div>
          <div><strong>Size:</strong> {(uploadProgress.upload.size / 1024).toFixed(1)} KB</div>
          <div><strong>Workflow ID:</strong> {uploadProgress.upload.workflow_id}</div>
        </div>
      )}
    </div>
  );
}

export default FileUploadExample;
