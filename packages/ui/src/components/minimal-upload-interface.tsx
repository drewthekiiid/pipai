/**
 * Minimal Upload Interface Component
 * Clean, futuristic interface for file upload and link input
 * Following CDO Group branding guidelines
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { designTokens } from '../design-tokens';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface MinimalUploadInterfaceProps {
  onFileUpload?: (files: File[]) => void;
  onLinkSubmit?: (link: string) => void;
  className?: string;
}

export function MinimalUploadInterface({
  onFileUpload,
  onLinkSubmit,
  className = '',
}: MinimalUploadInterfaceProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newFiles: UploadedFile[] = fileArray.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    onFileUpload?.(fileArray);
  }, [onFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles);
    }
  }, [handleFileUpload]);

  const handleLinkSubmit = useCallback(() => {
    if (linkInput.trim()) {
      onLinkSubmit?.(linkInput.trim());
      setLinkInput('');
    }
  }, [linkInput, onLinkSubmit]);

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div 
      className={`min-h-screen flex flex-col items-center justify-center p-8 ${className}`}
      style={{
        backgroundColor: designTokens.colors.neutral[900],
        fontFamily: designTokens.typography.fontFamily.sans.join(', '),
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="text-center mb-12">
        {/* CDO Logo */}
        <div className="flex justify-center mb-6">
          <svg 
            width="120" 
            height="48" 
            viewBox="0 0 100 40" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <g fill="#EF2323">
              <path d="M12 8.5C9.5 8.5 7.5 10.5 7.5 13V17C7.5 19.5 9.5 21.5 12 21.5H15V18.5H12C11.2 18.5 10.5 17.8 10.5 17V13C10.5 12.2 11.2 11.5 12 11.5H15V8.5H12Z"/>
              <path d="M18 8.5V21.5H24C26.5 21.5 28.5 19.5 28.5 17V13C28.5 10.5 26.5 8.5 24 8.5H18ZM21 11.5H24C24.8 11.5 25.5 12.2 25.5 13V17C25.5 17.8 24.8 18.5 24 18.5H21V11.5Z"/>
              <path d="M31.5 13V17C31.5 19.5 33.5 21.5 36 21.5H39C41.5 21.5 43.5 19.5 43.5 17V13C43.5 10.5 41.5 8.5 39 8.5H36C33.5 8.5 31.5 10.5 31.5 13ZM34.5 13C34.5 12.2 35.2 11.5 36 11.5H39C39.8 11.5 40.5 12.2 40.5 13V17C40.5 17.8 39.8 18.5 39 18.5H36C35.2 18.5 34.5 17.8 34.5 17V13Z"/>
            </g>
            <text x="48" y="28" fill="#C0C0C0" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">GROUP</text>
          </svg>
        </div>
        
        <h1 
          className="text-4xl font-bold mb-4"
          style={{ 
            color: designTokens.colors.neutral[0],
            fontFamily: 'Space Grotesk, ' + designTokens.typography.fontFamily.sans.join(', '),
          }}
        >
          PIP AI Document Analysis
        </h1>
        <p 
          className="text-xl"
          style={{ color: designTokens.colors.silver[500] }}
        >
          Upload files or paste links to get started
        </p>
      </div>

      {/* Main Upload Area */}
      <div className="w-full max-w-2xl space-y-8">
        {/* File Upload Zone */}
        <div
          className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer hover:scale-[1.02] ${
            isDragOver ? 'scale-[1.02]' : ''
          }`}
          style={{
            borderColor: isDragOver 
              ? designTokens.colors.primary[500] 
              : `${designTokens.colors.silver[500]}40`,
            backgroundColor: isDragOver 
              ? `${designTokens.colors.primary[500]}10` 
              : `${designTokens.colors.neutral[800]}40`,
            backdropFilter: 'blur(10px)',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16"
              style={{ 
                color: isDragOver 
                  ? designTokens.colors.primary[500] 
                  : designTokens.colors.silver[500] 
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          
          <h3 
            className="text-2xl font-bold mb-2"
            style={{ 
              color: isDragOver 
                ? designTokens.colors.primary[500] 
                : designTokens.colors.neutral[0] 
            }}
          >
            Drop files here
          </h3>
          <p 
            className="text-lg mb-4"
            style={{ color: designTokens.colors.silver[500] }}
          >
            or click to browse
          </p>
          <p 
            className="text-sm"
            style={{ color: designTokens.colors.silver[600] }}
          >
            PDF, images, and text files supported
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.txt"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileUpload(e.target.files);
              }
            }}
          />
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 rounded-2xl backdrop-blur-sm"
                style={{
                  backgroundColor: `${designTokens.colors.neutral[800]}60`,
                  border: `1px solid ${designTokens.colors.silver[500]}20`,
                }}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{
                      backgroundColor: designTokens.colors.primary[500],
                      color: designTokens.colors.neutral[0],
                    }}
                  >
                    {file.name.split('.').pop()?.toUpperCase().slice(0, 3) || 'FILE'}
                  </div>
                  <div>
                    <p 
                      className="font-medium"
                      style={{ color: designTokens.colors.neutral[0] }}
                    >
                      {file.name}
                    </p>
                    <p 
                      className="text-sm"
                      style={{ color: designTokens.colors.silver[500] }}
                    >
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-2 rounded-xl hover:scale-110 transition-transform"
                  style={{ 
                    color: designTokens.colors.silver[500],
                    backgroundColor: `${designTokens.colors.silver[500]}10`,
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center">
          <div 
            className="flex-1 h-px"
            style={{ backgroundColor: `${designTokens.colors.silver[500]}20` }}
          />
          <span 
            className="px-4 text-sm font-medium"
            style={{ color: designTokens.colors.silver[500] }}
          >
            OR
          </span>
          <div 
            className="flex-1 h-px"
            style={{ backgroundColor: `${designTokens.colors.silver[500]}20` }}
          />
        </div>

        {/* Link Input */}
        <div className="space-y-4">
          <div 
            className="flex rounded-2xl p-2 backdrop-blur-sm"
            style={{
              backgroundColor: `${designTokens.colors.neutral[800]}60`,
              border: `2px solid ${designTokens.colors.silver[500]}20`,
            }}
          >
            <input
              type="url"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="Paste a link here..."
              className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-white placeholder-gray-400"
              style={{
                fontFamily: 'Manrope, ' + designTokens.typography.fontFamily.sans.join(', '),
                fontSize: designTokens.typography.fontSize.lg,
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLinkSubmit();
                }
              }}
            />
            <button
              onClick={handleLinkSubmit}
              disabled={!linkInput.trim()}
              className="px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                backgroundColor: designTokens.colors.primary[500],
                color: designTokens.colors.neutral[0],
              }}
            >
              Analyze
            </button>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      {isDragOver && (
        <div 
          className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50"
          style={{
            backgroundColor: `${designTokens.colors.primary[500]}20`,
          }}
        >
          <div
            className="text-center p-12 rounded-3xl backdrop-blur-sm"
            style={{
              backgroundColor: `${designTokens.colors.neutral[900]}90`,
              border: `3px dashed ${designTokens.colors.primary[500]}`,
            }}
          >
            <div className="mb-6">
              <svg
                className="mx-auto h-20 w-20"
                style={{ color: designTokens.colors.primary[500] }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p 
              className="text-3xl font-bold mb-2"
              style={{ 
                color: designTokens.colors.primary[500],
                fontFamily: 'Space Grotesk, ' + designTokens.typography.fontFamily.sans.join(', '),
              }}
            >
              Drop files here
            </p>
            <p 
              className="text-lg"
              style={{ color: designTokens.colors.silver[500] }}
            >
              Release to upload your files
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MinimalUploadInterface;
