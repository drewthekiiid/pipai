import { NextRequest, NextResponse } from 'next/server';
import { publishEvent } from '@/lib/stream-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { streamKey, event } = body;

    if (!streamKey || !event) {
      return NextResponse.json(
        { error: 'Missing streamKey or event in request body' },
        { status: 400 }
      );
    }

    const publishedEvent = await publishEvent(streamKey, event);

    return NextResponse.json({
      success: true,
      event: publishedEvent,
    });

  } catch (error) {
    console.error('Test publish error:', error);
    return NextResponse.json(
      { error: 'Failed to publish event' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
