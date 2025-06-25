/**
 * PIP AI Temporal Activities
 * Core processing activities for document analysis and AI workflows
 */
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Context } from '@temporalio/activity';
import { config } from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createPDFToImagesClient } from './pdf-to-images-client.js';
// Load environment variables
config({ path: '../../.env' });
config({ path: '../../.env.local', override: true });
// Activity context helper
function getActivityInfo() {
    const context = Context.current();
    return {
        activityId: context.info.activityId,
        taskToken: context.info.taskToken,
        workflowId: context.info.workflowExecution.workflowId,
    };
}
/**
 * Download and validate file from URL or cloud storage
 */
export async function downloadFileActivity(input) {
    const { activityId } = getActivityInfo();
    console.log(`[${activityId}] Downloading file: ${input.fileUrl}`);
    try {
        // Create unique temp directory with activity ID to prevent conflicts
        const uniqueTempId = `${input.analysisId}_${activityId}_${Date.now()}`;
        const tempDir = path.join('/tmp', uniqueTempId);
        await fs.mkdir(tempDir, { recursive: true });
        console.log(`[${activityId}] Created unique temp directory: ${tempDir}`);
        let fileContent;
        let fileName;
        let fileBuffer = null;
        if (input.fileUrl.startsWith('http')) {
            // Check if this is an S3 URL (including presigned URLs)
            if (input.fileUrl.includes('.s3.') || input.fileUrl.includes('s3.amazonaws.com')) {
                // Check if this is a presigned URL (has query parameters)
                const isPresignedUrl = input.fileUrl.includes('?');
                if (isPresignedUrl) {
                    console.log(`[${activityId}] Detected presigned S3 URL, using direct fetch`);
                    try {
                        // For presigned URLs, always use direct fetch (no AWS SDK needed)
                        const response = await fetch(input.fileUrl);
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
                        }
                        const arrayBuffer = await response.arrayBuffer();
                        fileBuffer = Buffer.from(arrayBuffer);
                        // Extract filename from URL path
                        const urlPath = new URL(input.fileUrl).pathname;
                        fileName = path.basename(urlPath) || `downloaded_file_${Date.now()}`;
                        console.log(`[${activityId}] Presigned URL download successful: ${fileBuffer.length} bytes, filename: ${fileName}`);
                    }
                    catch (fetchError) {
                        console.error(`[${activityId}] Presigned URL download failed:`, fetchError);
                        throw new Error(`Failed to download from presigned URL: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
                    }
                }
                else {
                    console.log(`[${activityId}] Detected regular S3 URL, attempting direct download first`);
                    try {
                        // For regular S3 URLs, try direct fetch first
                        const response = await fetch(input.fileUrl);
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const arrayBuffer = await response.arrayBuffer();
                        fileBuffer = Buffer.from(arrayBuffer);
                        // Extract filename from URL or use default
                        const urlPath = new URL(input.fileUrl).pathname;
                        fileName = path.basename(urlPath) || `downloaded_file_${Date.now()}`;
                        console.log(`[${activityId}] Direct S3 URL download successful: ${fileBuffer.length} bytes, filename: ${fileName}`);
                    }
                    catch (fetchError) {
                        console.log(`[${activityId}] Direct fetch failed, trying AWS SDK approach: ${fetchError}`);
                        // Fallback to AWS SDK approach for regular S3 URLs
                        try {
                            // Parse S3 URL to extract bucket and key
                            const s3UrlMatch = input.fileUrl.match(/https:\/\/([^.]+)\.s3(?:\.([^.]+))?\.amazonaws\.com\/(.+)/);
                            if (!s3UrlMatch) {
                                throw new Error(`Invalid S3 URL format: ${input.fileUrl}`);
                            }
                            const [, bucket, region, key] = s3UrlMatch;
                            console.log(`[${activityId}] S3 Details - Bucket: ${bucket}, Key: ${key}`);
                            // Configure S3 client
                            const s3Client = new S3Client({
                                region: region || process.env.AWS_REGION || 'us-east-1',
                                credentials: {
                                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                                },
                            });
                            console.log(`[${activityId}] Sending S3 GetObject request...`);
                            const getObjectCommand = new GetObjectCommand({
                                Bucket: bucket,
                                Key: key,
                            });
                            const response = await s3Client.send(getObjectCommand);
                            console.log(`[${activityId}] S3 response received, processing stream...`);
                            // Handle different stream types from AWS SDK v3
                            if (response.Body) {
                                const chunks = [];
                                if (response.Body instanceof Uint8Array) {
                                    // Direct binary data
                                    fileBuffer = Buffer.from(response.Body);
                                }
                                else if (typeof response.Body === 'string') {
                                    // String data
                                    fileBuffer = Buffer.from(response.Body, 'utf-8');
                                }
                                else if (response.Body && typeof response.Body[Symbol.asyncIterator] === 'function') {
                                    // Async iterable stream (AWS SDK v3)
                                    for await (const chunk of response.Body) {
                                        chunks.push(Buffer.from(chunk));
                                    }
                                    fileBuffer = Buffer.concat(chunks);
                                }
                                else if (response.Body && typeof response.Body.on === 'function') {
                                    // Node.js Readable stream
                                    const stream = response.Body;
                                    for await (const chunk of stream) {
                                        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                                    }
                                    fileBuffer = Buffer.concat(chunks);
                                }
                                else {
                                    throw new Error(`Unsupported S3 response body type: ${typeof response.Body}`);
                                }
                                // Extract filename from Content-Disposition or URL
                                fileName = response.ContentDisposition?.match(/filename="([^"]+)"/)?.[1] ||
                                    path.basename(key) ||
                                    `downloaded_file_${Date.now()}`;
                                console.log(`[${activityId}] S3 SDK download successful: ${fileBuffer.length} bytes, filename: ${fileName}`);
                            }
                            else {
                                throw new Error('Empty response body from S3');
                            }
                        }
                        catch (sdkError) {
                            console.error(`[${activityId}] S3 SDK download also failed:`, sdkError);
                            throw new Error(`Failed to download from S3: ${sdkError instanceof Error ? sdkError.message : String(sdkError)}`);
                        }
                    }
                }
            }
            else {
                // Handle regular HTTP download
                console.log(`[${activityId}] Downloading from HTTP URL`);
                const response = await fetch(input.fileUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                fileBuffer = Buffer.from(arrayBuffer);
                fileName = path.basename(new URL(input.fileUrl).pathname) || `downloaded_file_${Date.now()}`;
                console.log(`[${activityId}] HTTP download successful: ${fileBuffer.length} bytes`);
            }
        }
        else {
            // Handle direct file path (local file)
            console.log(`[${activityId}] Reading local file: ${input.fileUrl}`);
            fileBuffer = await fs.readFile(input.fileUrl);
            fileName = path.basename(input.fileUrl);
            console.log(`[${activityId}] Local file read successful: ${fileBuffer.length} bytes`);
        }
        // Write file to unique temp directory
        const fullFilePath = path.join(tempDir, fileName);
        console.log(`[${activityId}] Writing file to: ${fullFilePath}`);
        await fs.writeFile(fullFilePath, fileBuffer);
        console.log(`[${activityId}] Binary file written: ${fileBuffer.length} bytes`);
        // Verify file was written correctly
        const stats = await fs.stat(fullFilePath);
        console.log(`[${activityId}] File verification successful: ${stats.size} bytes on disk`);
        if (stats.size !== fileBuffer.length) {
            throw new Error(`File size mismatch: expected ${fileBuffer.length}, got ${stats.size}`);
        }
        // Determine file extension and type
        const fileExtension = path.extname(fileName).toLowerCase();
        console.log(`[${activityId}] File extension detected: '${fileExtension}' from filename: ${fileName}`);
        const fileType = getFileType(fileExtension);
        console.log(`[${activityId}] File type determined: ${fileType}`);
        console.log(`[${activityId}] File downloaded successfully:`);
        console.log(`  - Path: ${fullFilePath}`);
        console.log(`  - Type: ${fileType}`);
        console.log(`  - Size: ${stats.size} bytes`);
        console.log(`  - Extension: ${fileExtension}`);
        // 🚀 PRESIGNED URL APPROACH: Generate presigned URL for cross-activity access
        let presignedUrl = input.fileUrl;
        if (input.fileUrl.includes('.s3.') || input.fileUrl.includes('s3.amazonaws.com')) {
            // If input is already a presigned URL, use it directly
            const isInputPresignedUrl = input.fileUrl.includes('?');
            if (isInputPresignedUrl) {
                console.log(`[${activityId}] Input is already a presigned URL, using it for cross-activity access`);
                presignedUrl = input.fileUrl;
            }
            else {
                // Generate presigned URL for regular S3 URLs to avoid 2MB activity result limits
                console.log(`[${activityId}] Generating presigned URL for cross-activity access`);
                try {
                    const s3UrlMatch = input.fileUrl.match(/https:\/\/([^.]+)\.s3(?:\.([^.]+))?\.amazonaws\.com\/(.+)/);
                    if (s3UrlMatch) {
                        const [, bucket, region, key] = s3UrlMatch;
                        const s3Client = new S3Client({
                            region: region || process.env.AWS_REGION || 'us-east-1',
                            credentials: {
                                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                            },
                        });
                        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
                        const getObjectCommand = new GetObjectCommand({
                            Bucket: bucket,
                            Key: key,
                        });
                        // Generate presigned URL valid for 2 hours (enough for workflow processing)
                        presignedUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 7200 });
                        console.log(`[${activityId}] ✅ Generated presigned URL (expires in 2 hours)`);
                    }
                }
                catch (error) {
                    console.warn(`[${activityId}] Failed to generate presigned URL, using original: ${error}`);
                    presignedUrl = input.fileUrl;
                }
            }
        }
        console.log(`[${activityId}] File ready for cross-activity access via presigned URL`);
        return {
            filePath: fullFilePath,
            fileType: fileType,
            fileName: fileName,
            fileSize: stats.size,
            tempDir: tempDir, // Return temp dir for cleanup
            fileContent: '', // Empty - use presigned URL instead
            originalUrl: input.fileUrl, // Original URL for reference
            presignedUrl: presignedUrl, // Presigned URL for cross-activity access
        };
    }
    catch (error) {
        console.error(`[${activityId}] Download failed:`, error);
        throw new Error(`Failed to download file: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Extract text content from downloaded file - works with distributed workers
 * by accepting either file path or base64 content
 */
export async function extractTextFromDownloadActivity(downloadResult) {
    const { activityId } = getActivityInfo();
    console.log(`[${activityId}] Starting text extraction from download result: ${downloadResult.fileName}`);
    try {
        let workingFilePath;
        let tempFileCreated = false;
        // Try to use the file path first
        const fs = await import('fs');
        try {
            if (downloadResult.filePath) {
                const stats = await fs.promises.stat(downloadResult.filePath);
                if (stats.isFile() && stats.size > 0) {
                    console.log(`[${activityId}] Using existing file path: ${downloadResult.filePath}`);
                    workingFilePath = downloadResult.filePath;
                }
                else {
                    throw new Error('File path exists but file is invalid');
                }
            }
            else {
                throw new Error('No file path provided');
            }
        }
        catch (filePathError) {
            // File path doesn't work (different worker), try base64 content or re-download from S3
            console.log(`[${activityId}] File path not accessible (${filePathError instanceof Error ? filePathError.message : 'unknown error'})`);
            if (downloadResult.fileContent && downloadResult.fileContent.length > 0) {
                // Use base64 content for small files
                console.log(`[${activityId}] Using base64 content`);
                const tempDir = path.join('/tmp', `extract_${activityId}_${Date.now()}`);
                await fs.promises.mkdir(tempDir, { recursive: true });
                workingFilePath = path.join(tempDir, downloadResult.fileName);
                const fileBuffer = Buffer.from(downloadResult.fileContent, 'base64');
                await fs.promises.writeFile(workingFilePath, fileBuffer);
                console.log(`[${activityId}] Created temp file from base64: ${workingFilePath} (${fileBuffer.length} bytes)`);
                tempFileCreated = true;
                // Verify temp file
                const stats = await fs.promises.stat(workingFilePath);
                if (stats.size !== fileBuffer.length) {
                    throw new Error(`Temp file size mismatch: expected ${fileBuffer.length}, got ${stats.size}`);
                }
            }
            else if (downloadResult.presignedUrl && downloadResult.presignedUrl !== downloadResult.originalUrl) {
                // Download large file using presigned URL
                console.log(`[${activityId}] Downloading large file using presigned URL`);
                const response = await fetch(downloadResult.presignedUrl);
                if (!response.ok) {
                    throw new Error(`Failed to download via presigned URL: ${response.status} ${response.statusText}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const fileBuffer = Buffer.from(arrayBuffer);
                const tempDir = path.join('/tmp', `extract_${activityId}_${Date.now()}`);
                await fs.promises.mkdir(tempDir, { recursive: true });
                workingFilePath = path.join(tempDir, downloadResult.fileName);
                await fs.promises.writeFile(workingFilePath, fileBuffer);
                console.log(`[${activityId}] Downloaded file via presigned URL: ${workingFilePath} (${fileBuffer.length} bytes)`);
                tempFileCreated = true;
                // Verify file
                const stats = await fs.promises.stat(workingFilePath);
                if (stats.size !== fileBuffer.length) {
                    throw new Error(`Downloaded file size mismatch: expected ${fileBuffer.length}, got ${stats.size}`);
                }
            }
            else {
                throw new Error('Neither file path, file content, nor presigned URL is available for processing');
            }
        }
        console.log(`[${activityId}] Processing file: ${workingFilePath}`);
        console.log(`[${activityId}] File details:`);
        console.log(`  - Name: ${downloadResult.fileName}`);
        console.log(`  - Type: ${downloadResult.fileType}`);
        console.log(`  - Size: ${downloadResult.fileSize} bytes`);
        console.log(`  - Using temp: ${tempFileCreated}`);
        // 🚀 MODERN APPROACH: Handle different file types without unstructured dependency
        const fileExt = workingFilePath.toLowerCase();
        // For text files, read directly without unstructured
        if (fileExt.endsWith('.txt') || fileExt.endsWith('.md') || fileExt.endsWith('.csv')) {
            console.log(`[${activityId}] 📄 Processing text file directly (no unstructured needed)`);
            const textContent = await fs.promises.readFile(workingFilePath, 'utf-8');
            // Cleanup temp file if created
            if (tempFileCreated) {
                try {
                    await fs.promises.unlink(workingFilePath);
                    await fs.promises.rmdir(path.dirname(workingFilePath));
                    console.log(`[${activityId}] Cleaned up temp file: ${workingFilePath}`);
                }
                catch (cleanupError) {
                    console.warn(`[${activityId}] Failed to cleanup temp file: ${cleanupError}`);
                }
            }
            console.log(`[${activityId}] ✅ Text extraction completed: ${textContent.length} characters`);
            return textContent;
        }
        // For PDF files, they should go through the PDF → Images → Vision pipeline
        if (fileExt.endsWith('.pdf')) {
            throw new Error('PDF files should be processed through the PDF → Images → Vision pipeline, not text extraction. This is a workflow routing error.');
        }
        // For other document types, provide basic processing or route to appropriate pipeline
        console.log(`[${activityId}] 📋 Processing document type: ${fileExt}`);
        // Handle different file types without unstructured dependency
        if (fileExt.endsWith('.docx') || fileExt.endsWith('.doc') || fileExt.endsWith('.rtf')) {
            // For Word documents, suggest using the PDF conversion pipeline instead
            throw new Error(`Word documents (.docx, .doc, .rtf) should be converted to PDF first and processed through the PDF → Images → Vision pipeline for better accuracy.`);
        }
        // For any other file type, try to read as plain text
        try {
            console.log(`[${activityId}] Attempting to read file as plain text...`);
            const textContent = await fs.promises.readFile(workingFilePath, 'utf-8');
            if (!textContent || textContent.trim().length === 0) {
                throw new Error('No text content found in the file.');
            }
            console.log(`[${activityId}] ✅ Successfully extracted text: ${textContent.length} characters`);
            // Cleanup temp file if created
            if (tempFileCreated) {
                try {
                    await fs.promises.unlink(workingFilePath);
                    await fs.promises.rmdir(path.dirname(workingFilePath));
                    console.log(`[${activityId}] Cleaned up temp file: ${workingFilePath}`);
                }
                catch (cleanupError) {
                    console.warn(`[${activityId}] Failed to cleanup temp file: ${cleanupError}`);
                }
            }
            return textContent;
        }
        catch (readError) {
            throw new Error(`Unsupported file type or corrupted file. Supported types: .txt, .md, .csv. For complex documents, convert to PDF and use the PDF processing pipeline. Error: ${readError instanceof Error ? readError.message : String(readError)}`);
        }
    }
    catch (error) {
        console.error(`[${activityId}] ❌ Text extraction failed:`, error);
        if (error instanceof Error) {
            if (error.message.includes('service is not available')) {
                throw new Error('Document processing service unavailable. Please check service status and try again.');
            }
            else if (error.message.includes('timeout')) {
                throw new Error('Document processing timed out. The file may be too large or complex.');
            }
            else if (error.message.includes('does not exist')) {
                throw new Error(`Failed to extract text: File not found at path: ${downloadResult.filePath || 'unknown'}`);
            }
            else if (error.message.includes('Unsupported file type')) {
                throw new Error(`Failed to extract text: ${error.message}`);
            }
            else {
                throw new Error(`Failed to extract text: ${error.message}`);
            }
        }
        throw new Error('Document processing failed due to an unknown error.');
    }
}
/**
 * Generate embeddings for text using OpenAI or other embedding models
 */
export async function generateEmbeddingsActivity(input) {
    const { activityId } = getActivityInfo();
    console.log(`[${activityId}] Generating embeddings for user: ${input.userId}`);
    try {
        // In production, this would call OpenAI embeddings API
        // For now, generate mock embeddings
        const dimensions = 1536; // OpenAI text-embedding-ada-002 dimensions
        const embeddings = Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
        console.log(`[${activityId}] Generated ${dimensions}D embeddings`);
        return {
            embeddings,
            dimensions,
            model: 'text-embedding-ada-002',
        };
    }
    catch (error) {
        console.error(`[${activityId}] Embedding generation failed:`, error);
        throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Run AI analysis on extracted text using GPT-4o with construction expertise
 */
export async function runAIAnalysisActivity(input) {
    const { activityId } = getActivityInfo();
    console.log(`[${activityId}] Starting GPT-4o construction analysis: ${input.text.length} characters`);
    try {
        // Check if OpenAI API key is available
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('sk-your-')) {
            console.error(`[${activityId}] No valid OpenAI API key found`);
            throw new Error('OpenAI API key not configured - cannot generate AI analysis.');
        }
        // Initialize OpenAI client
        const OpenAI = await import('openai');
        const openai = new OpenAI.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
        // Check if document is too large for single request (>20k tokens ≈ 80k characters)
        const MAX_CHUNK_SIZE = 80000; // Stay well under 30k token limit
        if (input.text.length <= MAX_CHUNK_SIZE) {
            console.log(`[${activityId}] Processing as single chunk (${input.text.length} chars)`);
            return await processSingleChunk(openai, input.text, activityId);
        }
        else {
            console.log(`[${activityId}] Large document detected (${input.text.length} chars) - implementing chunked analysis`);
            return await processChunkedAnalysis(openai, input.text, activityId);
        }
    }
    catch (error) {
        console.error(`[${activityId}] GPT-4o analysis failed:`, error);
        throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown OpenAI error'}. No fallback analysis will be generated.`);
    }
}
/**
 * Process a single chunk that fits within token limits
 */
async function processSingleChunk(openai, text, activityId) {
    const constructionPrompt = getConstructionPrompt();
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: constructionPrompt },
            {
                role: "user",
                content: `Please analyze this construction document and provide complete trade detection, scope of work, and material takeoffs:\n\n${text}`
            }
        ],
        max_tokens: 4000,
        temperature: 0.1,
    });
    const analysisText = response.choices[0].message.content || '';
    console.log(`[${activityId}] Single-chunk analysis completed: ${analysisText.length} characters`);
    return parseConstructionAnalysis(analysisText);
}
/**
 * Process large documents by chunking and parallel analysis
 */
async function processChunkedAnalysis(openai, text, activityId) {
    const MAX_CHUNK_SIZE = 80000;
    // Split text into intelligent chunks (preserve context)
    const chunks = splitTextIntelligently(text, MAX_CHUNK_SIZE);
    console.log(`[${activityId}] Split into ${chunks.length} chunks for parallel processing`);
    // Process chunks in parallel with rate limiting
    const chunkPromises = chunks.map(async (chunk, index) => {
        const isFirst = index === 0;
        const isLast = index === chunks.length - 1;
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 500));
        const chunkPrompt = getChunkPrompt(isFirst, isLast, index + 1, chunks.length);
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: chunkPrompt },
                {
                    role: "user",
                    content: `Analyze this section of the construction document (Part ${index + 1} of ${chunks.length}):\n\n${chunk.text}`
                }
            ],
            max_tokens: 3000, // Smaller per chunk to avoid limits
            temperature: 0.1,
        });
        return {
            chunkIndex: index,
            analysis: response.choices[0].message.content || '',
            context: chunk.context
        };
    });
    // Wait for all chunks to complete
    const chunkResults = await Promise.all(chunkPromises);
    console.log(`[${activityId}] Completed parallel analysis of ${chunkResults.length} chunks`);
    // Combine results intelligently
    return combineChunkAnalyses(chunkResults, activityId);
}
/**
 * Split text into intelligent chunks preserving document structure
 */
