/**
 * PDF to Images Client for PIP AI
 * Uses pdftoppm + ImageMagick via TypeScript child processes
 * Keeps codebase language unified while using best-in-class tools
 */

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

interface PDFToImagesConfig {
  s3Client: S3Client;
  bucket: string;
  tempDir?: string;
  dpi?: number;
  maxHeight?: number;
  format?: 'png' | 'jpg';
}

interface ImageResult {
  pageNumber: number;
  s3Key: string;
  s3Url: string;
  width: number;
  height: number;
  fileSize: number;
}

interface PDFConversionResult {
  totalPages: number;
  images: ImageResult[];
  processingTimeMs: number;
  totalSizeBytes: number;
}

export class PDFToImagesClient {
  private s3Client: S3Client;
  private bucket: string;
  private tempDir: string;
  private dpi: number;
  private maxHeight: number;
  private format: 'png' | 'jpg';

  constructor(config: PDFToImagesConfig) {
    this.s3Client = config.s3Client;
    this.bucket = config.bucket;
    this.tempDir = config.tempDir || '/tmp';
    this.dpi = config.dpi || 200; // ChatGPT's sweet spot: 150-200 DPI for OCR clarity + speed
    this.maxHeight = config.maxHeight || 1998; // Under 2000px limit for GPT-4o
    this.format = config.format || 'png';
  }

  /**
   * Convert PDF to images and upload back to S3
   * Uses parallel processing for large PDFs by splitting into page ranges
   * Accepts presigned URL to avoid S3 authentication in activities
   */
  async convertPDFToImages(
    pdfPresignedUrl: string,
    outputPrefix: string,
    activityId: string
  ): Promise<PDFConversionResult> {
    const startTime = Date.now();
    const workDir = path.join(this.tempDir, 'pdf_conversion_' + activityId + '_' + Date.now());
    
    try {
      // Create working directory
      await fs.mkdir(workDir, { recursive: true });
      console.log('📁 Created work directory: ' + workDir);
      
      // Download PDF using presigned URL
      console.log('📥 Downloading PDF from presigned URL');
      const pdfPath = await this.downloadPDFFromPresignedUrl(pdfPresignedUrl, workDir);
      
      // Get total page count first
      const totalPages = await this.getPDFPageCount(pdfPath);
      console.log('📄 PDF has ' + totalPages + ' pages');
      
      // For large PDFs (>5 pages), use parallel processing
      let rawImageFiles: string[];
      if (totalPages > 5) {
        console.log('🚀 Using parallel processing for ' + totalPages + ' pages...');
        rawImageFiles = await this.convertWithParallelProcessing(pdfPath, workDir, totalPages);
      } else {
        console.log('🔄 Converting PDF to images at ' + this.dpi + ' DPI...');
        rawImageFiles = await this.convertWithPdftoppm(pdfPath, workDir);
      }
      
      // Optimize images with ImageMagick if needed
      console.log('🎨 Optimizing images with ImageMagick...');
      const optimizedImages = await this.optimizeWithImageMagick(rawImageFiles, workDir);
      
      // Upload to S3
      console.log('📤 Uploading ' + optimizedImages.length + ' optimized images to S3...');
      const images = await this.uploadImagesToS3(optimizedImages, outputPrefix);
      
      const processingTimeMs = Date.now() - startTime;
      const totalSizeBytes = images.reduce((sum, img) => sum + img.fileSize, 0);
      
      console.log('✅ PDF conversion completed: ' + images.length + ' pages in ' + processingTimeMs + 'ms');
      console.log('📊 Total size: ' + (totalSizeBytes / 1024 / 1024).toFixed(2) + 'MB');
      
      return {
        totalPages: images.length,
        images,
        processingTimeMs,
        totalSizeBytes
      };
      
    } finally {
      // Cleanup temp directory
      try {
        await fs.rm(workDir, { recursive: true, force: true });
        console.log('🧹 Cleaned up temp directory: ' + workDir);
      } catch (error) {
        console.warn('⚠️ Failed to cleanup temp directory: ' + error);
      }
    }
  }

