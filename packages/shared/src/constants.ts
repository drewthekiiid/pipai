// Application constants
export const APP_NAME = "PIP AI"
export const APP_VERSION = "0.1.0"

// File upload constants - Updated for direct S3 uploads
export const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB (direct S3 uploads)
export const MAX_TOTAL_SIZE = 1000 * 1024 * 1024 // 1GB total

export type FileUpload = {
  id: string
  name: string
  size: number
  type: string
  url?: string
}

// API endpoints - Updated for direct S3 uploads
export const API_ENDPOINTS = {
  UPLOAD_PRESIGNED_URL: "/api/upload/presigned-url",
  UPLOAD_COMPLETE: "/api/upload/complete", 
  STREAM: "/api/stream",
  ANALYSIS: "/api/analysis",
  CHAT: "/api/chat",
  ASSISTANT: "/api/assistant",
} as const

// Trade types
export const TRADE_TYPES = [
  "Drywall",
  "Electrical",
  "Plumbing", 
  "HVAC",
  "Flooring",
  "Roofing",
  "Painting",
  "Carpentry",
  "Other",
] as const

export type TradeType = typeof TRADE_TYPES[number]