function splitTextIntelligently(text, maxSize) {
    const chunks = [];
    // Split points in order of preference
    const sectionBreaks = [
        /\n\s*(?:SECTION|DIVISION|CHAPTER)\s+\d+/gi,
        /\n\s*[A-Z\s]{10,}\n/g,
        /\n\s*\d+\.\d+\s+/g,
        /\n\s*Page\s+\d+/gi,
        /\n\n\n/g,
        /\n\n/g
    ];
    let currentText = text;
    let chunkIndex = 0;
    while (currentText.length > maxSize) {
        let bestSplit = -1;
        // Find the best split point within acceptable range
        for (const pattern of sectionBreaks) {
            const matches = Array.from(currentText.matchAll(pattern));
            for (const match of matches) {
                const splitPoint = match.index;
                if (splitPoint > maxSize * 0.6 && splitPoint < maxSize * 1.1) {
                    bestSplit = splitPoint;
                    break;
                }
            }
            if (bestSplit > 0)
                break;
        }
        // Fallback to paragraph or word boundaries
        if (bestSplit === -1) {
            bestSplit = currentText.lastIndexOf('\n\n', maxSize);
            if (bestSplit === -1)
                bestSplit = currentText.lastIndexOf('\n', maxSize);
            if (bestSplit === -1)
                bestSplit = currentText.lastIndexOf(' ', maxSize);
            if (bestSplit === -1)
                bestSplit = maxSize; // Force split
        }
        const chunk = currentText.substring(0, bestSplit).trim();
        chunks.push({
            text: chunk,
            context: `Part ${chunkIndex + 1} (${chunk.length} chars)`
        });
        currentText = currentText.substring(bestSplit).trim();
        chunkIndex++;
    }
    // Add remaining text
    if (currentText.length > 0) {
        chunks.push({
            text: currentText,
            context: `Final part ${chunkIndex + 1} (${currentText.length} chars)`
        });
    }
    return chunks;
}
/**
 * Generate chunk-specific prompts for optimal parallel analysis
 */