  /**
   * Download PDF from presigned URL to local file
   */
  private async downloadPDFFromPresignedUrl(presignedUrl: string, workDir: string): Promise<string> {
    const response = await fetch(presignedUrl);
    
    if (!response.ok) {
      throw new Error('Failed to download PDF: ' + response.status + ' ' + response.statusText);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfPath = path.join(workDir, 'input.pdf');
    
    await fs.writeFile(pdfPath, buffer);
    
    console.log('✅ Downloaded PDF: ' + buffer.length + ' bytes');
    return pdfPath;
  }

  /**
   * 🚀 OPTIMIZATION: Get shared PDF file to avoid redundant downloads across parallel chunks
   * Downloads once and caches for reuse by all chunks with proper locking
   */
  private async getSharedPDF(presignedUrl: string, activityId: string): Promise<string> {
    // Create shared cache directory based on presigned URL hash (all chunks share same PDF)
    const crypto = await import('crypto');
    const urlHash = crypto.createHash('md5').update(presignedUrl).digest('hex').substring(0, 8);
    const sharedCacheDir = path.join(this.tempDir, 'shared_pdf_' + urlHash);
    const sharedPdfPath = path.join(sharedCacheDir, 'shared_input.pdf');
    const lockPath = path.join(sharedCacheDir, 'download.lock');
    
    // Create shared directory with proper permissions
    await fs.mkdir(sharedCacheDir, { recursive: true });
    
    // Try to acquire lock with retries for race condition handling
    let lockAcquired = false;
    
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        // Check if PDF already exists and is complete
        const stats = await fs.stat(sharedPdfPath);
        if (stats.size > 1000000) { // Must be at least 1MB (reasonable PDF size)
          console.log('📋 Using cached PDF: ' + sharedPdfPath + ' (' + stats.size + ' bytes)');
          return sharedPdfPath;
        }
      } catch {
        // PDF doesn't exist yet
      }
      
      try {
        // Try to acquire exclusive lock
        await fs.writeFile(lockPath, activityId, { flag: 'wx' });
        console.log('🔒 Acquired download lock for activity ' + activityId);
        lockAcquired = true;
        break;
      } catch (lockError) {
        // Lock exists, wait briefly and retry
        console.log('⏳ Waiting for download by another chunk (attempt ' + (attempt + 1) + '/30)...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        if (attempt === 29) {
          // Force break lock after 30 seconds
          try {
            await fs.unlink(lockPath);
            console.log('🔓 Force-released stale download lock');
          } catch {
            // Ignore error
          }
        }
      }
    }

    if (!lockAcquired) {
      throw new Error('Failed to acquire download lock after 30 attempts');
    }

    try {
      // Double-check if another process downloaded while we were waiting
      try {
        const stats = await fs.stat(sharedPdfPath);
        if (stats.size > 1000000) {
          console.log('📋 Another chunk downloaded PDF: ' + sharedPdfPath + ' (' + stats.size + ' bytes)');
          return sharedPdfPath;
        }
      } catch {
        // PDF still doesn't exist, we need to download
      }

      // We have the lock, download the PDF
      console.log('📥 Downloading PDF from presigned URL (will be cached for other chunks)');
      
      // Use atomic write to prevent corruption
      const tempPdfPath = sharedPdfPath + '.tmp.' + Date.now();
      
      // Download PDF
      const response = await fetch(presignedUrl);
      if (!response.ok) {
        throw new Error('Failed to download PDF: ' + response.status + ' ' + response.statusText);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Write to temp file first, then atomically move to final location
      await fs.writeFile(tempPdfPath, buffer);
      await fs.rename(tempPdfPath, sharedPdfPath);
      
      console.log('✅ Downloaded PDF to shared cache: ' + buffer.length + ' bytes');
      return sharedPdfPath;
      
    } finally {
      // Always release the lock if we acquired it
      if (lockAcquired) {
        try {
          await fs.unlink(lockPath);
          console.log('🔓 Released download lock');
        } catch {
          // Ignore error if lock was already removed
        }
      }
    }
  }

