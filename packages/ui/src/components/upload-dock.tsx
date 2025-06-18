"use client"

import React from "react"
import { cn } from "../lib/utils"
import { designTokens } from "../design-tokens"

interface UploadDockProps {
  className?: string
  onFileSelect?: (files: FileList) => void
  accept?: string
  multiple?: boolean
  children?: React.ReactNode
}

export function UploadDock({
  className,
  onFileSelect,
  accept = ".pdf,.jpg,.jpeg,.png,.webp,.txt",
  multiple = true,
  children,
}: UploadDockProps) {
  const [isDragOver, setIsDragOver] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (e.dataTransfer.files && onFileSelect) {
      onFileSelect(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onFileSelect) {
      onFileSelect(e.target.files)
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        "border-2 border-dashed rounded-lg",
        "transition-colors duration-200 cursor-pointer",
        "hover:border-slate-400",
        isDragOver ? "border-slate-500 bg-slate-50" : "border-slate-300",
        className
      )}
      style={{
        minHeight: designTokens.components.uploadDock.minHeight,
        padding: designTokens.components.uploadDock.padding,
        gap: designTokens.components.uploadDock.gap,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {children || (
        <>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-slate-600"
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
            <div>
              <p className="text-sm font-medium text-slate-700">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-slate-500 mt-1">
                PDF, images, and text files supported
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
