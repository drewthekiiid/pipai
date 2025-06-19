import { NextRequest, NextResponse } from 'next/server';
import { ConstructionAssistant } from '../../../lib/assistant-client';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for complex document analysis
export const dynamic = 'force-dynamic';

// Increase the maximum request size for construction documents
export const maxRequestSize = '100mb';

// Initialize assistant client
function getAssistantClient(): ConstructionAssistant {
  const apiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.OPENAI_ASSISTANT_ID || 'asst_p4zYGecM2u6Fd676lma1OGfV'; // Your EstimAItor assistant
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  return new ConstructionAssistant(apiKey, assistantId);
}

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 Assistant API called');
    
    const contentType = request.headers.get('content-type') || '';
    let message: string;
    let files: File[] | { name: string; url: string; size: number }[] = [];
    let analysisMode: 'files' | 'urls' = 'files';

    // Handle both FormData (legacy) and JSON (new S3 URLs) formats
    if (contentType.includes('multipart/form-data')) {
      console.log('📄 Using FormData mode (legacy)');
      
      // Parse form data
      const formData = await request.formData();
      message = formData.get('message') as string || 'Analyze these construction documents';
      
      // Extract files and check sizes
      const fileArray: File[] = [];
      const maxFileSize = 75 * 1024 * 1024; // 75MB per file
      const totalMaxSize = 90 * 1024 * 1024; // 90MB total
      let totalSize = 0;
      
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file-') && value instanceof File) {
          // Check individual file size
          if (value.size > maxFileSize) {
            return NextResponse.json({
              error: `File "${value.name}" is too large (${Math.round(value.size / 1024 / 1024)}MB). Maximum size is 75MB per file.`,
              hint: 'Try compressing the PDF or splitting large documents into smaller files.'
            }, { status: 413 });
          }
          
          totalSize += value.size;
          fileArray.push(value);
        }
      }

      // Check total size
      if (totalSize > totalMaxSize) {
        return NextResponse.json({
          error: `Total upload size is too large (${Math.round(totalSize / 1024 / 1024)}MB). Maximum total size is 90MB.`,
          hint: 'Try uploading fewer files at once or compress your PDFs.'
        }, { status: 413 });
      }

      files = fileArray;
      analysisMode = 'files';
      
    } else if (contentType.includes('application/json')) {
      console.log('🔗 Using JSON mode with S3 URLs (new)');
      
      const body = await request.json();
      message = body.message || 'Analyze these construction documents';
      files = body.files || [];
      analysisMode = 'urls';
      
    } else {
      return NextResponse.json({
        error: 'Assistant API requires either multipart/form-data or application/json'
      }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({
        error: 'No files provided for analysis'
      }, { status: 400 });
    }

    console.log(`📁 Processing ${files.length} file(s) with EstimAItor assistant in ${analysisMode} mode`);
    
    if (analysisMode === 'files') {
      (files as File[]).forEach(file => {
        console.log(`  - ${file.name} (${Math.round(file.size / 1024)}KB, ${file.type})`);
      });
    } else {
      (files as { name: string; url: string; size: number }[]).forEach(file => {
        console.log(`  - ${file.name} (${Math.round(file.size / 1024)}KB) from S3`);
      });
    }

    // Initialize assistant client
    const assistant = getAssistantClient();

    // Analyze documents using assistant
    const analysis = analysisMode === 'files' 
      ? await assistant.analyzeDocuments(files as File[], message)
      : await assistant.analyzeDocumentsFromUrls(files as { name: string; url: string; size: number }[], message);

    const response = {
      id: `assistant-${Date.now()}`,
      message: analysis,
      timestamp: new Date().toISOString(),
      type: 'assistant',
      analysisType: 'construction',
      files: analysisMode === 'files' 
        ? (files as File[]).map(f => ({ name: f.name, size: f.size, type: f.type }))
        : (files as { name: string; url: string; size: number }[]).map(f => ({ name: f.name, size: f.size, type: 'application/pdf' }))
    };

    console.log('✅ Assistant analysis completed successfully');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Assistant API error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Invalid API key')) {
        return NextResponse.json({
          error: 'Invalid OpenAI API key. Please check your API key configuration.',
          hint: 'Update OPENAI_API_KEY in your environment variables'
        }, { status: 401 });
      }
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return NextResponse.json({
          error: 'OpenAI API rate limit exceeded. Please try again later.',
        }, { status: 429 });
      }
      
      if (error.message.includes('timeout')) {
        return NextResponse.json({
          error: 'Analysis timed out. Please try with smaller files or simpler documents.',
        }, { status: 408 });
      }
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      type: 'assistant_error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Test assistant connectivity
    const assistant = getAssistantClient();
    
    return NextResponse.json({
      status: 'EstimAItor Assistant API is running',
      model: 'gpt-4o',
      environment: process.env.VERCEL ? 'Vercel' : process.env.NODE_ENV || 'development',
      openai_configured: true,
      capabilities: [
        'Native PDF processing',
        'File search and analysis',
        'Code interpreter for calculations',
        'Construction trade detection',
        'CSI Division classification',
        'Scope of Work generation',
        'Material Takeoff calculation',
        'Conversation continuity'
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'EstimAItor Assistant API - Configuration Error',
      environment: process.env.VERCEL ? 'Vercel' : process.env.NODE_ENV || 'development',
      openai_configured: false,
      error: error instanceof Error ? error.message : 'Unknown configuration error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 