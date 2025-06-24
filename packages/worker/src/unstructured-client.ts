/**
 * Unstructured-IO Client for Document Processing
 * Handles text, tables, images, metadata, layouts, and OCR
 */

import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs/promises';

interface UnstructuredConfig {
  apiUrl: string;
  apiKey?: string; // Optional for open source version
  timeout: number;
  maxConcurrency: number;
}

interface UnstructuredElement {
  type: string;
  text: string;
  metadata: {
    page_number?: number;
    coordinates?: {
      points: number[][];
      system: string;
      layout_width: number;
      layout_height: number;
    };
    parent_id?: string;
    category_type?: string;
    image_path?: string;
    table_as_cells?: any[];
  };
  element_id: string;
}

interface UnstructuredResponse {
  elements: UnstructuredElement[];
  metadata: {
    total_elements: number;
    pages: number;
    processing_time: number;
  };
}

interface ProcessedDocument {
  extractedText: string;
  tables: Array<{
    pageNumber: number;
    html: string;
    text: string;
    cells: any[];
  }>;
  images: Array<{
    pageNumber: number;
    imagePath: string;
    caption?: string;
  }>;
  metadata: {
    pageCount: number;
    elementCount: number;
    hasImages: boolean;
    hasTables: boolean;
    processingTime: number;
    layout: {
      headers: string[];
      sections: string[];
      lists: string[];
    };
  };
}

interface ProcessFileOptions {
  strategy?: string;
  hi_res_model_name?: string;
  chunking_strategy?: string;
  max_characters?: number;
  combine_under_n_chars?: number;
  new_after_n_chars?: number;
  ocr_languages?: string[];
}

export class UnstructuredClient {
  private config: UnstructuredConfig;

  constructor(config: UnstructuredConfig) {
    this.config = config;
  }

  /**
   * Process document using Unstructured-IO API
   */
  async processDocument(filePath: string, options: {
    strategy?: 'fast' | 'hi_res' | 'auto';
    extractImages?: boolean;
    extractTables?: boolean;
    coordinates?: boolean;
    includePage?: boolean;
    enableParallelProcessing?: boolean;
    concurrencyLevel?: number;
    allowPartialFailure?: boolean;
  } = {}): Promise<ProcessedDocument> {
    const {
      strategy = 'fast',
      extractImages = false,
      extractTables = true,
      coordinates = false,
      includePage = false,
      enableParallelProcessing = true,
      concurrencyLevel = 10,
      allowPartialFailure = true
    } = options;

    try {
      console.log(`[Unstructured] Processing document: ${filePath}`);
      console.log(`[Unstructured] Parallel processing: ${enableParallelProcessing ? `enabled (${concurrencyLevel} concurrent)` : 'disabled'}`);
      const startTime = Date.now();

      // Read file buffer
      const fileBuffer = await fs.readFile(filePath);
      const fileName = filePath.split('/').pop() || 'document';

      // Create form data
      const formData = new FormData();
      formData.append('files', fileBuffer, fileName);
      formData.append('strategy', strategy);
      formData.append('coordinates', coordinates.toString());
      formData.append('include_page_breaks', includePage.toString());
      
      if (extractImages) {
        formData.append('extract_images', 'true');
      }
      
      if (extractTables) {
        formData.append('extract_tables', 'true');
      }

      // Parallel processing parameters for PDFs
      if (enableParallelProcessing && fileName.toLowerCase().endsWith('.pdf')) {
        formData.append('split_pdf_page', 'true');
        formData.append('split_pdf_concurrency_level', concurrencyLevel.toString());
        formData.append('split_pdf_allow_failed', allowPartialFailure.toString());
        console.log(`[Unstructured] PDF will be split into batches and processed with ${concurrencyLevel} concurrent requests`);
      }

      // Additional parameters for construction documents
      formData.append('pdf_infer_table_structure', 'true');
      formData.append('xml_keep_tags', 'false');
      formData.append('chunking_strategy', 'by_title');

      // Make API request (Open Source version)
      const response = await axios.post(
        `${this.config.apiUrl}/general/v0/general`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            // No API key needed for open source version
          },
          timeout: 600000, // Increased to 10 minutes for large parallel processing jobs
        }
      );

      // Parse response data if it's a string
      let elements: UnstructuredElement[];
      if (typeof response.data === 'string') {
        elements = JSON.parse(response.data);
      } else {
        elements = response.data;
      }
      
      const processingTime = Date.now() - startTime;

      console.log(`[Unstructured] Processed ${elements.length} elements in ${processingTime}ms`);
      if (enableParallelProcessing && fileName.toLowerCase().endsWith('.pdf')) {
        console.log(`[Unstructured] Parallel processing completed successfully`);
      }

