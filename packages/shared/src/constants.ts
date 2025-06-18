// Application constants
export const APP_NAME = "PIP AI"
export const APP_VERSION = "0.1.0"

// File upload constants
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
] as const

// API endpoints
export const API_ENDPOINTS = {
  UPLOAD: "/api/upload",
  STREAM: "/api/stream",
  ANALYSIS: "/api/analysis",
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
