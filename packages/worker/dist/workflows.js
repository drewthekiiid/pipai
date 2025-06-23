/**
 * PIP AI Temporal Workflows
 * Handles document analysis, AI processing, and workflow orchestration
 */
import { defineQuery, defineSignal, log, proxyActivities, setHandler, sleep } from '@temporalio/workflow';
// Configure activity proxies with timeouts optimized for parallel execution
const { downloadFileActivity, extractTextActivity, generateEmbeddingsActivity, runAIAnalysisActivity, saveAnalysisActivity, notifyUserActivity, cleanupTempFilesActivity } = proxyActivities({
    startToCloseTimeout: '8 minutes', // Increased for large PDF processing
    retry: {
        initialInterval: '1s',
        maximumInterval: '30s',
        maximumAttempts: 3,
    },
});
// Configure longer timeout for AI analysis specifically
const { runAIAnalysisActivity: runLongAIAnalysis } = proxyActivities({
    startToCloseTimeout: '10 minutes', // Extended for GPT-4o processing
    retry: {
        initialInterval: '2s',
        maximumInterval: '45s',
        maximumAttempts: 2, // Fewer retries for expensive AI calls
    },
});
// Workflow signals and queries
export const analysisProgressSignal = defineSignal('analysisProgress');
export const cancelAnalysisSignal = defineSignal('cancelAnalysis');
export const getAnalysisStatusQuery = defineQuery('getAnalysisStatus');
/**
 * Main PIP AI Document Analysis Workflow
 * Orchestrates the complete analysis pipeline
 */
