import { NextRequest, NextResponse } from 'next/server';
import { convertPdfToImages, testPdfConversion } from '../../../lib/pdf-to-images';

export async function GET() {
  try {
    console.log('🧪 Running PDF conversion test...');
    
    // Run the built-in test
    await testPdfConversion();
    
    return NextResponse.json({
      success: true,
      message: 'PDF conversion test completed - check server logs for results'
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({
        error: 'No file provided'
      }, { status: 400 });
    }
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json({
        error: 'File must be a PDF'
      }, { status: 400 });
    }
    
    console.log(`🔄 Testing PDF conversion for: ${file.name} (${Math.round(file.size / 1024)}KB)`);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const result = await convertPdfToImages(buffer, file.name, {
      dpi: 150, // Lower DPI for testing
      format: 'JPEG'
    });
    
    if (result.success && result.images) {
      // Return summary (without base64 data to avoid huge responses)
      const summary = {
        success: true,
        source_file: file.name,
        source_size_bytes: result.source_size_bytes,
        page_count: result.page_count,
        dpi: result.dpi,
        format: result.format,
        images: result.images.map(img => ({
          page: img.page,
          width: img.width,
          height: img.height,
          format: img.format,
          size_bytes: img.size_bytes,
          mime_type: img.mime_type
          // Note: 'data' field excluded to keep response size manageable
        }))
      };
      
      console.log(`✅ PDF conversion successful: ${result.page_count} pages converted`);
      
      return NextResponse.json(summary);
    } else {
      console.error(`❌ PDF conversion failed: ${result.error}`);
      
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ PDF test endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 