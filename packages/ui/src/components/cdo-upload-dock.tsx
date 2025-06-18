/**
 * CDO-Branded Upload Dock Component
 * Sleek, modern upload interface with CDO Group branding
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { designTokens } from '../design-tokens';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface UploadDockProps {
  onFilesSelected?: (files: File[]) => void;
  onFileRemove?: (fileId: string) => void;
  onSend?: () => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

export function UploadDock({
  onFilesSelected,
  onFileRemove,
  onSend,
  maxFiles = 5,
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt'],
  disabled = false,
  className = '',
}: UploadDockProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles = fileArray.filter(file => {
      if (acceptedTypes.length === 0) return true;
      return acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type.match(type.replace('*', '.*'));
      });
    });

    if (files.length + validFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const uploadedFiles: UploadedFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setFiles(prev => [...prev, ...uploadedFiles]);
    onFilesSelected?.(validFiles);
  }, [files.length, maxFiles, acceptedTypes, onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [disabled, handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    onFileRemove?.(fileId);
  }, [onFileRemove]);

  const handleSend = useCallback(() => {
    if (files.length === 0 && message.trim() === '') return;
    onSend?.();
    setMessage('');
    setFiles([]);
  }, [files.length, message, onSend]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div 
      className={`relative ${className}`}
      style={{
        width: designTokens.components.uploadDock.width,
        minHeight: designTokens.components.uploadDock.height,
        maxWidth: '100%',
      }}
    >
      {/* CDO Logo Badge */}
      <div 
        className="absolute top-4 left-4 z-10 flex items-center"
        style={{
          height: designTokens.components.logo.size,
          opacity: designTokens.components.logo.opacity,
        }}
      >
        <svg 
          width="60" 
          height="24" 
          viewBox="0 0 100 40" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="h-6"
        >
          {/* CDO Text */}
          <g fill="#EF2323">
            {/* C */}
            <path d="M12 8.5C9.5 8.5 7.5 10.5 7.5 13V17C7.5 19.5 9.5 21.5 12 21.5H15V18.5H12C11.2 18.5 10.5 17.8 10.5 17V13C10.5 12.2 11.2 11.5 12 11.5H15V8.5H12Z"/>
            {/* D */}
            <path d="M18 8.5V21.5H24C26.5 21.5 28.5 19.5 28.5 17V13C28.5 10.5 26.5 8.5 24 8.5H18ZM21 11.5H24C24.8 11.5 25.5 12.2 25.5 13V17C25.5 17.8 24.8 18.5 24 18.5H21V11.5Z"/>
            {/* O */}
            <path d="M31.5 13V17C31.5 19.5 33.5 21.5 36 21.5H39C41.5 21.5 43.5 19.5 43.5 17V13C43.5 10.5 41.5 8.5 39 8.5H36C33.5 8.5 31.5 10.5 31.5 13ZM34.5 13C34.5 12.2 35.2 11.5 36 11.5H39C39.8 11.5 40.5 12.2 40.5 13V17C40.5 17.8 39.8 18.5 39 18.5H36C35.2 18.5 34.5 17.8 34.5 17V13Z"/>
          </g>
          {/* GROUP Text */}
          <text x="48" y="28" fill="#C0C0C0" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">GROUP</text>
        </svg>
      </div>

      {/* Main Upload Dock */}
      <div
        className={`
          relative overflow-hidden transition-all duration-200 cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{
          width: '100%',
          minHeight: designTokens.components.uploadDock.height,
          backgroundColor: designTokens.components.uploadDock.background,
          borderRadius: designTokens.components.uploadDock.borderRadius,
          border: `${designTokens.components.uploadDock.borderWidth} solid ${
            isDragOver || files.length > 0 
              ? designTokens.components.uploadDock.borderActive 
              : designTokens.components.uploadDock.borderDefault
          }`,
          boxShadow: designTokens.components.uploadDock.shadow,
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        {/* Drop Zone */}
        <div className="flex flex-col items-center justify-center p-6 h-full">
          <div className="text-center mb-4">
            <div className="mb-2">
              <svg
                className="mx-auto h-8 w-8"
                style={{ color: designTokens.colors.silver[500] }}
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
              className="font-bold"
              style={{
                color: designTokens.colors.silver[500],
                fontSize: designTokens.typography.fontSize.lg,
                fontFamily: designTokens.typography.fontFamily.sans.join(', '),
              }}
            >
              Drop files here or click to upload
            </p>
            <p 
              className="text-sm mt-1"
              style={{ color: designTokens.colors.silver[400] }}
            >
              Support for images, documents, and text files
            </p>
          </div>

          {/* File Pills */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 w-full justify-center">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                  style={{
                    backgroundColor: designTokens.components.filePill.background,
                    color: designTokens.components.filePill.textColor,
                  }}
                >
                  <span className="truncate max-w-32">{file.name}</span>
                  <span className="text-xs opacity-70">({formatFileSize(file.size)})</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(file.id);
                    }}
                    className="ml-1 hover:scale-110 transition-transform"
                    style={{ color: designTokens.components.filePill.deleteColor }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          disabled={disabled}
        />

        {/* Drag Overlay */}
        {isDragOver && (
          <div 
            className="absolute inset-0 flex items-center justify-center rounded-lg"
            style={{
              backgroundColor: `${designTokens.colors.primary[500]}20`,
              borderRadius: designTokens.components.uploadDock.borderRadius,
            }}
          >
            <div
              className="text-2xl font-bold"
              style={{ color: designTokens.colors.primary[500] }}
            >
              Drop files here
            </div>
          </div>
        )}
      </div>

      {/* Chat Input & Send Button */}
      <div className="flex gap-3 mt-4">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-3 rounded-xl text-white placeholder-gray-400 border-0 outline-none transition-all"
          style={{
            backgroundColor: designTokens.colors.neutral[800],
            boxShadow: `0 0 0 2px transparent`,
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = `0 0 0 2px ${designTokens.colors.primary[500]}`;
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = `0 0 0 2px transparent`;
          }}
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={disabled || (files.length === 0 && message.trim() === '')}
          className="px-6 py-3 rounded-full font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            backgroundColor: designTokens.colors.primary[500],
            color: designTokens.components.sendButton.textColor,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default UploadDock;