export async function analyzeDocumentWorkflow(input) {
    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let status = {
        step: 'initializing',
        progress: 0,
    };
    // Set up signal handlers
    setHandler(analysisProgressSignal, (update) => {
        status = { ...status, ...update };
        log.info('Analysis progress update', { analysisId, ...update });
    });
    setHandler(cancelAnalysisSignal, () => {
        status.canceled = true;
        log.info('Analysis cancellation requested', { analysisId });
    });
    setHandler(getAnalysisStatusQuery, () => status);
    try {
        log.info('Starting construction document analysis workflow', { analysisId, input });
        // Step 1: Manager Agent - Document Intake
        status = { step: 'Manager Agent: Processing document upload...', progress: 5 };
        if (status.canceled)
            throw new Error('Analysis canceled');
        // Simulate realistic delay for document intake
        await sleep(800);
        status = { step: 'Manager Agent: Validating construction document format...', progress: 10 };
        const downloadResult = await downloadFileActivity({
            fileUrl: input.fileUrl,
            userId: input.userId,
            analysisId,
        });
        // Step 2: File Reader Agent - Document Processing
        status = { step: 'File Reader Agent: Initializing PDF extraction...', progress: 15 };
        if (status.canceled)
            throw new Error('Analysis canceled');
        await sleep(600);
        status = { step: 'File Reader Agent: Extracting text from construction plans...', progress: 20 };
        await sleep(400);
        status = { step: 'File Reader Agent: Analyzing document structure and content...', progress: 25 };
        const textResult = await extractTextActivity(downloadResult.localPath);
        // Step 3 & 4: Trade Mapper + Estimator Agents - PARALLEL PROCESSING
        status = { step: 'Trade Mapper Agent: Scanning for CSI divisions and trades...', progress: 35 };
        if (status.canceled)
            throw new Error('Analysis canceled');
        await sleep(1000);
        status = { step: 'Trade Mapper Agent: Detecting architectural and structural elements...', progress: 45 };
        await sleep(800);
        status = { step: 'Estimator Agent: Initializing parallel analysis pipeline...', progress: 55 };
        // 🚀 PARALLEL EXECUTION: Run embeddings and AI analysis simultaneously
        const [embeddingsResult, aiResult] = await Promise.all([
            // Trade Mapper Agent - Embeddings generation
            (async () => {
                log.info('Starting embeddings generation in parallel', { analysisId });
                return await generateEmbeddingsActivity({
                    text: textResult,
                    userId: input.userId,
                });
            })(),
            // Estimator Agent - AI analysis  
            (async () => {
                log.info('Starting AI analysis in parallel', { analysisId });
                await sleep(300); // Brief delay for UI progression
                status = { step: 'Estimator Agent: Running GPT-4o construction analysis...', progress: 65 };
                await sleep(200);
                status = { step: 'Estimator Agent: Generating trade detection and scope of work...', progress: 75 };
                return await runLongAIAnalysis({
                    text: textResult,
                    analysisType: input.analysisType,
                    metadata: { pageCount: 0, processingTime: 0, processingMethod: 'unstructured-parallel' }, // Simplified metadata
                });
            })()
        ]);
        // Step 5 & 6: Exporter + Manager Agents - PARALLEL COMPLETION
        status = { step: 'Exporter Agent: Structuring analysis results...', progress: 85 };
        if (status.canceled)
            throw new Error('Analysis canceled');
        await sleep(400);
        const analysisData = {
            analysisId,
            userId: input.userId,
            fileName: input.fileName,
            extractedText: textResult,
            summary: aiResult.summary,
            insights: aiResult.insights,
            embeddings: embeddingsResult.embeddings,
            metadata: {
                fileType: downloadResult.fileType,
                fileSize: downloadResult.fileSize,
                processingTime: Date.now(),
                processingMethod: 'unstructured-parallel',
            },
        };
        status = { step: 'Manager Agent: Finalizing deliverables and notifications...', progress: 90 };
        // 🚀 PARALLEL EXECUTION: Save analysis and notify user simultaneously  
        await Promise.all([
            // Exporter Agent - Save to database
            saveAnalysisActivity(analysisData),
            // Manager Agent - User notification
            notifyUserActivity({
                userId: input.userId,
                analysisId,
                status: 'completed',
                summary: aiResult.summary,
            })
        ]);
        // Cleanup and final status (can run cleanup in background)
        const cleanupPromise = cleanupTempFilesActivity({ analysisId });
        status = { step: 'Analysis Complete: Ready for download and export', progress: 100 };
        // Ensure cleanup completes
        await cleanupPromise;
        log.info('Document analysis completed successfully', { analysisId });
        return {
            analysisId,
            status: 'success',
            extractedText: textResult,
            summary: aiResult.summary,
            insights: aiResult.insights,
            embeddings: embeddingsResult.embeddings,
            metadata: analysisData.metadata,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.error('Document analysis failed', { analysisId, error: errorMessage });
        // Update status with error
        status = {
            step: 'failed',
            progress: status.progress,
            error: errorMessage,
        };
        // Attempt cleanup even on failure
        try {
            await cleanupTempFilesActivity({ analysisId });
        }
        catch (cleanupError) {
            log.warn('Cleanup failed', { analysisId, cleanupError });
        }
        // Notify user of failure
        try {
            await notifyUserActivity({
                userId: input.userId,
                analysisId,
                status: 'failed',
                error: errorMessage,
            });
        }
        catch (notifyError) {
            log.warn('Failed to notify user of error', { analysisId, notifyError });
        }
        return {
            analysisId,
            status: status.canceled ? 'canceled' : 'failed',
            error: errorMessage,
        };
    }
}
/**
 * Batch Document Analysis Workflow
 * Processes multiple documents in parallel with coordination
 */
export async function batchAnalyzeWorkflow(inputs) {
    log.info('Starting batch analysis workflow', { count: inputs.length });
    // Process documents in parallel with concurrency limit
    const batchSize = 3; // Process 3 documents at a time
    const results = [];
    for (let i = 0; i < inputs.length; i += batchSize) {
        const batch = inputs.slice(i, i + batchSize);
        const batchPromises = batch.map(input => analyzeDocumentWorkflow(input));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        log.info('Batch completed', {
            batchNumber: Math.floor(i / batchSize) + 1,
            totalBatches: Math.ceil(inputs.length / batchSize),
            completed: results.length,
            total: inputs.length
        });
    }
    return results;
}
//# sourceMappingURL=workflows.js.map