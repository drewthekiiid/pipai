import { NextRequest, NextResponse } from 'next/server';
import { ConstructionAssistant } from '../../../lib/assistant-client';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for complex document analysis

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
    
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({
        error: 'Assistant API requires multipart/form-data for file uploads'
      }, { status: 400 });
    }

    // Parse form data
    const formData = await request.formData();
    const message = formData.get('message') as string || 'Analyze these construction documents';
    
    // Extract files
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file-') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({
        error: 'No files provided for analysis'
      }, { status: 400 });
    }

    console.log(`📁 Processing ${files.length} file(s) with EstimAItor assistant`);
    files.forEach(file => {
      console.log(`  - ${file.name} (${Math.round(file.size / 1024)}KB, ${file.type})`);
    });

    // Initialize assistant client
    const assistant = getAssistantClient();

    // Analyze documents using assistant
    const analysis = await assistant.analyzeDocuments(files, message);

    const response = {
      id: `assistant-${Date.now()}`,
      message: analysis,
      timestamp: new Date().toISOString(),
      type: 'assistant',
      analysisType: 'construction',
      files: files.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
      }))
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