"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Paperclip, Send, Upload, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface StagedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
}

interface Agent {
  id: string
  name: string
  description: string
  color: string
  isActive: boolean
  status: "idle" | "processing" | "complete" | "error"
}

interface Message {
  id: string
  type: "user" | "assistant" | "system" | "progress" | "agent-step"
  content: string
  timestamp: Date
  files?: StagedFile[]
  agent?: string
  agentId?: string
  status?: "processing" | "complete" | "error" | "waiting"
  analysisResult?: {
    summary: string
    insights: string[]
    extractedText?: string
    keyTopics?: string[]
    status?: string
    analysisId?: string
  }
  stepNumber?: number
  totalSteps?: number
}

export default function FuturisticChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "manager",
      name: "Manager",
      description: "Orchestrates workflow and routing",
      color: "from-slate-500 to-slate-600",
      isActive: false,
      status: "idle",
    },
    {
      id: "file-reader",
      name: "File Reader",
      description: "Extracts content from uploaded files",
      color: "from-emerald-500 to-emerald-600",
      isActive: false,
      status: "idle",
    },
    {
      id: "trade-mapper",
      name: "Trade Mapper",
      description: "Identifies construction trades",
      color: "from-cyan-500 to-cyan-600",
      isActive: false,
      status: "idle",
    },
    {
      id: "estimator",
      name: "Estimator",
      description: "Generates cost estimates",
      color: "from-violet-500 to-violet-600",
      isActive: false,
      status: "idle",
    },
    {
      id: "exporter",
      name: "Exporter",
      description: "Formats and exports results",
      color: "from-amber-500 to-amber-600",
      isActive: false,
      status: "idle",
    },
  ])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [eventSource])

  const updateAgentStatus = (agentId: string, status: Agent["status"], isActive = false) => {
    setAgents((prev) =>
      prev.map((agent) => (agent.id === agentId ? { ...agent, status, isActive } : { ...agent, isActive: false })),
    )
  }

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
    const newStagedFiles = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    }))
    setStagedFiles((prev) => [...prev, ...newStagedFiles])
  }

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((file) => file.id !== id))
  }





  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleSendMessage()
  }

  const handleSendMessage = async () => {
    if (!input.trim() && stagedFiles.length === 0) return

    try {
      setIsProcessing(true)
      
      // Clear input immediately
      const currentInput = input
      setInput("")

      // Create user message
      const userMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "user",
        content: currentInput || "Process uploaded files",
        timestamp: new Date(),
        files: stagedFiles.length > 0 ? [...stagedFiles] : undefined,
      }

      setMessages(prev => [...prev, userMessage])
      
      // If we have files, start document analysis workflow
      if (stagedFiles.length > 0) {
        await handleDocumentAnalysis(currentInput)
      } else {
        // Handle chat-only message (follow-up questions)
        await handleChatMessage(currentInput)
      }

    } catch (error) {
      console.error("Error sending message:", error)
      
      const errorMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "agent-step",
        content: `❌ Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        agent: "Manager",
        agentId: "manager",
        status: "error",
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Handle document analysis workflow (file upload)
   */
  const handleDocumentAnalysis = async (currentInput: string) => {
    for (const stagedFile of stagedFiles) {
      const uploadMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "agent-step",
        content: `Uploading ${stagedFile.name} to secure storage and starting analysis...`,
        timestamp: new Date(),
        agent: "Manager",
        agentId: "manager",
        status: "processing",
      }
      setMessages(prev => [...prev, uploadMessage])

      const formData = new FormData()
      formData.append("file", stagedFile.file)
      formData.append("userId", "demo-user")
      formData.append("prompt", currentInput || "Analyze this construction document")

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Start streaming for this workflow
      if (result.workflowId) {
        console.log("Starting SSE stream for workflow:", result.workflowId)
        
        // Start SSE streaming to get real-time progress
        const newEventSource = new EventSource(`/api/stream/${result.workflowId}`)
        setEventSource(newEventSource)
        
        newEventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('📡 SSE event received:', data)
            
            if (data.type === 'progress') {
              // Update agent status based on progress
              updateAgentStatus("file-reader", "processing", true)
              
              const progressMessage: Message = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: "agent-step",
                content: data.message || data.step,
                timestamp: new Date(),
                agent: data.agent || "File Reader",
                agentId: "file-reader",
                status: "processing",
              }
              setMessages(prev => [...prev, progressMessage])
            } else if (data.type === 'complete') {
              // Mark all agents as complete and show results
              setAgents((prev) => prev.map((agent) => ({ ...agent, status: "complete", isActive: false })))
              
              const completionMessage: Message = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: "agent-step",
                content: data.message || "✅ Analysis complete! Here are the results:",
                timestamp: new Date(),
                agent: "Manager",
                agentId: "manager",
                status: "complete",
                analysisResult: data.analysisResult || {
                  summary: "Construction document analysis completed successfully.",
                  insights: ["Document processed", "Analysis complete"]
                },
              }
              setMessages(prev => [...prev, completionMessage])
              
              setIsProcessing(false)
              newEventSource.close()
              setEventSource(null)
            } else if (data.type === 'error') {
              const errorMessage: Message = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: "agent-step",
                content: `❌ Analysis failed: ${data.message}`,
                timestamp: new Date(),
                agent: "Manager",
                agentId: "manager",
                status: "error",
              }
              setMessages(prev => [...prev, errorMessage])
              
              setIsProcessing(false)
              setAgents((prev) => prev.map((agent) => ({ ...agent, status: "error", isActive: false })))
              newEventSource.close()
              setEventSource(null)
            } else if (data.type === 'status') {
              // Handle status updates (just log for now)
              console.log(`📊 Workflow status: ${data.status}`)
            } else if (data.workflowId && data.message === 'Connected to workflow stream') {
              // Handle connected event
              console.log(`🔗 Connected to workflow stream: ${data.workflowId}`)
            }
          } catch (err) {
            console.error('Failed to parse SSE data:', err)
          }
        }
        
        newEventSource.onerror = (error) => {
          console.error('EventSource failed:', error)
          newEventSource.close()
          setEventSource(null)
          setIsProcessing(false)
          setAgents((prev) => prev.map((agent) => ({ ...agent, status: "error", isActive: false })))
        }
      }
      
      // Reset agents and start monitoring
      setAgents((prev) => prev.map((agent) => ({ ...agent, status: "idle", isActive: false })))
    }

    // Clear staged files
    setStagedFiles([])
  }

  /**
   * Handle chat-only messages (follow-up questions)
   */
  const handleChatMessage = async (currentInput: string) => {
    // Find the most recent analysis results from messages
    const lastAnalysisMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.type === "agent-step" && msg.analysisResult)

    console.log('💬 Sending chat message:', {
      message: currentInput,
      hasAnalysisContext: !!lastAnalysisMessage?.analysisResult
    })

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          analysisContext: lastAnalysisMessage?.analysisResult || null
        }),
      })

      if (!response.ok) {
        throw new Error(`Chat failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Create assistant response message
      const assistantMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "assistant",
        content: result.response,
        timestamp: new Date(),
        agent: result.type === 'scope' ? "EstimAItor" : "Assistant",
        agentId: result.type === 'scope' ? "estimator" : "assistant",
        status: "complete",
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error("❌ Chat request failed:", error)
      
      const errorMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "agent-step",
        content: `❌ Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        agent: "Assistant",
        agentId: "assistant",
        status: "error",
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const abortWorkflow = () => {
    // Close event source if running
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
    
    setIsProcessing(false)
    setAgents((prev) => prev.map((agent) => ({ ...agent, status: "idle", isActive: false })))

    const abortMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "system",
      content: "Workflow aborted by user. All agent processes have been terminated.",
      timestamp: new Date(),
      agent: "Manager",
      status: "error",
    }
    setMessages((prev) => [...prev, abortMessage])
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex flex-col fixed inset-0 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.03),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.05),transparent_50%)]" />

      {/* Agent Legend - Fixed Header */}
      <div className="flex-shrink-0 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Agents</h2>
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      agent.isActive
                        ? `bg-gradient-to-r ${agent.color} animate-pulse shadow-lg shadow-current`
                        : agent.status === "complete"
                          ? "bg-green-500"
                          : agent.status === "error"
                            ? "bg-red-500"
                            : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">{agent.name}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              {isProcessing && (
                <Button
                  onClick={abortWorkflow}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Abort Workflow
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-8 relative z-10">
        {messages.length === 0 ? (
          // Empty State
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-red-500/25">
              <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
                <div className="w-4 h-3 bg-red-500 rounded-sm" />
              </div>
            </div>

            <h1 className="text-4xl font-light text-slate-900 dark:text-slate-100 mb-4 tracking-tight">Let&apos;s Build!</h1>

            <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg font-light">
              Start a new conversation, upload files, or paste content URLs.
            </p>

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 px-8 py-3 text-base font-medium shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Files
            </Button>
          </div>
        ) : (
          // Messages
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-2xl px-6 py-4 rounded-2xl ${
                    message.type === "user"
                      ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25"
                      : message.type === "system"
                        ? "bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/25"
                        : message.type === "agent-step"
                          ? message.status === "waiting"
                            ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25"
                            : message.status === "complete"
                              ? "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25"
                              : "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
                          : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/50 dark:border-slate-700/50"
                  }`}
                >
                  {message.agent && (
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs opacity-75 font-medium">{message.agent}</div>
                      {message.stepNumber && message.totalSteps && (
                        <div className="text-xs opacity-75">
                          Step {message.stepNumber}/{message.totalSteps}
                        </div>
                      )}
                    </div>
                  )}

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

                  <div className="flex items-start space-x-3">
                    {message.status === "processing" && (
                      <div className="flex space-x-1 mt-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                        <div
                          className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    )}
                    <p className="text-base leading-relaxed font-light flex-1">{message.content}</p>
                  </div>

                  {message.analysisResult && (
                    <div className="mt-4 space-y-3">
                      <div className="text-sm font-medium opacity-90">Analysis Results:</div>
                      
                      <div className="p-3 bg-white/10 rounded-lg">
                        <div className="text-sm font-medium mb-2">Summary:</div>
                        <p className="text-sm opacity-90 leading-relaxed">{message.analysisResult.summary}</p>
                      </div>
                      
                      {message.analysisResult.insights.length > 0 && (
                        <div className="p-3 bg-white/10 rounded-lg">
                          <div className="text-sm font-medium mb-2">Key Insights:</div>
                          <ul className="text-sm opacity-90 space-y-1">
                            {message.analysisResult.insights.map((insight, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <span className="text-xs mt-1.5">•</span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {message.analysisResult.extractedText && message.analysisResult.extractedText.length > 0 && (
                        <div className="p-3 bg-white/10 rounded-lg">
                          <div className="text-sm font-medium mb-2">Detailed Analysis:</div>
                          <div className="text-sm opacity-90 leading-relaxed max-h-96 overflow-y-auto">
                            {message.analysisResult.extractedText.split('\n').map((line, index) => (
                              <div key={index} className={`${line.trim() === '' ? 'h-2' : ''} ${line.includes('===') ? 'font-semibold text-white' : ''} ${line.includes('DIVISION') || line.includes('CSI') ? 'font-medium' : ''}`}>
                                {line || '\u00A0'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {message.analysisResult.keyTopics && message.analysisResult.keyTopics.length > 0 && (
                        <div className="p-3 bg-white/10 rounded-lg">
                          <div className="text-sm font-medium mb-2">Key Topics:</div>
                          <div className="flex flex-wrap gap-2">
                            {message.analysisResult.keyTopics.map((topic, index) => (
                              <span key={index} className="px-2 py-1 bg-white/20 rounded text-xs">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-2 text-xs opacity-60">{message.timestamp.toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Dock - Fixed Footer */}
      <div className="flex-shrink-0 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl relative z-10">
        <div className="max-w-4xl mx-auto p-6">
          {/* Staged Files */}
          {stagedFiles.length > 0 && (
            <div className="mb-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Staged Files ({stagedFiles.length})
              </div>
              <div className="space-y-2">
                {stagedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-slate-500">({formatFileSize(file.size)})</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStagedFile(file.id)}
                      className="text-slate-500 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative">
            <div
              className={`relative rounded-2xl border-2 transition-all duration-300 ${
                dragActive
                  ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              } shadow-lg`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Drop some plans, paste a link or say 'What's Up!'"
                className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent px-6 py-4 text-base placeholder:text-slate-500 dark:placeholder:text-slate-400 focus-visible:ring-0 font-light"
              />

              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-light">
                    Press <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">Enter</kbd> to send,{" "}
                    <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">Shift + Enter</kbd> for
                    new line
                  </span>
                  <Button
                    type="submit"
                    disabled={(stagedFiles.length === 0 && !input.trim()) || isProcessing}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 px-6 py-2 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            const files = Array.from(e.target.files)
            stageFiles(files)
          }
        }}
        multiple
      />
    </div>
  )
}
