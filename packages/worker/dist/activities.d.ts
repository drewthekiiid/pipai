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
    localPath: string;
    fileType: string;
    fileSize: number;
    hash: string;
}
interface ExtractTextInput {
    filePath: string;
    fileType: string;
    options?: {
        extractImages?: boolean;
        detectLanguage?: boolean;
    };
}
interface ExtractTextResult {
    extractedText: string;
    metadata: {
        pageCount?: number;
        language?: string;
        imageCount?: number;
        processingTime: number;
    };
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
 * Extract text content from various file formats
 */
export declare function extractTextActivity(input: ExtractTextInput): Promise<ExtractTextResult>;
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
    analysisId: string;
}): Promise<boolean>;
export {};
//# sourceMappingURL=activities.d.ts.map