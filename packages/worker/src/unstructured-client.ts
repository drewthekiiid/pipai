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
   * Health check for Unstructured service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/healthcheck`, {
        timeout: 5000
      });
      return response.status === 200 && response.data.status === 'healthy';
    } catch {
      return false;
    }
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
}

// Default configuration with smart cloud/local detection
export const createUnstructuredClient = (customConfig?: Partial<UnstructuredConfig>): UnstructuredClient => {
  // Smart URL detection: Use cloud URL in production, localhost in development
  const getApiUrl = (): string => {
    // Priority order:
    // 1. Explicit environment variable
    if (process.env.UNSTRUCTURED_API_URL) {
      return process.env.UNSTRUCTURED_API_URL;
    }
    
    // 2. If we're in a cloud environment (Vercel, Fly.io), use cloud service
    if (process.env.VERCEL || process.env.FLY_APP_NAME || process.env.NODE_ENV === 'production') {
      return 'https://pip-ai-unstructured-free.fly.dev';
    }
    
    // 3. Default to localhost for development
    return 'http://localhost:8000';
  };

  const defaultConfig: UnstructuredConfig = {
    apiUrl: getApiUrl(),
    // No API key needed for open source version
    apiKey: process.env.UNSTRUCTURED_API_KEY,
  };

  console.log(`[Unstructured] Using API URL: ${defaultConfig.apiUrl}`);

  return new UnstructuredClient({ ...defaultConfig, ...customConfig });
}; 