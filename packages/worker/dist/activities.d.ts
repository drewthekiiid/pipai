/**
 * PIP AI Temporal Activities
 * Core processing activities for document analysis and AI workflows
 */
interface DownloadFileInput {
    fileUrl: string;
    userId: string;
    analysisId: string;
}
interface DownloadFileResult {
    filePath: string;
    fileType: string;
    fileName: string;
    fileSize: number;
    tempDir: string;
    fileContent: string;
    originalUrl: string;
    presignedUrl: string;
}
interface GenerateEmbeddingsInput {
    text: string;
    userId: string;
}
interface GenerateEmbeddingsResult {
    embeddings: number[];
    dimensions: number;
    model: string;
}
interface AIAnalysisInput {
    text: string;
    analysisType: 'document' | 'code' | 'data' | 'image';
    metadata?: Record<string, any>;
}
interface AIAnalysisResult {
    summary: string;
    insights: string[];
    keyTopics: string[];
    sentiment?: string;
    complexity?: number;
}
/**
 * Download and validate file from URL or cloud storage
 */
export declare function downloadFileActivity(input: DownloadFileInput): Promise<DownloadFileResult>;
/**
 * Extract text content from downloaded file - works with distributed workers
 * by accepting either file path or base64 content
 */
export declare function extractTextFromDownloadActivity(downloadResult: DownloadFileResult): Promise<string>;
/**
 * Generate embeddings for text using OpenAI or other embedding models
 */
export declare function generateEmbeddingsActivity(input: GenerateEmbeddingsInput): Promise<GenerateEmbeddingsResult>;
/**
 * Run AI analysis on extracted text using GPT-4o with construction expertise
 */
export declare function runAIAnalysisActivity(input: AIAnalysisInput): Promise<AIAnalysisResult>;
/**
 * Save analysis results to database
 */
export declare function saveAnalysisActivity(analysisData: any): Promise<boolean>;
/**
 * Notify user of analysis completion or failure
 */
export declare function notifyUserActivity(notification: {
    userId: string;
    analysisId: string;
    status: 'completed' | 'failed';
    summary?: string;
    error?: string;
}): Promise<boolean>;
/**
 * Cleanup temporary files and resources
 */
export declare function cleanupTempFilesActivity(input: {
    tempDir: string;
}): Promise<boolean>;
/**
 * Convert PDF to images for GPT-4o vision processing
 * This is the modern ChatGPT approach: PDF → Images → Vision Model
 */
export declare function convertPDFToImagesActivity(downloadResult: DownloadFileResult): Promise<{
    imagePresignedUrls: string[];
    totalPages: number;
    processingTimeMs: number;
    bucket: string;
}>;
/**
 * Analyze images using GPT-4o vision model
 * Uses presigned URLs directly with OpenAI Vision API
 */
export declare function analyzeImagesWithVisionActivity(conversionResult: {
    imagePresignedUrls: string[];
    totalPages: number;
    bucket: string;
}): Promise<string>;
export {};
//# sourceMappingURL=activities.d.ts.map