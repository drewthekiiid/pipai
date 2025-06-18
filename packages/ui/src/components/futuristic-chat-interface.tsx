/**
 * Futuristic Chat Interface Component
 * Ultra sleek single-page chat interface with integrated upload dock
 * Following CDO Group branding guidelines
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { designTokens } from '../design-tokens';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  files?: UploadedFile[];
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface ChatInterfaceProps {
  onSendMessage?: (message: string, files: File[]) => void;
  messages?: Message[];
  isTyping?: boolean;
  className?: string;
}

export function FuturisticChatInterface({
  onSendMessage,
  messages: externalMessages = [],
  isTyping = false,
  className = '',
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Welcome to PIP AI Document Analysis! 🚀',
      sender: 'assistant',
      timestamp: new Date(Date.now() - 120000),
    },
    {
      id: '2',
      content: 'I can help you analyze documents, extract insights, and answer questions about your files. Simply upload a document or ask me anything!',
      sender: 'assistant',
      timestamp: new Date(Date.now() - 60000),
    },
    {
      id: '3',
      content: 'What would you like to work on today?',
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Use external messages if provided
  const displayMessages = externalMessages.length > 0 ? externalMessages : messages;

  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() === '' && uploadedFiles.length === 0) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
    };

    if (externalMessages.length === 0) {
      setMessages(prev => [...prev, newMessage]);
    }

    // Call external handler if provided
    onSendMessage?.(inputMessage.trim(), []);

    // Reset input
    setInputMessage('');
    setUploadedFiles([]);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputMessage, uploadedFiles, externalMessages.length, onSendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

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
  }, []);

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

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Auto-resize textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }, []);

  return (
    <div 
      className={`flex flex-col h-screen relative overflow-hidden ${className}`}
      style={{
        backgroundColor: designTokens.colors.neutral[900],
        fontFamily: designTokens.typography.fontFamily.sans.join(', '),
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <header 
        className="flex items-center justify-between px-6 py-4 border-b backdrop-blur-sm"
        style={{
          backgroundColor: `${designTokens.colors.neutral[900]}95`,
          borderColor: `${designTokens.colors.silver[500]}20`,
        }}
      >
        <div className="flex items-center space-x-3">
          {/* CDO Logo */}
          <div className="flex items-center">
            <svg 
              width="80" 
              height="32" 
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
          <div>
            <h1 
              className="text-xl font-bold"
              style={{ 
                color: designTokens.colors.neutral[0],
                fontFamily: 'Space Grotesk, ' + designTokens.typography.fontFamily.sans.join(', '),
              }}
            >
              AI Assistant
            </h1>
            <p 
              className="text-sm"
              style={{ color: designTokens.colors.silver[500] }}
            >
              Powered by CDO Group
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: designTokens.colors.primary[500] }}
          />
          <span 
            className="text-sm font-medium"
            style={{ color: designTokens.colors.silver[500] }}
          >
            Online
          </span>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        style={{
          background: `linear-gradient(180deg, ${designTokens.colors.neutral[900]} 0%, ${designTokens.colors.neutral[950]} 100%)`,
        }}
      >
        {displayMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] ${
                message.sender === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
              }`}
              style={{
                backgroundColor: message.sender === 'user' 
                  ? `${designTokens.colors.primary[500]}15`
                  : `${designTokens.colors.silver[500]}10`,
                border: `1px solid ${
                  message.sender === 'user' 
                    ? `${designTokens.colors.primary[500]}30`
                    : `${designTokens.colors.silver[500]}20`
                }`,
                boxShadow: message.sender === 'user'
                  ? `0 4px 20px ${designTokens.colors.primary[500]}10`
                  : `0 4px 20px ${designTokens.colors.neutral[950]}40`,
              }}
            >
              {message.files && message.files.length > 0 && (
                <div className="mb-3 space-y-2">
                  {message.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center space-x-2 p-2 rounded-lg"
                      style={{
                        backgroundColor: `${designTokens.colors.silver[500]}15`,
                      }}
                    >
                      <div 
                        className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: designTokens.colors.primary[500],
                          color: designTokens.colors.neutral[0],
                        }}
                      >
                        {file.name.split('.').pop()?.toUpperCase().slice(0, 3) || 'FILE'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-sm font-medium truncate"
                          style={{ color: designTokens.colors.neutral[0] }}
                        >
                          {file.name}
                        </p>
                        <p 
                          className="text-xs"
                          style={{ color: designTokens.colors.silver[500] }}
                        >
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <p 
                className="text-sm leading-relaxed"
                style={{ 
                  color: designTokens.colors.neutral[0],
                  fontFamily: 'Manrope, ' + designTokens.typography.fontFamily.sans.join(', '),
                }}
              >
                {message.content}
              </p>
              
              <p 
                className="text-xs mt-2 opacity-70"
                style={{ color: designTokens.colors.silver[500] }}
              >
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-bl-md px-4 py-3 backdrop-blur-sm"
              style={{
                backgroundColor: `${designTokens.colors.silver[500]}10`,
                border: `1px solid ${designTokens.colors.silver[500]}20`,
              }}
            >
              <div className="flex space-x-1">
                <div 
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ 
                    backgroundColor: designTokens.colors.silver[500],
                    animationDelay: '0ms',
                  }}
                />
                <div 
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ 
                    backgroundColor: designTokens.colors.silver[500],
                    animationDelay: '150ms',
                  }}
                />
                <div 
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ 
                    backgroundColor: designTokens.colors.silver[500],
                    animationDelay: '300ms',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area with Upload Dock */}
      <div 
        className="border-t backdrop-blur-sm p-4"
        style={{
          backgroundColor: `${designTokens.colors.neutral[900]}95`,
          borderColor: `${designTokens.colors.silver[500]}20`,
        }}
      >
        {/* File Upload Pills */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm backdrop-blur-sm"
                style={{
                  backgroundColor: `${designTokens.colors.silver[500]}20`,
                  border: `1px solid ${designTokens.colors.silver[500]}30`,
                  color: designTokens.colors.neutral[0],
                }}
              >
                <span className="truncate max-w-32">{file.name}</span>
                <span className="text-xs opacity-70">({formatFileSize(file.size)})</span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="ml-1 hover:scale-110 transition-transform"
                  style={{ color: designTokens.colors.primary[500] }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Container */}
        <div 
          className={`flex items-end gap-3 rounded-2xl p-3 transition-all duration-200 ${
            isInputFocused ? 'scale-[1.02]' : ''
          }`}
          style={{
            backgroundColor: `${designTokens.colors.neutral[800]}80`,
            border: `2px solid ${
              isInputFocused 
                ? designTokens.colors.primary[500] 
                : `${designTokens.colors.silver[500]}20`
            }`,
            boxShadow: isInputFocused 
              ? `0 0 20px ${designTokens.colors.primary[500]}20`
              : 'none',
          }}
        >
          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-2 rounded-xl transition-all duration-200 hover:scale-110"
            style={{
              backgroundColor: `${designTokens.colors.silver[500]}20`,
              color: designTokens.colors.silver[500],
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder="Type your message..."
            className="flex-1 bg-transparent border-none outline-none resize-none text-white placeholder-gray-400 min-h-[24px] max-h-[120px]"
            style={{
              fontFamily: 'Manrope, ' + designTokens.typography.fontFamily.sans.join(', '),
              fontSize: designTokens.typography.fontSize.base,
              lineHeight: designTokens.typography.lineHeight.normal,
            }}
            rows={1}
          />

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={inputMessage.trim() === '' && uploadedFiles.length === 0}
            className="flex-shrink-0 p-3 rounded-xl font-medium transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              backgroundColor: designTokens.colors.primary[500],
              color: designTokens.colors.neutral[0],
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>

        {/* Hidden File Input */}
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

      {/* Drag Overlay */}
      {isDragOver && (
        <div 
          className="absolute inset-0 flex items-center justify-center backdrop-blur-sm z-50"
          style={{
            backgroundColor: `${designTokens.colors.primary[500]}10`,
          }}
        >
          <div
            className="text-center p-8 rounded-2xl backdrop-blur-sm"
            style={{
              backgroundColor: `${designTokens.colors.neutral[900]}90`,
              border: `2px dashed ${designTokens.colors.primary[500]}`,
            }}
          >
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12"
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
              className="text-2xl font-bold mb-2"
              style={{ 
                color: designTokens.colors.primary[500],
                fontFamily: 'Space Grotesk, ' + designTokens.typography.fontFamily.sans.join(', '),
              }}
            >
              Drop files here
            </p>
            <p 
              className="text-sm"
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

export default FuturisticChatInterface;