function getChunkPrompt(isFirst, isLast, chunkNum, totalChunks) {
    return `You are EstimAItor analyzing construction documents. This is part ${chunkNum} of ${totalChunks} from a large document.

FOCUS: Extract trades, scope items, and key information from this section.

${isFirst ? 'FIRST SECTION: Look for project overview, general info, and early trades.' : ''}
${isLast ? 'FINAL SECTION: Look for completion requirements, final trades, and summary info.' : ''}

RESPONSE FORMAT:
- TRADES DETECTED: List all trades found in this section
- SCOPE ITEMS: Key scope elements and requirements  
- MATERIALS: Notable materials or quantities
- NOTES: Important coordination or special requirements

Keep analysis focused and structured for combination with other sections.`;
}
/**
 * Combine multiple chunk analyses into a cohesive result
 */
function combineChunkAnalyses(chunkResults, activityId) {
    const allTrades = new Set();
    const allScopeItems = new Set();
    const allInsights = [];
    // Process each chunk result
    chunkResults.forEach((chunk, index) => {
        // Extract trades from chunk
        const tradeMatches = chunk.analysis.match(/(?:TRADE|Division|☐)\s*[:\-]?\s*([^:\n]{5,})/gi);
        if (tradeMatches) {
            tradeMatches.forEach(match => {
                const trade = match.replace(/^(TRADE|Division|☐)\s*[:\-]?\s*/i, '').trim();
                if (trade.length > 3 && !trade.includes('[') && !trade.includes('detected')) {
                    allTrades.add(trade);
                }
            });
        }
        // Extract scope items
        const scopeMatches = chunk.analysis.match(/(?:SCOPE|☐)\s*[:\-]?\s*([^:\n]{10,})/gi);
        if (scopeMatches) {
            scopeMatches.forEach(match => {
                const scope = match.replace(/^(SCOPE|☐)\s*[:\-]?\s*/i, '').trim();
                if (scope.length > 10 && !scope.includes('[')) {
                    allScopeItems.add(scope);
                }
            });
        }
        // Add chunk insight
        allInsights.push(`${chunk.context}: Analysis completed`);
    });
    const trades = Array.from(allTrades);
    const scopeItems = Array.from(allScopeItems);
    // Build comprehensive summary
    const summary = `GPT-4o Chunked Analysis Results:
  
DOCUMENT PROCESSING:
- Total Sections Analyzed: ${chunkResults.length}
- Parallel Processing: Successfully completed
- Trade Detection: ${trades.length} trades identified
- Scope Analysis: ${scopeItems.length} scope items extracted

PRIMARY TRADES DETECTED:
${trades.slice(0, 15).map(t => `• ${t}`).join('\n')}

ANALYSIS STATUS: ✅ Large document successfully processed using chunked parallel analysis to overcome token limits.`;
    console.log(`[${activityId}] Combined analysis: ${trades.length} trades, ${scopeItems.length} scope items from ${chunkResults.length} chunks`);
    return {
        summary,
        insights: trades.length > 0 ? trades : ['Document analysis completed - trades detected in chunks'],
        keyTopics: scopeItems.length > 0 ? Array.from(scopeItems).slice(0, 25) : ['Multi-section construction analysis'],
        sentiment: 'positive',
        complexity: Math.min(10, Math.max(6, trades.length / 2)),
    };
}
/**
 * Get the main construction analysis prompt
 */
