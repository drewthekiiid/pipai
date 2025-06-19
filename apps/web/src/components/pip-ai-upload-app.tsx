"use client";

import { UploadDock } from "@pip-ai/ui";
import React, { useCallback, useState } from "react";
import { ProgressIndicator } from "./progress-indicator";
import { ResultsDisplay } from "./results-display";
import { useWorkflowStream } from "./use-workflow-stream";

interface AnalysisResult {
  analysisId: string;
  status: 'success' | 'failed' | 'canceled';
  extractedText?: string;
  summary?: string;
  insights?: string[];
  embeddings?: number[];
  metadata?: Record<string, unknown>;
  error?: string;
}

interface UploadResponse {
  success: boolean;
  workflowId: string;
  fileUrl: string;
  message: string;
  error?: string;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export function PipAIUploadApp() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Stream workflow progress
  const { events, isConnected, lastEvent } = useWorkflowStream(workflowId);

  const uploadFile = useCallback(async (file: File) => {
    setUploadState('uploading');
    setError(null);
    setUploadProgress(0);
    setSelectedFile(file);

    try {
      console.log(`🚀 Starting direct S3 upload for: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
      
      // Step 1: Get presigned URL
      setUploadProgress(5);
      const presignedResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          userId: 'demo-user'
        })
      });

      if (!presignedResponse.ok) {
        const error = await presignedResponse.json();
        throw new Error(error.error || 'Failed to get upload URL');
      }

      const { presignedUrl, fileUrl, s3Key, fileId } = await presignedResponse.json();
      
      // Step 2: Upload directly to S3
      setUploadProgress(10);
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

      setUploadProgress(70);
      console.log(`✅ Direct S3 upload successful`);

      // Step 3: Notify API that upload is complete
      setUploadProgress(80);
      console.log(`🔔 Notifying API of upload completion...`);
      
      const completeResponse = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl,
          fileName: file.name,
          s3Key,
          fileId,
          userId: 'demo-user',
          fileSize: file.size
        })
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(error.error || 'Failed to complete upload');
      }

      const data = await completeResponse.json();
      setUploadProgress(100);
      
      console.log(`🎉 Direct upload complete: ${file.name} → Workflow ${data.workflow_id}`);
      setWorkflowId(data.workflow_id);
      setUploadState('processing');

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadState('error');
    }
  }, []);

  const handleFileSelect = useCallback((files: FileList) => {
    const file = files[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleReset = useCallback(() => {
    setUploadState('idle');
    setWorkflowId(null);
    setUploadProgress(0);
    setError(null);
    setResult(null);
    setSelectedFile(null);
  }, []);

  // Handle workflow events
  React.useEffect(() => {
    if (!lastEvent) return;

    console.log('Workflow event:', lastEvent);

    switch (lastEvent.type) {
      case 'completed':
        if (lastEvent.data.result) {
          setResult(lastEvent.data.result as AnalysisResult);
        }
        setUploadState('completed');
        break;
      case 'failed':
        const errorMessage = typeof lastEvent.data.error === 'string' 
          ? lastEvent.data.error 
          : 'Workflow failed';
        setError(errorMessage);
        setUploadState('error');
        break;
    }
  }, [lastEvent]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            PIP AI Document Analysis
          </h1>
          <p className="text-lg text-slate-600">
            Upload documents for intelligent analysis and insights
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Upload Section */}
          {uploadState === 'idle' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <UploadDock
                onFileSelect={handleFileSelect}
                className="min-h-[200px]"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx"
              />
            </div>
          )}

          {/* Progress Section */}
          {(uploadState === 'uploading' || uploadState === 'processing') && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <ProgressIndicator
                state={uploadState}
                progress={uploadProgress}
                file={selectedFile}
                workflowId={workflowId}
                events={events}
                isConnected={isConnected}
                onReset={handleReset}
              />
            </div>
          )}

          {/* Results Section */}
          {uploadState === 'completed' && result && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <ResultsDisplay
                result={result}
                file={selectedFile}
                onReset={handleReset}
              />
            </div>
          )}

          {/* Error Section */}
          {uploadState === 'error' && (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">Upload Failed</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <button
                  onClick={handleReset}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          {isConnected && workflowId && (
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Connected to workflow {workflowId}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
