"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Download, FileText, Paperclip, Send, Upload, X } from "lucide-react"
import type React from "react"
import { useRef, useState } from "react"

interface StagedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  preview?: string
}

interface Message {
  id: string
  type: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  files?: StagedFile[]
  analysisType?: string
  progress?: number
}

export default function SimpleEstimatorChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files)
      stageFiles(files)
    }
  }

  const stageFiles = (files: File[]) => {
    const maxFileSize = 100 * 1024 * 1024; // 100MB limit per file for large construction documents
    const validFiles: StagedFile[] = [];
    const rejectedFiles: string[] = [];

    files.forEach((file) => {
      if (file.size > maxFileSize) {
        rejectedFiles.push(`${file.name} (${formatFileSize(file.size)})`);
      } else {
        validFiles.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }
    });

    if (rejectedFiles.length > 0) {
      // Add error message for rejected files
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "system",
        content: `⚠️ Some files were too large and skipped (max 100MB per file):\n${rejectedFiles.join('\n')}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    if (validFiles.length > 0) {
      setStagedFiles((prev) => [...prev, ...validFiles]);
    }
  }

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data:image/jpeg;base64, part
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  // Stream large files with progress tracking
  const processLargeFiles = async (files: StagedFile[]): Promise<Array<{name: string, type: string, data: string}>> => {
    const filesData: Array<{name: string, type: string, data: string}> = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const isLarge = file.size > 25 * 1024 * 1024 // 25MB threshold for progress tracking
      
      if (isLarge) {
        // Add progress message for large files
        const progressMessage: Message = {
          id: `progress-${Date.now()}`,
          type: "system",
          content: `📤 Processing large file: ${file.name} (${formatFileSize(file.size)})...`,
          timestamp: new Date(),
          progress: 0
        }
        setMessages((prev) => [...prev, progressMessage])
        
        // Simulate progress updates while encoding
        const progressInterval = setInterval(() => {
          setMessages((prev) => 
            prev.map(msg => 
              msg.id === progressMessage.id 
                ? { ...msg, progress: Math.min((msg.progress || 0) + 10, 90) }
                : msg
            )
          )
        }, 500)
        
        try {
          const data = await fileToBase64(file.file)
          filesData.push({
            name: file.name,
            type: file.type,
            data
          })
          
          clearInterval(progressInterval)
          // Update to completion
          setMessages((prev) => 
            prev.map(msg => 
              msg.id === progressMessage.id 
                ? { ...msg, content: `✅ Processed: ${file.name}`, progress: 100 }
                : msg
            )
          )
        } catch (error) {
          clearInterval(progressInterval)
          setMessages((prev) => 
            prev.map(msg => 
              msg.id === progressMessage.id 
                ? { ...msg, content: `❌ Failed to process: ${file.name}`, progress: undefined }
                : msg
            )
          )
          throw error
        }
      } else {
        // Process smaller files normally
        const data = await fileToBase64(file.file)
        filesData.push({
          name: file.name,
          type: file.type,
          data
        })
      }
    }
    
    return filesData
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (stagedFiles.length === 0 && !input.trim()) return

    setIsProcessing(true)

    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input || "Analyze these construction documents",
      timestamp: new Date(),
      files: stagedFiles.length > 0 ? [...stagedFiles] : undefined,
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      // Prepare files for API with streaming support for large files
      const filesData = await processLargeFiles(stagedFiles)

      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input || "Please analyze these construction documents and provide trade detection, scope of work, and material takeoffs in CSI order.",
          userId: 'demo-user',
          files: filesData.length > 0 ? filesData : undefined
        }),
      })

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          // Check if response is JSON before parsing
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
                     } else {
             // If not JSON, get text content (likely HTML error page)
             const errorText = await response.text();
             if (errorText.includes('API key')) {
               errorMessage = 'Invalid OpenAI API key. Please check your API key configuration.';
             } else if (response.status === 401) {
               errorMessage = 'Authentication failed. Please check your API key.';
             } else if (response.status === 413) {
               errorMessage = 'File too large. Please reduce file size or compress images (max recommended: 100MB per file).';
             } else {
               errorMessage = `Server error: ${response.status}`;
             }
           }
                 } catch (parseError) {
           // If parsing fails, use status-based message
           if (response.status === 401) {
             errorMessage = 'Invalid OpenAI API key. Please check your API key configuration.';
           } else if (response.status === 413) {
             errorMessage = 'File too large. Please reduce file size or compress images (max recommended: 100MB per file).';
           } else {
             errorMessage = `Server error: ${response.status}`;
           }
         }
        throw new Error(errorMessage);
      }

      const result = await response.json()

      // Add assistant response
      const assistantMessage: Message = {
        id: result.id || Date.now().toString(),
        type: "assistant",
        content: result.message,
        timestamp: new Date(result.timestamp),
        analysisType: result.analysisType
      }

      setMessages((prev) => [...prev, assistantMessage])

    } catch (error) {
      console.error('Chat API error:', error)
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "system",
        content: `❌ Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your OpenAI API key configuration.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
      setStagedFiles([])
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex flex-col fixed inset-0 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <div className="w-5 h-4 bg-white rounded-sm flex items-center justify-center">
                  <div className="w-3 h-2 bg-red-500 rounded-sm" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">EstimAItor</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Construction Document Analysis</p>
              </div>
            </div>
            {isProcessing && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Analyzing...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        {messages.length === 0 ? (
          // Empty State
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-red-500/25">
              <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
                <div className="w-4 h-3 bg-red-500 rounded-sm" />
              </div>
            </div>

            <h1 className="text-4xl font-light text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
              Upload Construction Plans
            </h1>

            <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg font-light">
              Upload your construction documents and I'll analyze them to detect trades, generate scope of work, and create takeoffs in CSI order.
            </p>

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 px-8 py-3 text-base font-medium shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Plans
            </Button>
          </div>
        ) : (
          // Messages
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-3xl px-6 py-4 rounded-2xl ${
                    message.type === "user"
                      ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25"
                      : message.type === "system"
                        ? "bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/25"
                        : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/50 dark:border-slate-700/50"
                  }`}
                >
                  {message.files && message.files.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {message.files.map((file) => (
                        <div key={file.id} className="flex items-center space-x-2 p-2 bg-white/10 rounded-lg">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs opacity-75">({formatFileSize(file.size)})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>

                  {message.progress !== undefined && (
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-xs opacity-75">
                        <span>Processing...</span>
                        <span>{message.progress}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-white rounded-full h-2 transition-all duration-500"
                          style={{ width: `${message.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {message.analysisType === 'construction' && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs opacity-75">Construction Analysis Complete</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-white/80 hover:text-white hover:bg-white/10"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Export Report
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div
        className={`flex-shrink-0 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-colors duration-300 ${
          dragActive ? "bg-red-50/80 dark:bg-red-900/20 border-red-300/50" : ""
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="max-w-4xl mx-auto p-6">
          {/* Staged Files */}
          {stagedFiles.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {stagedFiles.map((file) => (
                <div key={file.id} className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{file.name}</span>
                  <span className="text-xs text-slate-500">({formatFileSize(file.size)})</span>
                  <button
                    onClick={() => removeStagedFile(file.id)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex items-end space-x-4">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={stagedFiles.length > 0 ? "Add instructions for analysis..." : "Ask about construction estimating or upload documents..."}
                className="resize-none border-slate-300 dark:border-slate-600 focus:border-red-500 focus:ring-red-500/20"
                rows={1}
                disabled={isProcessing}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-slate-300 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                disabled={isProcessing}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              
              <Button
                type="submit"
                size="sm"
                disabled={isProcessing || (stagedFiles.length === 0 && !input.trim())}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={(e) => e.target.files && stageFiles(Array.from(e.target.files))}
            className="hidden"
          />
        </div>
      </div>
    </div>
  )
} 