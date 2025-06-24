/**
 * PIP AI Temporal Workflows
 * Handles document analysis, AI processing, and workflow orchestration
 */
export declare const analysisProgressSignal: import("@temporalio/workflow").SignalDefinition<[{
    step: string;
    progress: number;
}], string>;
export declare const cancelAnalysisSignal: import("@temporalio/workflow").SignalDefinition<[], "cancelAnalysis">;
export declare const getAnalysisStatusQuery: import("@temporalio/workflow").QueryDefinition<AnalysisStatus, [], string>;
interface AnalysisInput {
    fileUrl: string;
    userId: string;
    fileName: string;
    analysisType: 'document' | 'code' | 'data' | 'image';
    options?: {
        extractImages?: boolean;
        generateSummary?: boolean;
        detectLanguage?: boolean;
    };
}
interface AnalysisStatus {
    step: string;
    progress: number;
    error?: string;
    result?: any;
    canceled?: boolean;
}
interface AnalysisResult {
    analysisId: string;
    status: 'success' | 'failed' | 'canceled';
    extractedText?: string;
    summary?: string;
    insights?: string[];
    embeddings?: number[];
    metadata?: Record<string, any>;
    error?: string;
}
/**
 * Main PIP AI Document Analysis Workflow
 * Orchestrates the complete analysis pipeline with modern PDF → Images → Vision approach
 */
export declare function analyzeDocumentWorkflow(input: AnalysisInput): Promise<AnalysisResult>;
/**
 * Batch Document Analysis Workflow
 * Processes multiple documents in parallel with coordination
 */
export declare function batchAnalyzeWorkflow(inputs: AnalysisInput[]): Promise<AnalysisResult[]>;
export {};
//# sourceMappingURL=workflows.d.ts.map