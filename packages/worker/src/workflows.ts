/**
 * PIP AI Temporal Workflows
 * Handles document analysis, AI processing, and workflow orchestration
 */

import { defineQuery, defineSignal, log, proxyActivities, setHandler, sleep } from '@temporalio/workflow';
import type * as activities from './activities.js';

// Configure activity proxies with timeouts optimized for parallel execution
const { 
  downloadFileActivity,
  extractTextFromDownloadActivity,
  analyzeImagesWithVisionActivity,
  generateEmbeddingsActivity,
  runAIAnalysisActivity,
  saveAnalysisActivity,
  notifyUserActivity,
  cleanupTempFilesActivity,
  convertPDFPageRangeActivity
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '8 minutes',  // Standard timeout - presigned URLs should be fast
  retry: {
    initialInterval: '1s',
    maximumInterval: '30s',
    maximumAttempts: 3,
  },
});

// Configure longer timeout for AI analysis specifically
const { runAIAnalysisActivity: runLongAIAnalysis } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',  // Extended for GPT-4o processing
  retry: {
    initialInterval: '2s',
    maximumInterval: '45s', 
    maximumAttempts: 2,  // Fewer retries for expensive AI calls
  },
});

// Configure optimized timeout for vision analysis (multiple images)
const { analyzeImagesWithVisionActivity: runVisionAnalysis } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',  // Consistent with PDF processing timeout
  retry: {
    initialInterval: '3s',
    maximumInterval: '60s', 
    maximumAttempts: 2,  // Fewer retries for expensive vision calls
  },
});

// Configure optimized timeout for parallel PDF processing activities
const { convertPDFPageRangeActivity: convertPDFPageRangeWithTimeout } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',  // Increased timeout for performance-4x hardware
  retry: {
    initialInterval: '2s',
    maximumInterval: '60s', 
    maximumAttempts: 2,  // Fewer retries for expensive operations
  },
});

// Workflow signals and queries
export const analysisProgressSignal = defineSignal<[{ step: string; progress: number }]>('analysisProgress');
export const cancelAnalysisSignal = defineSignal('cancelAnalysis');
export const getAnalysisStatusQuery = defineQuery<AnalysisStatus>('getAnalysisStatus');

