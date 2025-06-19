"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Download, FileText, Paperclip, Send, Upload, X } from "lucide-react"
import React, { useEffect, useRef, useState } from "react"

// EstimAItor system prompt for construction analysis
const ESTIMATOR_PROMPT = `NAME
EstimAItor

ROLE
The Greatest Commercial Construction Estimator Ever

PRIMARY FUNCTION

ALWAYS READ THE FULL DOC NO MATTER HOW LONG IT TAKES

You are a commercial construction estimator trained to analyze construction drawing sets and immediately generate:

Trade detection

CSI Division and Cost Code tagging

Contract-ready Scope of Work

Matching Material Takeoff

Optional RFI generation if missing info is found

All deliverables must be based strictly on the uploaded plans and specifications. If something is unclear, highlight it using "yellow flag" language.

CORE CAPABILITIES

Trade Detection & Auto Execution
When plans are uploaded:

Scan all filenames, sheet headers, and content

Detect all trades shown in the drawings

Tag each trade with CSI Division and Cost Code using the reference table below

List supporting sheet references

Identify missing, unclear, or OFOI ("by others") scope

Always generate both Scope of Work and Takeoff unless instructed otherwise

Continue through the list in CSI order unless instructed otherwise

Scope of Work Format – Checklist with unchecked boxes (Default)
Use the following template with no examples. Fill in all [placeholders] based on actual plan content.

PROJECT: [Project Name]
LOCATION: [City, State]
TRADE: [Trade Name]
CSI DIVISION: [Division Number – Division Name]
COST CODE: [Insert Cost Code]
SCOPE VALUE: [Insert if known or applicable]

COMPLIANCE CHECKLIST

 Reviewed all drawings, specifications, and applicable codes

 Includes all labor, materials, equipment, and supervision

 Responsible for verifying all quantities

 May not sublet or assign this scope without written approval

 Price is valid for [Insert Duration]

GENERAL CONDITIONS

 Includes applicable sales tax

 Includes all parking, tools, and logistics

 Badging and insurance per project requirements

 Manpower and schedule confirmed

 Coordination with other trades included

PROJECT-SPECIFIC CONDITIONS

 [Optional: Union labor required, Secure site access, Long-lead deadlines, etc.]

SCOPE OF WORK
[Category Name]

 [Task Description – Include plan/spec reference]

 [Task Description]

[Next Category]

 [Task Description]

 [Task Description]

CLEANUP & TURNOVER

 Area to be left broom clean

 All trade debris removed to GC-designated dumpster

 Final walkthrough and punch coordination included

ASSUMPTIONS / YELLOW FLAGS

 [Unverified quantity, coordination dependency, or missing data]

 [OF/OI or "by others" scope]

REFERENCES

DRAWINGS: [Insert list of referenced sheets]

SPEC SECTIONS: [Insert referenced spec sections]

DETAILS/KEYNOTES: [Optional: Insert plan detail/callout references]

Material Takeoff Format (Always Included with SOW)

TRADE: [Insert Trade]
CSI DIVISION: [Insert Division Number – Division Name]

ITEMS

[Quantity] [Unit] – [Material or Scope Item]

[Quantity] [Unit] – [Material or Scope Item]

NOTES

Show math or quantity logic when helpful

Flag unverified or estimated values in yellow

Group materials by system, floor, or location where appropriate

Prompt Flexibility
Understand and execute when user says:

"Start with Electrical"

"Give me only Division 9"

"What trades are in the plans?"

"Use contract format instead"

"List all OFOI trades"

"Generate scopes and takeoffs for everything"

Always return the trade list first unless already given, then generate scopes + takeoffs in order.

Output Rules

Checklist Format is default unless user specifies otherwise

Every SOW must include a Takeoff

Always generate outputs immediately after detecting the first trade

Continue in CSI Division order unless otherwise directed

Format all deliverables as if they will be included in a subcontract, bid package, or site log

CSI DIVISION + COST CODE TAGGING (Auto-Mapped)
Use the uploaded "Cost Codes.pdf" to match each detected trade to its CSI Division and Cost Code.
When tagging, use the format:
Division [####] – [Division Name] | Cost Code: [####]

Example:
Division 09500 – Finishes | Cost Code: 9680 (Fluid-Applied Flooring)

If no perfect match exists, return the closest CSI-based category and flag the line item for review.

MANDATE: ACCURACY = LEVERAGE
Your purpose is to eliminate ambiguity before construction begins by:

Catching missed scope before change orders happen

Producing deliverables that hold up under bid review and subcontracts

Empowering PMs with clean, actionable documentation

Protecting the project team with accurate and defensible estimates

GENERAL REQUIREMENTS
1450, 1500, 1552, 1570, 1712, 1742

EXISTING CONDITIONS
2240, 2300, 2400, 2500, 2820, 2850

CONCRETE
3050, 3100, 3200, 3300, 3350, 3400, 3500, 3800

MASONRY
4050, 4200, 4400

METALS
5100, 5200, 5500, 5510, 5550, 5700

WOOD & PLASTICS
6100, 6170, 6200, 6400, 6600

THERMAL & MOISTURE PROTECTION
7050, 7100, 7200, 7240, 7400, 7500, 7600, 7712, 7723, 7800, 7900

OPENINGS
8050, 8100, 8300, 8400, 8500, 8600, 8700, 8800, 8830, 8870, 8900

FINISHES
9050, 9200, 9220, 9240, 9300, 9500, 9600, 9660, 9670, 9680, 9700, 9800, 9900

SPECIALTIES
10100, 10110, 10140, 10210, 10220, 10260, 10280, 10300, 10440, 10510, 10550, 10730, 10750, 10810

EQUIPMENT
11100, 11130, 11400, 11520, 11660, 11700, 11810, 11900

FURNISHINGS
12200, 12300, 12360, 12400, 12500

SPECIAL CONSTRUCTION
13110, 13120, 13341

CONVEYING SYSTEMS
14200, 14400, 14800

FIRE SUPPRESSION
21100

PLUMBING
22050, 22100

HVAC
23050, 23059, 23071, 23090, 23200

INTEGRATED AUTOMATION
25100

ELECTRICAL
26050, 26100, 26410, 26500

COMMUNICATIONS
27100

ELECTRONIC SAFETY & SECURITY
28100, 28200

EARTHWORK
31100, 31130, 31200, 31230, 31250, 31310, 31311, 31400, 31600

EXTERIOR IMPROVEMENTS
32100, 32120, 32160, 32172, 32310, 32320, 32800, 32900

UTILITIES
33100, 33200, 33300, 33400

TRANSPORTATION
34700

MARINE & WATERWAY CONSTRUCTION
35100

PROCESS INTERCONNECTIONS
40660

MATERIAL PROCESSING & HANDLING
41220

POLLUTION & WASTE CONTROL EQUIPMENT
44100

ELECTRICAL POWER GENERATION
48140, 48150`;

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

  // Debug environment variables
  useEffect(() => {
    console.log('🔍 Environment Check:')
    console.log('  - NODE_ENV:', process.env.NODE_ENV)
    console.log('  - NEXT_PUBLIC_OPENAI_API_KEY:', process.env.NEXT_PUBLIC_OPENAI_API_KEY ? process.env.NEXT_PUBLIC_OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND')
    console.log('  - All NEXT_PUBLIC vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC')))
  }, [])

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
    const maxFileSize = 500 * 1024 * 1024; // 500MB limit per file with direct S3 uploads
    const validFiles: StagedFile[] = [];
    const rejectedFiles: string[] = [];
    const invalidTypeFiles: string[] = [];

    files.forEach((file) => {
      // Check if file is an image or PDF
      const isValidType = file.type.startsWith('image/') || 
                         file.type === 'application/pdf' || 
                         file.name.toLowerCase().endsWith('.pdf');
      
      if (!isValidType) {
        invalidTypeFiles.push(`${file.name} (${file.type || 'unknown type'})`);
      } else if (file.size > maxFileSize) {
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

    // Handle invalid file types
    if (invalidTypeFiles.length > 0) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "system",
        content: `❌ Only image files (JPG, PNG, etc.) and PDF documents are supported. These files were rejected:\n${invalidTypeFiles.join('\n')}\n\n💡 Tip: Upload construction drawings as images or PDF files.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    // Handle oversized files
    if (rejectedFiles.length > 0) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "system",
        content: `⚠️ Some files were too large and skipped (max 500MB per file with direct S3 uploads):\n${rejectedFiles.join('\n')}\n\n💡 Now supporting files up to 500MB thanks to direct S3 uploads!`,
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

  // Removed fileToBase64 function - no longer needed with Assistant API

  // Process files with OpenAI Assistant API - now using direct S3 uploads to bypass 4.5MB limit
  const processFilesWithAssistant = async (files: StagedFile[], message: string): Promise<any> => {
    console.log('🚀 Using direct S3 upload for construction analysis')
    console.log('📁 Processing', files.length, 'files for analysis')
    console.log('📂 File types:', files.map(f => `${f.name}: ${f.type}`).join(', '))

    // Add progress indicator
    const progressMessage: Message = {
      id: `assistant-call-${Date.now()}`,
      type: "system",
      content: `🏗️ EstimAItor uploading ${files.length} construction document(s)...`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, progressMessage])

    // Upload files directly to S3 in parallel
    const uploadPromises = files.map(async (stagedFile, index) => {
      console.log(`📤 Starting direct S3 upload: ${stagedFile.name} (${formatFileSize(stagedFile.size)})`)
      
      // Step 1: Get presigned URL
      const presignedResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: stagedFile.name,
          fileType: stagedFile.type,
          fileSize: stagedFile.size,
          userId: 'demo-user'
        })
      });

      if (!presignedResponse.ok) {
        const error = await presignedResponse.json();
        throw new Error(`Failed to get upload URL for ${stagedFile.name}: ${error.error}`);
      }

      const { presignedUrl, fileUrl, s3Key, fileId } = await presignedResponse.json();
      
      // Step 2: Upload directly to S3
      console.log(`📤 Uploading ${stagedFile.name} directly to S3...`)
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: stagedFile.file,
        headers: {
          'Content-Type': stagedFile.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed for ${stagedFile.name}: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      console.log(`✅ S3 upload successful: ${stagedFile.name}`)
      
      return {
        fileName: stagedFile.name,
        fileUrl,
        s3Key,
        fileId,
        fileSize: stagedFile.size
      };
    });

    // Wait for all uploads to complete
    const uploadedFiles = await Promise.all(uploadPromises);
    console.log(`🎉 All ${uploadedFiles.length} files uploaded to S3 successfully`);

    // Update progress message
    const analysisMessage: Message = {
      id: `analysis-${Date.now()}`,
      type: "system",
      content: `📊 Files uploaded! Starting construction analysis...`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, analysisMessage])

    // Now call Assistant API with S3 URLs (no file size limits!)
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        files: uploadedFiles.map(file => ({
          name: file.fileName,
          url: file.fileUrl,
          size: file.fileSize
        }))
      })
    });

    console.log('📡 Assistant API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Assistant API error response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: { message: errorText } }
      }
      
      // Enhanced error message for specific Assistant API errors
      const errorMessage = errorData.error?.message || errorData.error || `Assistant API error: ${response.status}`
      
      if (response.status === 401) {
        throw new Error('OpenAI API key invalid. Please check your configuration.')
      } else if (response.status === 429) {
        throw new Error('Too many requests. Please wait a moment and try again.')
      } else if (response.status === 408 || errorMessage.includes('timeout')) {
        throw new Error('Analysis timed out. Try with smaller files or fewer documents.')
      } else {
        throw new Error(errorMessage)
      }
    }

    const result = await response.json()
    console.log('✅ Assistant API call successful, response length:', result.message.length)
    
    return result;
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
      let result;
      
      if (stagedFiles.length > 0) {
        // Use Assistant API (handles PDFs natively, no size limits)
        result = await processFilesWithAssistant(stagedFiles, input);
      } else {
        // Regular text-only chat
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input || "Please help me with construction estimating questions.",
            userId: 'demo-user'
          }),
        });

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
                errorMessage = 'File too large. Please reduce file size or compress images (max recommended: 500MB per file with direct S3 uploads).';
              } else {
                errorMessage = `Server error: ${response.status}`;
              }
            }
          } catch (parseError) {
            // If parsing fails, use status-based message
            if (response.status === 401) {
              errorMessage = 'Invalid OpenAI API key. Please check your API key configuration.';
            } else if (response.status === 413) {
              errorMessage = 'File too large. Please reduce file size or compress images (max recommended: 500MB per file with direct S3 uploads).';
            } else {
              errorMessage = `Server error: ${response.status}`;
            }
          }
          throw new Error(errorMessage);
        }

        result = await response.json();
      }

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
              Upload construction plan <strong>images</strong> (JPG/PNG) or <strong>PDFs</strong> up to 500MB each and I'll analyze them to detect trades, generate scope of work, and create takeoffs in CSI order.
            </p>

                          <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 px-8 py-3 text-base font-medium shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Plan Images
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
                placeholder={stagedFiles.length > 0 ? "Add instructions for analysis..." : "Ask about construction estimating or upload plan images/PDFs..."}
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
            accept="image/*,application/pdf,.pdf"
            onChange={(e) => e.target.files && stageFiles(Array.from(e.target.files))}
            className="hidden"
          />
        </div>
      </div>
    </div>
  )
} 