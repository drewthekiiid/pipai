import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Configure route as dynamic for API functionality
export const dynamic = 'force-dynamic';

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  userId: z.string().min(1, 'User ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = chatRequestSchema.parse(body);

    const response = {
      id: `chat-${Date.now()}`,
      message: `I received your message: "${message}". To analyze construction documents, please upload your plans and I'll provide detailed trade analysis, scope of work, and takeoffs in CSI order.`,
      timestamp: new Date().toISOString(),
      type: 'assistant'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
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