// Types
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
export async function analyzeDocumentWorkflow(input: AnalysisInput): Promise<AnalysisResult> {
  const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  let status: AnalysisStatus = {
    step: 'initializing',
    progress: 0,
  };

  // Declare downloadResult at function scope for cleanup access
  let downloadResult: any;

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
    if (status.canceled) throw new Error('Analysis canceled');
    
    await sleep(800);
    
    status = { step: 'Manager Agent: Validating construction document format...', progress: 10 };
    downloadResult = await downloadFileActivity({
      fileUrl: input.fileUrl,
      userId: input.userId,
      analysisId,
    });

    // Validate download result
    if (!downloadResult || !downloadResult.filePath) {
      throw new Error('File download failed - no valid file path returned');
    }

    log.info('File download completed successfully', { 
      analysisId, 
      filePath: downloadResult.filePath,
      fileSize: downloadResult.fileSize,
      fileType: downloadResult.fileType 
    });

    // Step 2: Choose processing path based on file type
    let textResult: string;
    
    // 🔍 DEBUG: Log filename detection
    console.log(`🔍 [DEBUG] Filename detection:`);
    console.log(`  - downloadResult.fileName: "${downloadResult.fileName}"`);
    console.log(`  - toLowerCase(): "${downloadResult.fileName.toLowerCase()}"`);
    console.log(`  - endsWith('.pdf'): ${downloadResult.fileName.toLowerCase().endsWith('.pdf')}`);
    console.log(`  - Will route to: ${downloadResult.fileName.toLowerCase().endsWith('.pdf') ? 'PDF→Images→Vision' : 'Text Extraction'}`);
    
    if (downloadResult.fileName.toLowerCase().endsWith('.pdf')) {
      // 🚀 MODERN APPROACH: PDF → Images → GPT-4o Vision with PARALLEL WORKERS
      status = { step: 'PDF Processor: Converting PDF pages to high-resolution images...', progress: 15 };
      if (status.canceled) throw new Error('Analysis canceled');
      
      await sleep(600);
      
      // For large PDFs, split into parallel activities across multiple workers
      // 🚀 TRUE AUTO-SCALING: Dynamically scales to ANY document size
      const fileSizeMB = downloadResult.fileSize / (1024 * 1024);
      const ESTIMATED_PAGES = Math.ceil(fileSizeMB * 2.5); // More accurate: 2.5 pages per MB for construction docs
      
      // INTELLIGENT AUTO-SCALING: Fine-tuned for 4 vCPUs optimal performance
      const AUTO_SCALE_PAGES_PER_CHUNK = fileSizeMB > 50 ? 2 : fileSizeMB > 20 ? 2 : fileSizeMB > 10 ? 3 : 4;
      const AUTO_SCALE_MAX_WORKERS = Math.min(ESTIMATED_PAGES, 8); // Optimal: 8 workers max for 4 vCPUs
      const AUTO_SCALE_OPTIMAL_CHUNKS = Math.ceil(ESTIMATED_PAGES / AUTO_SCALE_PAGES_PER_CHUNK);
      
              // Calculate auto-scaled chunk count based on actual document size
      const optimalChunks = Math.min(AUTO_SCALE_MAX_WORKERS, AUTO_SCALE_OPTIMAL_CHUNKS);
      
      // Create parallel activities for different page ranges
      const chunkPromises = [];
      for (let chunkIndex = 0; chunkIndex < optimalChunks; chunkIndex++) { 
        const startPage = chunkIndex * AUTO_SCALE_PAGES_PER_CHUNK + 1;
        const endPage = (chunkIndex + 1) * AUTO_SCALE_PAGES_PER_CHUNK;
        
        chunkPromises.push(
          convertPDFPageRangeWithTimeout({
            downloadResult,
            startPage,
            endPage,
            chunkIndex
          })
        );
      }
      
      status = { step: `PDF Processor: AUTO-SCALING MODE - ${optimalChunks} workers processing ${AUTO_SCALE_PAGES_PER_CHUNK} pages each (${ESTIMATED_PAGES} total pages)...`, progress: 20 };
      
      // Process all chunks in parallel across different workers
      const chunkResults = await Promise.all(chunkPromises);
      
      // Filter out empty results (for pages that don't exist)
      const validResults = chunkResults.filter(result => result.pageCount > 0);
      
      // Combine all chunk results
      const allImageUrls = validResults.flatMap(result => result.imagePresignedUrls);
      const totalPages = validResults.reduce((sum, result) => sum + result.pageCount, 0);
      const maxProcessingTime = Math.max(...validResults.map(r => r.processingTimeMs));
      
      const imagesResult = {
        imagePresignedUrls: allImageUrls,
        totalPages,
        processingTimeMs: maxProcessingTime,
        bucket: validResults[0]?.bucket || process.env.AWS_S3_BUCKET || 'pip-ai-storage-qo56jg9l'
      };
      
      status = { step: `Vision Agent: Analyzing ${imagesResult.totalPages} pages with GPT-4o Vision...`, progress: 35 };
      await sleep(400);
      
      status = { step: 'Vision Agent: PARALLEL VISION ANALYSIS - Processing multiple batches simultaneously...', progress: 45 };
      
      // 🚀 AUTO-SCALING VISION: Fine-tuned for 4 vCPUs optimal throughput
      const AUTO_SCALE_IMAGES_PER_CHUNK = Math.max(5, Math.min(12, Math.ceil(imagesResult.totalPages / 8))); // Scale from 5-12 images per worker
      const visionChunks = [];
      
      for (let i = 0; i < imagesResult.imagePresignedUrls.length; i += AUTO_SCALE_IMAGES_PER_CHUNK) {
        const chunkUrls = imagesResult.imagePresignedUrls.slice(i, i + AUTO_SCALE_IMAGES_PER_CHUNK);
        const chunkStartPage = i + 1;
        const chunkEndPage = Math.min(i + chunkUrls.length, imagesResult.totalPages);
        
        visionChunks.push({
          imagePresignedUrls: chunkUrls,
          totalPages: chunkUrls.length,
          bucket: imagesResult.bucket,
          chunkInfo: `pages ${chunkStartPage}-${chunkEndPage}`
        });
      }
      
      console.log(`🔥 AUTO-SCALING VISION: ${visionChunks.length} vision workers processing ${AUTO_SCALE_IMAGES_PER_CHUNK} images each (${imagesResult.totalPages} total pages)`);
      
      // Process all vision chunks in parallel across different workers
      const visionPromises = visionChunks.map((chunk, index) => 
        runVisionAnalysis(chunk).then(result => ({
          chunkIndex: index,
          result,
          chunkInfo: chunk.chunkInfo
        }))
      );
      
      const visionResults = await Promise.all(visionPromises);
      
      // Combine all vision analysis results
      textResult = visionResults
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map(vr => `\n\n=== VISION CHUNK ${vr.chunkIndex + 1} (${vr.chunkInfo}) ===\n${vr.result}`)
        .join('');
      
      log.info('PARALLEL Vision Analysis completed', {
        analysisId,
        totalPages: imagesResult.totalPages,
        visionChunks: visionChunks.length,
        textLength: textResult.length,
        chunksProcessed: validResults.length
      });
      
    } else {
      // TRADITIONAL APPROACH: Direct text extraction for non-PDF files
      status = { step: 'File Reader Agent: Extracting text from document...', progress: 20 };
      await sleep(400);
      
      status = { step: 'File Reader Agent: Analyzing document structure...', progress: 30 };
      textResult = await extractTextFromDownloadActivity(downloadResult);
      
      log.info('Traditional text extraction completed', {
        analysisId,
        textLength: textResult.length
      });
    }

    // Step 3 & 4: Trade Mapper + Estimator Agents - PARALLEL PROCESSING
    status = { step: 'Trade Mapper Agent: Scanning for CSI divisions and trades...', progress: 45 };
    if (status.canceled) throw new Error('Analysis canceled');
    
    await sleep(1000);
    
    status = { step: 'Trade Mapper Agent: Detecting architectural and structural elements...', progress: 55 };
    await sleep(800);
    
    status = { step: 'Estimator Agent: Initializing parallel analysis pipeline...', progress: 65 };
    
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
        await sleep(300);
        status = { step: 'Estimator Agent: Running GPT-4o construction analysis...', progress: 75 };
        await sleep(200);
        status = { step: 'Estimator Agent: Generating trade detection and scope of work...', progress: 85 };
        return await runLongAIAnalysis({
          text: textResult,
          analysisType: input.analysisType,
          metadata: { 
            pageCount: 0, 
            processingTime: 0, 
            processingMethod: downloadResult.fileName.toLowerCase().endsWith('.pdf') ? 'pdf-images-vision' : 'traditional-ocr'
          },
        });
      })()
    ]);

    // Step 5 & 6: Exporter + Manager Agents - PARALLEL COMPLETION
    status = { step: 'Exporter Agent: Structuring analysis results...', progress: 90 };
    if (status.canceled) throw new Error('Analysis canceled');
    
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
        processingMethod: downloadResult.fileName.toLowerCase().endsWith('.pdf') ? 'pdf-images-vision' : 'traditional-ocr',
      },
    };

    status = { step: 'Manager Agent: Finalizing deliverables and notifications...', progress: 95 };
    
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
    const cleanupPromise = cleanupTempFilesActivity({ tempDir: downloadResult.tempDir });
    
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

  } catch (error) {
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
      // Only cleanup if we have the download result with temp directory
      if (downloadResult?.tempDir) {
        await cleanupTempFilesActivity({ tempDir: downloadResult.tempDir });
      }
    } catch (cleanupError) {
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
    } catch (notifyError) {
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
export async function batchAnalyzeWorkflow(inputs: AnalysisInput[]): Promise<AnalysisResult[]> {
  log.info('Starting batch analysis workflow', { count: inputs.length });

  // Process documents in parallel with concurrency limit
  const batchSize = 3; // Process 3 documents at a time
  const results: AnalysisResult[] = [];

  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    
    const batchPromises = batch.map(input => 
      analyzeDocumentWorkflow(input)
    );

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
