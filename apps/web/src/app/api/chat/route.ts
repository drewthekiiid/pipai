import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  userId: z.string().min(1, 'User ID is required'),
});

// Configure for larger requests and longer processing
export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  return new OpenAI({ apiKey });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, userId } = chatRequestSchema.parse(body);

    console.log(`💬 Chat request from user ${userId}: ${message.substring(0, 100)}...`);

    const openai = getOpenAIClient();

    // Use Chat Completions API for fast, real-time responses
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective for chat
      messages: [
        {
          role: 'system',
          content: `You are EstimAItor, a professional construction estimation assistant. You help with:
          
• Construction document analysis and interpretation
• Trade analysis and CSI division classification  
• Material takeoffs and quantity calculations
• Scope of work generation and project planning
• Construction cost estimation and budgeting
• Building code compliance and regulations

Provide helpful, accurate responses about construction topics. If users want to upload documents for detailed analysis, direct them to use the file upload feature for comprehensive trade analysis, takeoffs, and estimates.

Keep responses conversational but professional. Focus on construction industry expertise.`
        },
        {
          role: 'user', 
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
      stream: false
    });

    const assistantMessage = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';

    const response = {
      id: `chat-${Date.now()}`,
      message: assistantMessage,
      timestamp: new Date().toISOString(),
      type: 'assistant',
      model: 'gpt-4o-mini',
      usage: completion.usage
    };

    console.log(`✅ Chat response generated successfully (${completion.usage?.total_tokens} tokens)`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Chat API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    // Handle OpenAI specific errors
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Invalid API key')) {
        return NextResponse.json({
          error: 'Invalid OpenAI API key. Please check your API key configuration.'
        }, { status: 401 });
      }
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return NextResponse.json({
          error: 'OpenAI API rate limit exceeded. Please try again later.'
        }, { status: 429 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Chat API is running',
    timestamp: new Date().toISOString(),
  });
}
