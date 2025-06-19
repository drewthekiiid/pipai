import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  userId: z.string().min(1, 'User ID is required'),
});

// Configure for longer processing with Assistants API
export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for assistant responses
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

    console.log(`🤖 Assistant chat request from user ${userId}: ${message.substring(0, 100)}...`);

    const openai = getOpenAIClient();
    const assistantId = process.env.OPENAI_ASSISTANT_ID || 'asst_p4zYGecM2u6Fd676lma1OGfV';

    // Create a new thread for this conversation
    const thread = await openai.beta.threads.create();
    
    // Add the user's message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status === 'completed') {
      // Get the assistant's response
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data[0];
      
      if (assistantMessage.role === 'assistant' && assistantMessage.content[0].type === 'text') {
        const response = {
          id: `assistant-${Date.now()}`,
          message: assistantMessage.content[0].text.value,
          timestamp: new Date().toISOString(),
          type: 'assistant',
          threadId: thread.id,
          runId: run.id,
          assistantId: assistantId
        };

        console.log(`✅ Assistant response generated successfully`);
        return NextResponse.json(response);
      } else {
        throw new Error('Unexpected response format from assistant');
      }
    } else {
      throw new Error(`Assistant run failed with status: ${runStatus.status}`);
    }

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

      if (error.message.includes('timeout')) {
        return NextResponse.json({
          error: 'Assistant response timed out. Please try again.'
        }, { status: 408 });
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
