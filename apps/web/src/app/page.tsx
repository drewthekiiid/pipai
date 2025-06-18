"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import { Upload, Send, Paperclip, X, FileText, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

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
  deliverables?: {
    name: string
    type: "pdf" | "xlsx" | "json"
    downloadUrl?: string
  }[]
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

  const onSendMessage = async (message: string, files?: File[]) => {
    if (!message.trim() && (!files || files.length === 0)) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: message,
      timestamp: new Date(),
      files: files?.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          files: files?.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        type: "assistant",
        content: data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        type: "system",
        content: "Sorry, I encountered an error processing your message. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && stagedFiles.length === 0) return

    const files = stagedFiles.map((sf) => sf.file)
    await onSendMessage(input, files)
    setInput("")
    setStagedFiles([])
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f1f5f9' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-8 relative z-10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-red-500/25">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              Welcome to PIP AI
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed font-light">
              Your intelligent construction document analysis assistant. Upload plans, specifications, or ask questions
              to get started.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className={`w-8 h-8 bg-gradient-to-r ${agent.color} rounded-lg mb-3`} />
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{agent.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-light">{agent.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-6 py-4 shadow-lg ${
                    message.type === "user"
                      ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                      : message.type === "agent-step"
                        ? `bg-gradient-to-r ${
                            agents.find((a) => a.id === message.agentId)?.color || "from-slate-500 to-slate-600"
                          } text-white`
                        : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {message.type === "agent-step" && message.status === "processing" && (
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                          style={{ animationDuration: "0.8s" }}
                        />
                      </div>
                    )}
                    {message.type === "agent-step" && message.status === "complete" && (
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className="w-4 h-4 bg-white rounded-full flex items-center justify-center"
                          style={{ animationDuration: "0.2s" }}
                        />
                      </div>
                    )}
                    <p className="text-base leading-relaxed font-light flex-1">{message.content}</p>
                  </div>

                  {message.deliverables && message.deliverables.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-sm font-medium opacity-90">Deliverables:</div>
                      {message.deliverables.map((deliverable, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                          <span className="text-sm">{deliverable.name}</span>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Smartsheet
                            </Button>
                          </div>
                        </div>
                      ))}
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