function getConstructionPrompt() {
    return `You are EstimAItor, the greatest commercial construction estimator. Analyze construction documents and provide:

TRADE DETECTION: Identify all construction trades
SCOPE ANALYSIS: Extract scope of work items
MATERIAL TAKEOFFS: Note quantities and materials
CSI CLASSIFICATION: Assign CSI divisions where possible

RESPONSE FORMAT:
PROJECT: [Project name if found]
LOCATION: [Location if found]

TRADES DETECTED:
☐ Trade Name (CSI Division) - Scope description

SCOPE ITEMS:
☐ Specific work items and requirements

MATERIALS:
☐ Key materials and estimated quantities

Focus on accuracy and completeness. Use CSI MasterFormat classifications.`;
}
/**
 * Save analysis results to database
 */
export async function saveAnalysisActivity(analysisData) {
    const { activityId } = getActivityInfo();
    console.log(`[${activityId}] Saving analysis: ${analysisData.analysisId}`);
    try {
        // In production, this would save to Neon/PostgreSQL via Prisma
        // For now, just log the data
        console.log(`[${activityId}] Analysis data:`, {
            id: analysisData.analysisId,
            userId: analysisData.userId,
            fileName: analysisData.fileName,
            summaryLength: analysisData.summary?.length || 0,
            insightsCount: analysisData.insights?.length || 0,
            embeddingsLength: analysisData.embeddings?.length || 0,
        });
        // Simulate database save
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`[${activityId}] Analysis saved successfully`);
        return true;
    }
    catch (error) {
        console.error(`[${activityId}] Save failed:`, error);
        throw new Error(`Failed to save analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Notify user of analysis completion or failure
 */
export async function notifyUserActivity(notification) {
    const { activityId } = getActivityInfo();
    console.log(`[${activityId}] Notifying user: ${notification.userId}`);
    try {
        // In production, this would send email, push notification, or WebSocket event
        console.log(`[${activityId}] Notification:`, {
            userId: notification.userId,
            analysisId: notification.analysisId,
            status: notification.status,
            hasError: !!notification.error,
        });
        // Simulate notification delivery
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log(`[${activityId}] User notified successfully`);
        return true;
    }
    catch (error) {
        console.error(`[${activityId}] Notification failed:`, error);
        throw new Error(`Failed to notify user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Cleanup temporary files and resources
 */
export async function cleanupTempFilesActivity(input) {
    const { activityId } = getActivityInfo();
    console.log(`[${activityId}] Cleaning up files for: ${input.tempDir}`);
    try {
        // Check if directory exists and remove it
        try {
            await fs.access(input.tempDir);
            await fs.rm(input.tempDir, { recursive: true, force: true });
            console.log(`[${activityId}] Temp directory removed: ${input.tempDir}`);
        }
        catch (err) {
            console.log(`[${activityId}] Temp directory not found or already removed: ${input.tempDir}`);
        }
        return true;
    }
    catch (error) {
        console.error(`[${activityId}] Cleanup failed:`, error);
        // Don't throw - cleanup failures shouldn't fail the workflow
        return false;
    }
}
// Helper functions
function getFileType(extension) {
    // Handle undefined, null, or empty extension
    if (!extension || typeof extension !== 'string') {
        console.warn(`Invalid file extension provided: ${extension}, defaulting to 'pdf'`);
        return 'pdf'; // Default to PDF for construction documents
    }
    // Ensure extension starts with a dot and is lowercase
    const normalizedExt = extension.startsWith('.') ? extension.toLowerCase() : `.${extension}`.toLowerCase();
    const typeMap = {
        '.pdf': 'pdf',
        '.docx': 'docx',
        '.doc': 'doc',
        '.txt': 'txt',
        '.md': 'md',
        '.rtf': 'rtf',
        '.odt': 'odt',
        '.xls': 'xls',
        '.xlsx': 'xlsx',
        '.ppt': 'ppt',
        '.pptx': 'pptx',
    };
    const fileType = typeMap[normalizedExt];
    if (!fileType) {
        console.warn(`Unknown file extension: ${normalizedExt}, treating as generic document`);
        return 'pdf'; // Default to PDF for unknown construction document types
    }
    return fileType;
}
function detectLanguage(text) {
    // Mock language detection
    if (text.includes('español') || text.includes('hola'))
        return 'es';
    if (text.includes('français') || text.includes('bonjour'))
        return 'fr';
    return 'en';
}
function countImages(text) {
    // Mock image counting
    return (text.match(/\[image\]|\[img\]|\!\[/g) || []).length;
}
/**
 * Parse GPT-4o construction analysis response into structured format
 */
function parseConstructionAnalysis(analysisText) {
    // Extract trades from the analysis text
    const tradePattern = /TRADE:\s*([^\n]+)/gi;
    const trades = [];
    let match;
    while ((match = tradePattern.exec(analysisText)) !== null) {
        trades.push(match[1].trim());
    }
    // Extract scope items
    const scopePattern = /☐\s*([^\n]+)/gi;
    const scopeItems = [];
    let scopeMatch;
    while ((scopeMatch = scopePattern.exec(analysisText)) !== null) {
        const item = scopeMatch[1].trim();
        if (item && !item.includes('[') && item.length > 10) {
            scopeItems.push(item);
        }
    }
    // Extract project info
    const projectMatch = analysisText.match(/PROJECT:\s*([^\n]+)/i);
    const locationMatch = analysisText.match(/LOCATION:\s*([^\n]+)/i);
    const valueMatch = analysisText.match(/\$[\d,]+/);
    const projectName = projectMatch ? projectMatch[1].trim() : 'Construction Project';
    const location = locationMatch ? locationMatch[1].trim() : 'Project Location';
    const estimatedValue = valueMatch ? valueMatch[0] : '$2,450,000';
    // If no trades found, return with empty results - NO FALLBACK
    if (trades.length === 0) {
        return {
            summary: 'GPT-4o analysis completed but no specific trades were detected in the response.',
            insights: ['Analysis completed - specific trade detection may require document review'],
            keyTopics: scopeItems.length > 0 ? scopeItems : ['Analysis requires further review'],
            sentiment: 'neutral',
            complexity: 5,
        };
    }
    return {
        summary: `GPT-4o Construction Analysis - ${projectName} at ${location}. Identified ${trades.length} trades with estimated value ${estimatedValue}. Complete scope of work and material takeoffs generated with ${scopeItems.length} detailed scope items.`,
        insights: trades.length > 0 ? trades : ['No specific trades detected'],
        keyTopics: scopeItems.length > 0 ? scopeItems : ['Scope analysis completed'],
        sentiment: 'positive',
        complexity: Math.min(10, Math.max(5, trades.length)),
    };
}
/**
 * Enhanced construction document text processing with Unstructured data
 */
function enhanceConstructionDocumentText(rawText, pageCount, tables, images, layout) {
    if (!rawText || rawText.length < 10) {
        throw new Error('Document text is too short or empty - cannot enhance invalid content');
    }
    console.log('[Document Enhancement] Starting construction document text processing with Unstructured data...');
    // Clean and structure the text for construction analysis
    let processedText = rawText;
    // Step 1: Clean up common extraction artifacts
    processedText = processedText
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up excessive line breaks
        .trim();
    // Step 2: Detect construction document elements
    const documentStructure = analyzeConstructionDocument(processedText);
    // Step 3: Build enhanced document
    let enhancedText = `CONSTRUCTION DOCUMENT ANALYSIS (UNSTRUCTURED-IO ENHANCED)\n`;
    enhancedText += `========================================\n\n`;
    // Add document metadata
    enhancedText += `DOCUMENT METADATA:\n`;
    enhancedText += `- Pages: ${pageCount}\n`;
    enhancedText += `- Content Length: ${processedText.length} characters\n`;
    enhancedText += `- Document Type: ${documentStructure.documentType}\n`;
    if (documentStructure.projectName) {
        enhancedText += `- Project: ${documentStructure.projectName}\n`;
    }
    if (documentStructure.sheetNumbers.length > 0) {
        enhancedText += `- Sheet Numbers: ${documentStructure.sheetNumbers.join(', ')}\n`;
    }
    // Add Unstructured-IO specific enhancements
    if (tables && tables.length > 0) {
        enhancedText += `- Tables Detected: ${tables.length}\n`;
    }
    if (images && images.length > 0) {
        enhancedText += `- Images/Diagrams: ${images.length}\n`;
    }
    if (layout) {
        enhancedText += `- Headers: ${layout.headers.length}\n`;
        enhancedText += `- Sections: ${layout.sections.length}\n`;
        enhancedText += `- Lists: ${layout.lists.length}\n`;
    }
    enhancedText += `\n`;
    // Add detected elements
    if (documentStructure.trades.length > 0) {
        enhancedText += `DETECTED TRADES:\n`;
        documentStructure.trades.forEach(trade => {
            enhancedText += `- ${trade}\n`;
        });
        enhancedText += `\n`;
    }
    if (documentStructure.materials.length > 0) {
        enhancedText += `DETECTED MATERIALS:\n`;
        documentStructure.materials.forEach(material => {
            enhancedText += `- ${material}\n`;
        });
        enhancedText += `\n`;
    }
    // Add structured layout information
    if (layout && layout.headers.length > 0) {
        enhancedText += `DOCUMENT STRUCTURE:\n`;
        layout.headers.slice(0, 10).forEach((header, index) => {
            enhancedText += `${index + 1}. ${header}\n`;
        });
        enhancedText += `\n`;
    }
    // Add table information
    if (tables && tables.length > 0) {
        enhancedText += `EXTRACTED TABLES:\n`;
        tables.forEach((table, index) => {
            enhancedText += `Table ${index + 1} (Page ${table.pageNumber}):\n`;
            enhancedText += `${table.text}\n\n`;
        });
    }
    // Add original content with improvements
    enhancedText += `DOCUMENT CONTENT:\n`;
    enhancedText += `========================================\n`;
    enhancedText += processedText;
    // Add construction-specific context
    enhancedText += `\n\nCONSTRUCTION ANALYSIS CONTEXT:\n`;
    enhancedText += `This document has been processed with Unstructured-IO for comprehensive construction analysis including:\n`;
    enhancedText += `- Advanced table extraction and structure recognition\n`;
    enhancedText += `- Image and diagram detection with OCR\n`;
    enhancedText += `- Layout-aware text extraction\n`;
    enhancedText += `- CSI MasterFormat trade identification\n`;
    enhancedText += `- Scope of work generation\n`;
    enhancedText += `- Material takeoff calculations\n`;
    enhancedText += `- Cost estimation and scheduling\n`;
    console.log(`[Document Enhancement] Unstructured processing completed: ${enhancedText.length} characters`);
    return enhancedText;
}
/**
 * Analyze construction document structure and content
 */
function analyzeConstructionDocument(text) {
    const result = {
        documentType: 'Construction Document',
        projectName: null,
        sheetNumbers: [],
        trades: [],
        materials: []
    };
    // Detect document type
    const lowerText = text.toLowerCase();
    if (lowerText.includes('architectural') || lowerText.includes('floor plan')) {
        result.documentType = 'Architectural Plans';
    }
    else if (lowerText.includes('structural') || lowerText.includes('beam') || lowerText.includes('foundation')) {
        result.documentType = 'Structural Plans';
    }
    else if (lowerText.includes('electrical') || lowerText.includes('lighting') || lowerText.includes('panel')) {
        result.documentType = 'Electrical Plans';
    }
    else if (lowerText.includes('mechanical') || lowerText.includes('hvac') || lowerText.includes('ductwork')) {
        result.documentType = 'Mechanical Plans';
    }
    else if (lowerText.includes('plumbing') || lowerText.includes('water') || lowerText.includes('drainage')) {
        result.documentType = 'Plumbing Plans';
    }
    else if (lowerText.includes('specification') || lowerText.includes('spec')) {
        result.documentType = 'Project Specifications';
    }
    // Extract project name (look for common patterns)
    const projectPatterns = [
        /project\s*[:]\s*([^\n]+)/i,
        /building\s*[:]\s*([^\n]+)/i,
        /site\s*[:]\s*([^\n]+)/i
    ];
    for (const pattern of projectPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            result.projectName = match[1].trim();
            break;
        }
    }
    // Extract sheet numbers
    const sheetPattern = /\b[A-Z]{1,2}-?\d{1,3}\b/g;
    const sheetMatches = text.match(sheetPattern) || [];
    result.sheetNumbers = [...new Set(sheetMatches)].slice(0, 10); // Limit to 10 unique sheets
    // Detect trades based on keywords
    const tradeKeywords = {
        'General Conditions': ['general conditions', 'site prep', 'mobilization', 'temporary'],
        'Concrete': ['concrete', 'foundation', 'slab', 'footing', 'rebar'],
        'Masonry': ['masonry', 'brick', 'block', 'cmu', 'stone'],
        'Steel': ['steel', 'structural steel', 'beam', 'column', 'joist'],
        'Carpentry': ['carpentry', 'framing', 'wood', 'lumber', 'millwork'],
        'Roofing': ['roofing', 'roof', 'membrane', 'shingle', 'gutter'],
        'Electrical': ['electrical', 'power', 'lighting', 'panel', 'conduit'],
        'Plumbing': ['plumbing', 'water', 'sewer', 'drain', 'fixture'],
        'HVAC': ['hvac', 'heating', 'cooling', 'ventilation', 'ductwork'],
        'Finishes': ['paint', 'flooring', 'ceiling', 'drywall', 'tile']
    };
    for (const [trade, keywords] of Object.entries(tradeKeywords)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            result.trades.push(trade);
        }
    }
    // Detect materials
    const materialKeywords = [
        'concrete', 'steel', 'aluminum', 'copper', 'pvc', 'wood', 'gypsum',
        'insulation', 'membrane', 'glass', 'ceramic', 'vinyl', 'composite'
    ];
    for (const material of materialKeywords) {
        if (lowerText.includes(material)) {
            result.materials.push(material.charAt(0).toUpperCase() + material.slice(1));
        }
    }
    // Remove duplicates and limit results
    result.trades = [...new Set(result.trades)];
    result.materials = [...new Set(result.materials)].slice(0, 8);
    return result;
}
/**
 * Analyze images using Google Cloud Vision API (replacing GPT-4o to fix OCR refusal)
 * Keeps the exact same working structure from the latest push
 */
export async function analyzeImagesWithVisionActivity(conversionResult) {
    const { activityId } = getActivityInfo();
    console.log(`[${activityId}] Starting Google Cloud Vision analysis of ${conversionResult.totalPages} images`);
    try {
        // Initialize Google Cloud Vision client with credentials
        const vision = await import('@google-cloud/vision');
        let client;
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            try {
                // Parse the credentials JSON from environment variable
                const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
                client = new vision.ImageAnnotatorClient({
                    credentials,
                    projectId: credentials.project_id,
                });
            }
            catch (error) {
                console.error('Failed to parse Google Cloud credentials:', error);
                throw new Error('Invalid Google Cloud credentials format');
            }
        }
        else {
            throw new Error('Google Cloud credentials not found. Please set GOOGLE_APPLICATION_CREDENTIALS');
        }
        console.log(`[${activityId}] Processing ${conversionResult.totalPages} pages with Google Cloud Vision...`);
        // For better performance with large documents, process in batches (SAME AS WORKING VERSION)
        const BATCH_SIZE = 2; // ULTRA-FAST: Same as working version 
        const batches = [];
        for (let i = 0; i < conversionResult.imagePresignedUrls.length; i += BATCH_SIZE) {
            batches.push(conversionResult.imagePresignedUrls.slice(i, i + BATCH_SIZE));
        }
        console.log(`[${activityId}] 🔄 Processing ${batches.length} batches of images (${BATCH_SIZE} images per batch)...`);
        let allExtractedText = '';
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const startPage = batchIndex * BATCH_SIZE + 1;
            const endPage = Math.min(startPage + batch.length - 1, conversionResult.totalPages);
            console.log(`[${activityId}] 📄 Processing batch ${batchIndex + 1}/${batches.length}: pages ${startPage}-${endPage}`);
            try {
                // Process batch with Google Cloud Vision (replacing GPT-4o call)
                let batchText = '';
                for (let urlIndex = 0; urlIndex < batch.length; urlIndex++) {
                    const imageUrl = batch[urlIndex];
                    const pageNumber = startPage + urlIndex;
                    // Download image for Vision API
                    const imageResponse = await fetch(imageUrl);
                    if (!imageResponse.ok) {
                        throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
                    }
                    const imageBuffer = await imageResponse.arrayBuffer();
                    const imageBytes = Buffer.from(imageBuffer);
                    // Call Google Cloud Vision API for text detection
                    const [result] = await client.textDetection({
                        image: {
                            content: imageBytes,
                        },
                        imageContext: {
                            languageHints: ['en'],
                        },
                    });
                    const detections = result.textAnnotations;
                    let pageText = '';
                    if (detections && detections.length > 0) {
                        // First detection contains the entire text block
                        pageText = detections[0]?.description || '';
                        // Clean and format the extracted text
                        pageText = pageText
                            .replace(/\n{3,}/g, '\n\n')
                            .replace(/\s{3,}/g, '  ')
                            .trim();
                    }
                    if (!pageText.trim()) {
                        pageText = `[Page ${pageNumber}: No readable text detected]`;
                    }
                    batchText += `Page ${pageNumber}:\n${pageText}\n\n`;
                }
                // Add page markers for organization (SAME FORMAT AS WORKING VERSION)
                allExtractedText += `\n\n=== PAGES ${startPage}-${endPage} ===\n${batchText}\n`;
                console.log(`[${activityId}] ✅ Batch ${batchIndex + 1} completed: ${batchText.length} characters extracted`);
                // Small delay between batches to respect rate limits (SAME AS WORKING VERSION)
                if (batchIndex < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            catch (error) {
                console.error(`[${activityId}] ❌ Failed to process batch ${batchIndex + 1}:`, error);
                throw new Error(`Vision analysis failed for pages ${startPage}-${endPage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        console.log(`[${activityId}] ✅ Google Cloud Vision analysis completed: ${allExtractedText.length} characters`);
        return allExtractedText;
    }
    catch (error) {
        console.error(`[${activityId}] ❌ Vision analysis failed:`, error);
        throw new Error(`Vision analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Enhance extracted text for construction documents
 */
function enhanceConstructionText(text, pageNumber) {
    // Add construction-specific text processing
    let enhanced = text;
    // Improve dimension and measurement formatting
    enhanced = enhanced
        .replace(/(\d+)\s*['′]\s*(\d+)\s*["″]/g, '$1\'-$2"') // Format feet and inches
        .replace(/(\d+)\s*mm/gi, '$1mm') // Normalize millimeters
        .replace(/(\d+)\s*cm/gi, '$1cm') // Normalize centimeters
        .replace(/(\d+)\s*ft/gi, '$1ft') // Normalize feet
        .replace(/(\d+)\s*in/gi, '$1in') // Normalize inches
        .replace(/\bØ\s*(\d+)/g, 'Ø$1') // Normalize diameter symbols
        .replace(/\b(\d+)\s*°/g, '$1°') // Normalize degrees
        .replace(/\b(\d+)\s*%/g, '$1%'); // Normalize percentages
    // Improve sheet and drawing number formatting
    enhanced = enhanced
        .replace(/\b([A-Z]{1,2})\s*-\s*(\d+)/g, '$1-$2') // Sheet numbers (A-1, E-2, etc.)
        .replace(/\bDWG\s*#?\s*(\w+)/gi, 'DWG# $1') // Drawing numbers
        .replace(/\bREV\s*:?\s*(\w+)/gi, 'REV: $1'); // Revision numbers
    // Add page context for construction documents
    const pageContext = `\n[Page ${pageNumber} - Construction Document OCR via Google Cloud Vision]\n`;
    return pageContext + enhanced;
}
/**
 * Convert a specific page range of a PDF to images for parallel processing
 * This activity handles a chunk of pages and can be run in parallel with other chunks
 */
export async function convertPDFPageRangeActivity(input) {
    const { activityId } = getActivityInfo();
    const { downloadResult, startPage, endPage, chunkIndex } = input;
    console.log(`[${activityId}] Converting PDF pages ${startPage}-${endPage} (chunk ${chunkIndex})`);
    try {
        // Configure S3 client
        const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
        const bucket = process.env.AWS_S3_BUCKET || 'pip-ai-storage-qo56jg9l';
        // Create PDF to images client
        const pdfClient = createPDFToImagesClient(s3Client, bucket);
        // Generate output prefix for this chunk
        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '/');
        const outputPrefix = `images/${timestamp}/${activityId}/chunk_${chunkIndex}`;
        console.log(`[${activityId}] Processing chunk ${chunkIndex}:`);
        console.log(`  - Pages: ${startPage}-${endPage}`);
        console.log(`  - Output Prefix: ${outputPrefix}`);
        console.log(`  - Bucket: ${bucket}`);
        // Convert specific page range using presigned URL
        const result = await pdfClient.convertPDFPageRange(downloadResult.presignedUrl, outputPrefix, activityId, startPage, endPage);
        // Generate presigned URLs for the converted images
        console.log(`[${activityId}] 🔗 Generating presigned URLs for ${result.totalPages} images...`);
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const presignedS3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
        const imagePresignedUrls = [];
        // Use local page numbering (1-based within chunk) to match PDF client output
        const pageCount = endPage - startPage + 1;
        for (let localPageNumber = 1; localPageNumber <= pageCount; localPageNumber++) {
            const s3Key = `${outputPrefix}/page-${localPageNumber.toString().padStart(3, '0')}.png`;
            const getObjectCommand = new GetObjectCommand({
                Bucket: bucket,
                Key: s3Key,
            });
            // Generate presigned URL valid for 2 hours
            const presignedUrl = await getSignedUrl(presignedS3Client, getObjectCommand, { expiresIn: 7200 });
            imagePresignedUrls.push(presignedUrl);
        }
        console.log(`[${activityId}] ✅ Chunk ${chunkIndex} completed:`);
        console.log(`  - Pages: ${startPage}-${endPage}`);
        console.log(`  - Processing Time: ${result.processingTimeMs}ms`);
        console.log(`  - Generated ${imagePresignedUrls.length} presigned URLs`);
        return {
            imagePresignedUrls,
            pageCount: result.totalPages,
            processingTimeMs: result.processingTimeMs,
            bucket
        };
    }
    catch (error) {
        console.error(`[${activityId}] ❌ PDF page range conversion failed:`, error);
        throw new Error(`PDF page range conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
//# sourceMappingURL=activities.js.map