import { exec } from 'child_process';
import fs from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PDFImage {
  page: number;
  width: number;
  height: number;
  format: string;
  size_bytes: number;
  data: string; // base64
  mime_type: string;
}

export interface PDFConversionResult {
  success: boolean;
  source_file?: string;
  source_size_bytes?: number;
  page_count?: number;
  dpi?: number;
  format?: string;
  images?: PDFImage[];
  error?: string;
}

export interface ConversionOptions {
  dpi?: number;
  format?: 'JPEG' | 'PNG';
  outputDir?: string;
}

/**
 * Convert PDF buffer to images using Python pdf2image
 */
export async function convertPdfToImages(
  pdfBuffer: Buffer,
  fileName: string,
  options: ConversionOptions = {}
): Promise<PDFConversionResult> {
  const { dpi = 200, format = 'JPEG', outputDir } = options;

  // Create temporary file for PDF
  const tempDir = tmpdir();
  const tempPdfPath = path.join(tempDir, `${Date.now()}_${fileName}`);
  
  try {
    // Write PDF buffer to temp file
    await fs.writeFile(tempPdfPath, pdfBuffer);
    
    // Path to Python script
    const pythonScriptPath = path.join(process.cwd(), 'apps', 'api', 'pdf_processor.py');
    
    // Build command
    const args = [pythonScriptPath, tempPdfPath];
    if (outputDir) args.push(outputDir);
    args.push(dpi.toString(), format);
    
    const command = `python3 ${args.map(arg => `"${arg}"`).join(' ')}`;
    
    console.log(`🔄 Converting PDF "${fileName}" to images with Python...`);
    console.log(`📄 Command: ${command}`);
    
    // Execute Python script
    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 60 second timeout
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
    });

    if (stderr) {
      console.warn(`⚠️ Python stderr: ${stderr}`);
    }

    // Parse JSON result
    const result: PDFConversionResult = JSON.parse(stdout);
    
    if (result.success) {
      console.log(`✅ Successfully converted PDF "${fileName}" to ${result.page_count} images`);
      return result;
    } else {
      console.error(`❌ PDF conversion failed: ${result.error}`);
      return result;
    }
    
  } catch (error) {
    console.error(`❌ PDF conversion error for "${fileName}":`, error);
    
    if (error instanceof Error && error.message.includes('timeout')) {
      return {
        success: false,
        error: 'PDF conversion timed out - file may be too large or complex'
      };
    }
    
    return {
      success: false,
      error: `PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempPdfPath);
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to clean up temp file: ${cleanupError}`);
    }
  }
}

/**
 * Convert PDF file path to images
 */
export async function convertPdfFileToImages(
  filePath: string,
  options: ConversionOptions = {}
): Promise<PDFConversionResult> {
  try {
    const pdfBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    return convertPdfToImages(pdfBuffer, fileName, options);
  } catch (error) {
    return {
      success: false,
      error: `Failed to read PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Test the PDF conversion system
 */
export async function testPdfConversion(): Promise<void> {
  console.log('🧪 Testing PDF conversion system...');
  
  // Create a simple test PDF content
  const testContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
  /Font <<
    /F1 <<
      /Type /Font
      /Subtype /Type1
      /BaseFont /Helvetica
    >>
  >>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Hello, PDF to Image!) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000113 00000 n 
0000000337 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
430
%%EOF`;

  const testBuffer = Buffer.from(testContent, 'utf8');
  
  try {
    const result = await convertPdfToImages(testBuffer, 'test.pdf', {
      dpi: 150,
      format: 'JPEG'
    });
    
    if (result.success && result.images && result.images.length > 0) {
      console.log(`✅ PDF conversion test successful! Created ${result.images.length} image(s)`);
      console.log(`📊 First image: ${result.images[0].width}x${result.images[0].height}, ${Math.round(result.images[0].size_bytes / 1024)}KB`);
    } else {
      console.log(`❌ PDF conversion test failed: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ PDF conversion test error:', error);
  }
} 