  /**
   * Download PDF from S3 to local file (legacy method)
   */
  private async downloadPDFFromS3(s3Key: string, workDir: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key
    });
    
    const response = await this.s3Client.send(command);
    const pdfPath = path.join(workDir, 'input.pdf');
    
    if (response.Body) {
      const chunks: Buffer[] = [];
      const stream = response.Body as NodeJS.ReadableStream;
      
      for await (const chunk of stream) {
        chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
      }
      
      const buffer = Buffer.concat(chunks);
      await fs.writeFile(pdfPath, buffer);
      
      console.log('✅ Downloaded PDF: ' + buffer.length + ' bytes');
      return pdfPath;
    }
    
    throw new Error('Failed to download PDF from S3');
  }

  /**
   * Convert PDF to images using pdftoppm via TypeScript child process
   */
  private async convertWithPdftoppm(pdfPath: string, workDir: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const outputPrefix = path.join(workDir, 'page');
      const args = [
        pdfPath,
        outputPrefix,
        '-' + this.format,
        '-r', this.dpi.toString()
      ];
      
      console.log('🔧 Running: pdftoppm ' + args.join(' '));
      
      const process = spawn('pdftoppm', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error('pdftoppm failed with code ' + code + ': ' + stderr));
          return;
        }
        
        try {
          // Find all generated image files
          const files = await fs.readdir(workDir);
          const imageFiles = files
            .filter(file => file.startsWith('page-') && file.endsWith('.' + this.format))
            .map(file => path.join(workDir, file))
            .sort(); // Ensure proper page order
          
          console.log('✅ Generated ' + imageFiles.length + ' image files');
          resolve(imageFiles);
        } catch (error) {
          reject(error);
        }
      });
      
      process.on('error', (error) => {
        reject(new Error('Failed to start pdftoppm: ' + error.message));
      });
    });
  }

  /**
   * 🎯 CHATGPT-STYLE: Minimal smart preprocessing that helps Vision API without destroying text
   * Based on analysis of how ChatGPT processes PDFs effectively
   */
  private async smartMinimalPreprocessing(imageFiles: string[], workDir: string): Promise<string[]> {
    const processedFiles: string[] = [];
    
    // Process images in parallel for speed
    const processPromises = imageFiles.map(async (imagePath, index) => {
      const fileName = path.basename(imagePath);
      const processedPath = path.join(workDir, 'smart_' + fileName);
      
      try {
        await this.applyMinimalSmartProcessing(imagePath, processedPath);
        console.log('🎯 Smart-processed: ' + fileName);
        return processedPath;
      } catch (error) {
        console.warn('⚠️ Failed to process ' + fileName + ', using original: ' + error);
        return imagePath; // Use original if processing fails
      }
    });
    
    const results = await Promise.all(processPromises);
    processedFiles.push(...results);
    
    return processedFiles;
  }

  /**
   * Apply minimal smart processing like ChatGPT likely does
   * Focus on clarity without aggressive filtering that destroys text
   */
  private async applyMinimalSmartProcessing(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // ChatGPT-style minimal processing:
      // 1. Ensure minimum resolution for Vision API
      // 2. Light normalization only
      // 3. No aggressive filters that distort text
      const args = [
        inputPath,
        // Ensure minimum resolution (Google Vision requirement: 1024x768)
        '-resize', '1024x768^', // Force minimum size
        '-resize', '1024x768>', // Only upscale if needed
        // Very light normalization only
        '-normalize', // Auto-adjust levels (gentle)
        // Ensure proper format for Vision API
        '-colorspace', 'sRGB',
        '-format', 'PNG',
        outputPath
      ];
      
      const process = spawn('magick', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stderr = '';
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Smart processing failed with code ' + code + ': ' + stderr));
          return;
        }
        resolve();
      });
      
      process.on('error', (error) => {
        reject(new Error('Failed to start smart processing: ' + error.message));
      });
    });
  }

  /**
   * 🎯 VISION API OPTIMIZATION: Apply essential preprocessing for OCR accuracy
   * Based on Google Cloud Vision API requirements and best practices
   */
  private async optimizeForVisionAPI(imageFiles: string[], workDir: string): Promise<string[]> {
    const optimizedFiles: string[] = [];
    
    // Process images in parallel for speed
    const optimizePromises = imageFiles.map(async (imagePath, index) => {
      const fileName = path.basename(imagePath);
      const optimizedPath = path.join(workDir, 'vision_optimized_' + fileName);
      
      try {
        await this.optimizeForVision(imagePath, optimizedPath);
        console.log('🎨 Vision-optimized: ' + fileName);
        return optimizedPath;
      } catch (error) {
        console.warn('⚠️ Failed to optimize ' + fileName + ', using original: ' + error);
        return imagePath; // Use original if optimization fails
      }
    });
    
    const results = await Promise.all(optimizePromises);
    optimizedFiles.push(...results);
    
    return optimizedFiles;
  }

  /**
   * Optimize a single image specifically for Google Cloud Vision API OCR
   * Applies research-based optimizations for text detection accuracy
   */
  private async optimizeForVision(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Vision API Optimization based on research:
      // 1. Ensure minimum 1024x768 resolution (Google requirement)
      // 2. Apply contrast enhancement (CLAHE equivalent)
      // 3. Apply light sharpening for text clarity
      // 4. Ensure sRGB colorspace
      // 5. Remove noise while preserving text edges
      const args = [
        inputPath,
        // Ensure minimum resolution for OCR (Google requirement: 1024x768)
        '-resize', '1024x768^', // ^ forces exact minimum while maintaining aspect ratio
        '-resize', '1024x768>', // Only upscale if needed
        // Enhance contrast for text visibility (CLAHE equivalent)
        '-clahe', '2x2+128+3', // Contrast Limited Adaptive Histogram Equalization
        // Light sharpening for text clarity (not too aggressive)
        '-unsharp', '0x1+0.5+0', // Radius x Sigma + Amount + Threshold
        // Ensure proper colorspace and quality
        '-colorspace', 'sRGB',
        '-depth', '8',
        // Light noise reduction while preserving text edges
        '-despeckle', // Remove small noises
        // Output format
        '-format', 'PNG', // Lossless format for OCR
        outputPath
      ];
      
      const process = spawn('magick', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stderr = '';
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Vision optimization failed with code ' + code + ': ' + stderr));
          return;
        }
        resolve();
      });
      
      process.on('error', (error) => {
        reject(new Error('Failed to start Vision optimization: ' + error.message));
      });
    });
  }

  /**
   * Optimize images with ImageMagick via TypeScript child process
   * Resize if needed and optimize for web/vision processing
   */
  private async optimizeWithImageMagick(imageFiles: string[], workDir: string): Promise<string[]> {
    const optimizedFiles: string[] = [];
    
    for (const imagePath of imageFiles) {
      const fileName = path.basename(imagePath);
      const optimizedPath = path.join(workDir, 'optimized_' + fileName);
      
      try {
        await this.optimizeSingleImage(imagePath, optimizedPath);
        optimizedFiles.push(optimizedPath);
        console.log('🎨 Optimized: ' + fileName);
      } catch (error) {
        console.warn('⚠️ Failed to optimize ' + fileName + ', using original: ' + error);
        optimizedFiles.push(imagePath); // Use original if optimization fails
      }
    }
    
    return optimizedFiles;
  }

  /**
   * Optimize a single image with ImageMagick
   */
  private async optimizeSingleImage(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // ImageMagick command to:
      // 1. Resize if height > maxHeight (maintain aspect ratio)
      // 2. Optimize for web (quality 85%, strip metadata)
      // 3. Ensure format consistency
      const args = [
        inputPath,
        '-resize', 'x' + this.maxHeight + '>', // Only resize if taller than maxHeight
        '-quality', '85',
        '-strip', // Remove metadata to reduce file size
        '-colorspace', 'sRGB', // Ensure consistent color space
        outputPath
      ];
      
      const process = spawn('magick', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stderr = '';
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('ImageMagick failed with code ' + code + ': ' + stderr));
          return;
        }
        resolve();
      });
      
      process.on('error', (error) => {
        reject(new Error('Failed to start ImageMagick: ' + error.message));
      });
    });
  }

  /**
   * Upload optimized images to S3 with PARALLEL processing
   */
  private async uploadImagesToS3(imageFiles: string[], outputPrefix: string): Promise<ImageResult[]> {
    const results: ImageResult[] = [];
    
    // 🚀 PARALLEL UPLOADS: Process all images concurrently
    const uploadPromises = imageFiles.map(async (imagePath, i) => {
      const pageNumber = i + 1;
      const fileName = 'page-' + pageNumber.toString().padStart(3, '0') + '.' + this.format;
      const s3Key = outputPrefix + '/' + fileName;
      
      try {
        // Read image file
        const imageBuffer = await fs.readFile(imagePath);
        
        // 🎯 VISION API: Get actual image dimensions for accurate metadata
        const { width, height } = await this.getImageDimensions(imagePath);
        
        // Upload to S3
        await this.s3Client.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: imageBuffer,
          ContentType: 'image/' + this.format,
          Metadata: {
            'page-number': pageNumber.toString(),
            'original-pdf': outputPrefix.split('/').pop() || 'unknown',
            'width': width.toString(),
            'height': height.toString(),
            'dpi': this.dpi.toString()
          }
        }));
        
        console.log('✅ Uploaded page ' + pageNumber + ': ' + s3Key + ' (' + imageBuffer.length + ' bytes, ' + width + 'x' + height + ')');
        
        return {
          pageNumber,
          s3Key,
          s3Url: 'https://' + this.bucket + '.s3.amazonaws.com/' + s3Key,
          width,
          height,
          fileSize: imageBuffer.length
        };
        
      } catch (error) {
        console.error('❌ Failed to upload page ' + pageNumber + ':', error);
        throw error;
      }
    });
    
    // Wait for all uploads to complete in parallel
    const uploadResults = await Promise.all(uploadPromises);
    results.push(...uploadResults);
    
    return results;
  }

  /**
   * Get image dimensions using ImageMagick identify via TypeScript child process
   */
  private async getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const args = ['-ping', '-format', '%w %h', imagePath];
      
      const process = spawn('magick', ['identify', ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('ImageMagick identify failed: ' + stderr));
          return;
        }
        
        const dimensions = stdout.trim().split(' ');
        if (dimensions.length >= 2) {
          resolve({
            width: parseInt(dimensions[0], 10),
            height: parseInt(dimensions[1], 10)
          });
        } else {
          reject(new Error('Failed to parse dimensions: ' + stdout));
        }
      });
      
      process.on('error', (error) => {
        reject(new Error('Failed to start ImageMagick identify: ' + error.message));
      });
    });
  }

  /**
   * Get PDF page count using pdftoppm
   */
  private async getPDFPageCount(pdfPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // Use pdftoppm with -l flag to get last page number
      const process = spawn('pdftoppm', ['-l', '999999', pdfPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stderr = '';
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        // pdftoppm outputs the actual last page number in stderr
        const match = stderr.match(/Last page \((\d+)\)/);
        if (match) {
          resolve(parseInt(match[1], 10));
        } else {
          // Fallback: try to extract from error message
          const pageMatch = stderr.match(/(\d+) pages/);
          if (pageMatch) {
            resolve(parseInt(pageMatch[1], 10));
          } else {
            // Default fallback
            resolve(1);
          }
        }
      });
      
      process.on('error', (error) => {
        reject(new Error('Failed to get page count: ' + error.message));
      });
    });
  }

  /**
   * Convert PDF using parallel processing for large documents
   * Splits PDF into chunks and processes them concurrently
   */
  private async convertWithParallelProcessing(
    pdfPath: string, 
    workDir: string, 
    totalPages: number
  ): Promise<string[]> {
    const PAGES_PER_CHUNK = 10; // Process 10 pages per chunk for better performance
    const chunks: Array<{start: number, end: number}> = [];
    
    // Create page chunks
    for (let start = 1; start <= totalPages; start += PAGES_PER_CHUNK) {
      const end = Math.min(start + PAGES_PER_CHUNK - 1, totalPages);
      chunks.push({ start, end });
    }
    
    console.log('📦 Split into ' + chunks.length + ' chunks of ' + PAGES_PER_CHUNK + ' pages each');
    
    // Process chunks in parallel
    const chunkPromises = chunks.map((chunk, index) => 
      this.convertChunk(pdfPath, workDir, chunk.start, chunk.end, index)
    );
    
    const chunkResults = await Promise.all(chunkPromises);
    
    // Flatten and sort results by page number
    const allFiles = chunkResults.flat().sort((a, b) => {
      const pageA = parseInt(a.match(/page-(\d+)/)?.[1] || '0', 10);
      const pageB = parseInt(b.match(/page-(\d+)/)?.[1] || '0', 10);
      return pageA - pageB;
    });
    
    console.log('✅ Parallel processing completed: ' + allFiles.length + ' pages');
    return allFiles;
  }

  /**
   * Convert a specific page range chunk
   */
  private async convertChunk(
    pdfPath: string,
    workDir: string,
    startPage: number,
    endPage: number,
    chunkIndex: number
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const outputPrefix = path.join(workDir, 'chunk_' + chunkIndex + '_page');
      const args = [
        pdfPath,
        outputPrefix,
        '-' + this.format,
        '-r', this.dpi.toString(),
        '-f', startPage.toString(),
        '-l', endPage.toString()
      ];
      
      console.log('🔧 Chunk ' + chunkIndex + ': Converting pages ' + startPage + '-' + endPage);
      
      const process = spawn('pdftoppm', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error('pdftoppm chunk ' + chunkIndex + ' failed with code ' + code + ': ' + stderr));
          return;
        }
        
        try {
          // Find all generated image files for this chunk
          const files = await fs.readdir(workDir);
          const chunkFiles = files
            .filter(file => file.startsWith('chunk_' + chunkIndex + '_page-') && file.endsWith('.' + this.format))
            .map(file => {
              // Rename to standard format
              const pageNum = file.match(/page-(\d+)/)?.[1];
              if (pageNum) {
                const standardName = 'page-' + pageNum.padStart(3, '0') + '.' + this.format;
                const oldPath = path.join(workDir, file);
                const newPath = path.join(workDir, standardName);
                fs.rename(oldPath, newPath).catch(console.warn);
                return newPath;
              }
              return path.join(workDir, file);
            })
            .sort();
          
          console.log('✅ Chunk ' + chunkIndex + ': Generated ' + chunkFiles.length + ' images');
          resolve(chunkFiles);
        } catch (error) {
          reject(error);
        }
      });
      
      process.on('error', (error) => {
        reject(new Error('Failed to start pdftoppm chunk ' + chunkIndex + ': ' + error.message));
      });
    });
  }

  /**
   * Convert a specific page range of a PDF to images
   * Used for parallel processing across multiple workers
   */
  async convertPDFPageRange(
    pdfPresignedUrl: string,
    outputPrefix: string,
    activityId: string,
    startPage: number,
    endPage: number
  ): Promise<PDFConversionResult> {
    const startTime = Date.now();
    const workDir = path.join(this.tempDir, 'pdf_range_' + activityId + '_' + Date.now());
    
    try {
      // Create working directory
      await fs.mkdir(workDir, { recursive: true });
      console.log('📁 Created work directory: ' + workDir);
      
      // 🚀 OPTIMIZATION: Use shared PDF cache to avoid redundant downloads
      const pdfPath = await this.getSharedPDF(pdfPresignedUrl, activityId);
      
      // Convert specific page range
      console.log('🔄 Converting pages ' + startPage + '-' + endPage + ' at ' + this.dpi + ' DPI...');
      const rawImageFiles = await this.convertPageRange(pdfPath, workDir, startPage, endPage);
      
      // 🎯 SMART PREPROCESSING: Minimal processing to help Vision API without text distortion
      console.log('🎯 Applying minimal smart preprocessing for Vision API...');
      const optimizedImages = await this.smartMinimalPreprocessing(rawImageFiles, workDir);
      
      // Upload to S3
      console.log('📤 Uploading ' + optimizedImages.length + ' optimized images to S3...');
      const images = await this.uploadImagesToS3(optimizedImages, outputPrefix);
      
      const processingTimeMs = Date.now() - startTime;
      const totalSizeBytes = images.reduce((sum, img) => sum + img.fileSize, 0);
      
      console.log('✅ Page range conversion completed: ' + images.length + ' pages in ' + processingTimeMs + 'ms');
      console.log('📊 Total size: ' + (totalSizeBytes / 1024 / 1024).toFixed(2) + 'MB');
      
      return {
        totalPages: images.length,
        images,
        processingTimeMs,
        totalSizeBytes
      };
      
    } finally {
      // Cleanup temp directory
      try {
        await fs.rm(workDir, { recursive: true, force: true });
        console.log('🧹 Cleaned up temp directory: ' + workDir);
      } catch (error) {
        console.warn('⚠️ Failed to cleanup temp directory: ' + error);
      }
    }
  }

  /**
   * Convert a specific page range using pdftoppm
   */
  private async convertPageRange(
    pdfPath: string,
    workDir: string,
    startPage: number,
    endPage: number
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const outputPrefix = path.join(workDir, 'page');
      const args = [
        pdfPath,
        outputPrefix,
        '-' + this.format,
        '-r', this.dpi.toString(),
        '-f', startPage.toString(),
        '-l', endPage.toString()
      ];
      
      console.log('🔧 Converting pages ' + startPage + '-' + endPage + ': pdftoppm ' + args.join(' '));
      
      const process = spawn('pdftoppm', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error('pdftoppm failed with code ' + code + ': ' + stderr));
          return;
        }
        
        try {
          // Find all generated image files
          const files = await fs.readdir(workDir);
          const imageFiles = files
            .filter(file => file.startsWith('page-') && file.endsWith('.' + this.format))
            .map(file => path.join(workDir, file))
            .sort(); // Ensure proper page order
          
          console.log('✅ Generated ' + imageFiles.length + ' image files for pages ' + startPage + '-' + endPage);
          resolve(imageFiles);
        } catch (error) {
          reject(error);
        }
      });
      
      process.on('error', (error) => {
        reject(new Error('Failed to start pdftoppm: ' + error.message));
      });
    });
  }
}

/**
 * Factory function to create PDFToImagesClient
 */
export function createPDFToImagesClient(s3Client: S3Client, bucket: string): PDFToImagesClient {
  return new PDFToImagesClient({
    s3Client,
    bucket,
    dpi: 300,
    maxHeight: 1998, // GPT-4o limit
    format: 'png'
  });
}              