      return this.parseUnstructuredResponse(elements, processingTime);

    } catch (error) {
      console.error('[Unstructured] Processing failed:', error);
      throw new Error(`Unstructured processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Unstructured response into structured format
   */
  private parseUnstructuredResponse(elements: UnstructuredElement[], processingTime: number): ProcessedDocument {
    const extractedText: string[] = [];
    const tables: ProcessedDocument['tables'] = [];
    const images: ProcessedDocument['images'] = [];
    const layout = {
      headers: [] as string[],
      sections: [] as string[],
      lists: [] as string[]
    };

    let pageCount = 0;

    for (const element of elements) {
      // Update page count
      if (element.metadata && element.metadata.page_number && element.metadata.page_number > pageCount) {
        pageCount = element.metadata.page_number;
      }

      // Extract text content
      if (element.text && element.text.trim()) {
        extractedText.push(element.text.trim());
      }

      // Process different element types
      switch (element.type) {
        case 'Title':
        case 'Header':
          layout.headers.push(element.text);
          break;

        case 'NarrativeText':
        case 'Text':
          layout.sections.push(element.text);
          break;

        case 'ListItem':
        case 'List':
          layout.lists.push(element.text);
          break;

        case 'Table':
          if (element.metadata && element.metadata.table_as_cells) {
            tables.push({
              pageNumber: element.metadata.page_number || 0,
              html: this.tableCellsToHtml(element.metadata.table_as_cells),
              text: element.text,
              cells: element.metadata.table_as_cells
            });
          }
          break;

        case 'Image':
          if (element.metadata && element.metadata.image_path) {
            images.push({
              pageNumber: element.metadata.page_number || 0,
              imagePath: element.metadata.image_path,
              caption: element.text || undefined
            });
          }
          break;
      }
    }

    return {
      extractedText: extractedText.join('\n\n'),
      tables,
      images,
      metadata: {
        pageCount,
        elementCount: elements.length,
        hasImages: images.length > 0,
        hasTables: tables.length > 0,
        processingTime,
        layout
      }
    };
  }

  /**
   * Convert table cells to HTML format
   */
  private tableCellsToHtml(cells: any[]): string {
    if (!cells || cells.length === 0) return '';

    // Group cells by row
    const rowMap = new Map<number, any[]>();
    for (const cell of cells) {
      const row = cell.row_index || 0;
      if (!rowMap.has(row)) {
        rowMap.set(row, []);
      }
      rowMap.get(row)!.push(cell);
    }

    // Sort rows and build HTML
    let html = '<table border="1">\n';
    const sortedRows = Array.from(rowMap.keys()).sort((a, b) => a - b);

    for (const rowIndex of sortedRows) {
      const rowCells = rowMap.get(rowIndex)!.sort((a, b) => (a.col_index || 0) - (b.col_index || 0));
      html += '  <tr>\n';
      
      for (const cell of rowCells) {
        const cellTag = rowIndex === 0 ? 'th' : 'td';
        const colspan = cell.col_span > 1 ? ` colspan="${cell.col_span}"` : '';
        const rowspan = cell.row_span > 1 ? ` rowspan="${cell.row_span}"` : '';
        html += `    <${cellTag}${colspan}${rowspan}>${cell.text || ''}</${cellTag}>\n`;
      }
      
      html += '  </tr>\n';
    }

    html += '</table>';
    return html;
  }

  /**
   * Health check for Unstructured service with dynamic port detection
   */
  async healthCheck(): Promise<boolean> {
    // If we have a cloud URL or explicit URL, just test that
    if (this.config.apiUrl.includes('fly.dev') || process.env.UNSTRUCTURED_API_URL) {
      try {
        const response = await axios.get(`${this.config.apiUrl}/healthcheck`, {
          timeout: 5000
        });
        return response.status === 200 && response.data.status === 'healthy';
      } catch {
        return false;
      }
    }

    // For localhost, try dynamic port detection
    const portsToTry = [8001, 8000]; // Try optimized server first, then standard
    
    for (const port of portsToTry) {
      try {
        const testUrl = `http://localhost:${port}`;
        const response = await axios.get(`${testUrl}/healthcheck`, { 
          timeout: 3000
        });
        
        if (response.status === 200) {
          // Update our config to use the working port
          if (this.config.apiUrl !== testUrl) {
            console.log(`[Unstructured] Found running service on port ${port}, updating configuration`);
            this.config.apiUrl = testUrl;
          }
          return true;
        }
      } catch (error) {
        // Port not available, try next one
        console.log(`[Unstructured] Port ${port} not available, trying next...`);
      }
    }
    
    console.error(`[Unstructured] No unstructured service found on any port. Tried: ${portsToTry.join(', ')}`);
    return false;
  }

  /**
   * Process large PDF with maximum parallel optimization
   * Optimized for speed with parallel processing enabled
   */
  async processLargePDF(filePath: string, options: {
    maxConcurrency?: number;
    allowPartialFailure?: boolean;
    extractTables?: boolean;
  } = {}): Promise<ProcessedDocument> {
    const {
      maxConcurrency = 15, // Use maximum allowed concurrency
      allowPartialFailure = true,
      extractTables = true
    } = options;

    console.log(`[Unstructured] Processing large PDF with maximum parallel optimization`);
    console.log(`[Unstructured] Using ${maxConcurrency} concurrent requests`);

    return this.processDocument(filePath, {
      strategy: 'fast', // Fastest strategy
      extractImages: false, // Skip images for speed
      extractTables, // Keep tables for construction analysis
      coordinates: false, // Skip coordinates for speed
      includePage: false, // Skip page breaks for speed
      enableParallelProcessing: true,
      concurrencyLevel: maxConcurrency,
      allowPartialFailure
    });
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes(): string[] {
    return [
      'pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls',
      'html', 'xml', 'txt', 'md', 'rtf', 'odt', 'odp', 'ods',
      'png', 'jpg', 'jpeg', 'tiff', 'bmp', 'heic'
    ];
  }

  /**
   * Process file through unstructured service with enhanced error handling
   */
  async processFile(
    fileName: string, 
    fileBuffer: Buffer, 
    options: ProcessFileOptions = {}
  ): Promise<UnstructuredElement[]> {
    const startTime = Date.now();
    
    try {
      await this.healthCheck();
      
      const formData = new FormData();
      const blob = new Blob([fileBuffer]);
      formData.append('files', blob, fileName);
      
      // Enhanced processing options for maximum quality
      formData.append('strategy', options.strategy || 'fast');
      formData.append('hi_res_model_name', options.hi_res_model_name || 'yolox');
      formData.append('pdf_infer_table_structure', 'true');
      formData.append('chunking_strategy', options.chunking_strategy || 'by_title');
      formData.append('max_characters', String(options.max_characters || 500));
      formData.append('combine_under_n_chars', String(options.combine_under_n_chars || 100));
      formData.append('new_after_n_chars', String(options.new_after_n_chars || 300));
      
      // Add OCR languages if specified
      if (options.ocr_languages?.length) {
        formData.append('ocr_languages', options.ocr_languages.join(','));
      }

      // Prepare headers
      const headers: Record<string, string> = {};
      
      // Add API key for hosted service
      if (this.config.apiKey) {
        headers['unstructured-api-key'] = this.config.apiKey;
      }

      console.log(`[Unstructured] Processing ${fileName} (${Math.round(fileBuffer.length / 1024)}KB)`);
      console.log(`[Unstructured] Strategy: ${options.strategy || 'fast'}, Concurrency: ${this.config.maxConcurrency}`);
      
      const response = await axios.post(
        `${this.config.apiUrl}/general/v0/general`,
        formData,
        {
          headers,
          timeout: this.config.timeout,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      const elements = response.data as UnstructuredElement[];
      const processingTime = (Date.now() - startTime) / 1000;
      
      console.log(`[Unstructured] ✅ Processing completed: ${elements.length} elements in ${processingTime.toFixed(2)}s`);
      
      return elements;

    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;
      console.error(`[Unstructured] ❌ Processing failed after ${processingTime.toFixed(2)}s:`, error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Unstructured API authentication failed. Please check your API key.');
        }
        if (error.response?.status === 429) {
          throw new Error('Unstructured API rate limit exceeded. Please try again later.');
        }
        if (error.code === 'ECONNABORTED') {
          throw new Error(`Unstructured API timeout after ${this.config.timeout}ms`);
        }
        throw new Error(`Unstructured API error: ${error.response?.status} ${error.response?.statusText}`);
      }
      
      throw new Error(`Unstructured processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Default configuration with smart cloud/local detection
export const createUnstructuredClient = (customConfig?: Partial<UnstructuredConfig>): UnstructuredClient => {
  // Smart URL detection: Use hosted API in production, localhost in development
  const getApiUrl = (): string => {
    // Priority order:
    // 1. Explicit environment variable
    if (process.env.UNSTRUCTURED_API_URL) {
      return process.env.UNSTRUCTURED_API_URL;
    }
    
    // 2. If we're in a cloud environment (Vercel, Fly.io), use hosted API service
    if (process.env.VERCEL || process.env.FLY_APP_NAME || process.env.NODE_ENV === 'production') {
      return 'https://api.unstructured.io'; // Hosted API service
    }
    
    // 3. For localhost, try dynamic port detection
    const portsToTry = [8001, 8000]; // Try optimized server first, then standard
    
    // Return first port for now, healthCheck will update if needed
    return `http://localhost:${portsToTry[0]}`;
  };

  const config: UnstructuredConfig = {
    apiUrl: getApiUrl(),
    timeout: 300000, // 5 minutes for large files
    maxConcurrency: 15,
    apiKey: process.env.UNSTRUCTURED_API_KEY, // Required for hosted service
    ...customConfig
  };

  console.log(`[Unstructured] Using API: ${config.apiUrl}${config.apiKey ? ' (with API key)' : ' (open source)'}`);

  return new UnstructuredClient(config);
}; 