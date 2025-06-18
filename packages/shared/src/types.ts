import { z } from "zod"

// File upload schemas
export const FileUploadSchema = z.object({
  id: z.string(),
  filename: z.string(),
  size: z.number(),
  type: z.string(),
  url: z.string().optional(),
  status: z.enum(["uploading", "processing", "completed", "failed"]),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type FileUpload = z.infer<typeof FileUploadSchema>

// Analysis result schemas
export const AnalysisResultSchema = z.object({
  id: z.string(),
  fileId: z.string(),
  trade: z.string().optional(),
  extractedText: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  createdAt: z.date(),
})

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

// User schemas
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(["user", "admin"]),
  organizationId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type User = z.infer<typeof UserSchema>
