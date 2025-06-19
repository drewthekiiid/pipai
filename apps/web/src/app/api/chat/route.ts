import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

// Initialize OpenAI client lazily for Vercel compatibility
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set. Please configure it in your Vercel project settings or GitHub repository secrets.');
    }
    
    openai = new OpenAI({
      apiKey: apiKey,
    });
  }
  
  return openai;
}

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  userId: z.string().min(1, 'User ID is required'),
  files: z.array(z.object({
    name: z.string(),
    type: z.string(),
    data: z.string(), // base64 encoded
  })).optional(),
});

// EstimAItor system prompt for construction analysis
const ESTIMATOR_PROMPT = `You are EstimAItor, the greatest commercial construction estimator ever.

PRIMARY FUNCTION:
ALWAYS READ THE FULL DOC NO MATTER HOW LONG IT TAKES
You are a commercial construction estimator trained to analyze construction drawing sets and immediately generate:
- Trade detection
- CSI Division and Cost Code tagging  
- Contract-ready Scope of Work
- Matching Material Takeoff
- Optional RFI generation if missing info is found

All deliverables must be based strictly on the uploaded plans and specifications. If something is unclear, highlight it using "yellow flag" language.

CORE CAPABILITIES:
When plans are uploaded:
1. Scan all filenames, sheet headers, and content
2. Detect all trades shown in the drawings
3. Tag each trade with CSI Division and Cost Code
4. List supporting sheet references
5. Identify missing, unclear, or OFOI ("by others") scope
6. Generate both Scope of Work and Takeoff for each trade in CSI order

Always format outputs as if they will be included in a subcontract, bid package, or site log.

For each detected trade, provide:
- PROJECT: [Project Name]
- LOCATION: [City, State]  
- TRADE: [Trade Name]
- CSI DIVISION: [Division Number – Division Name]
- COST CODE: [Insert Cost Code]

Then provide detailed Scope of Work with checkboxes and Material Takeoff with quantities.

Focus on accuracy and completeness to eliminate ambiguity before construction begins.`;

export async function POST(request: NextRequest) {
  try {
    // Initialize OpenAI client at request time for Vercel compatibility
    const client = getOpenAIClient();
    
    const body = await request.json();
    const { message, files } = chatRequestSchema.parse(body);

    // Check if we have construction documents to analyze
    if (files && files.length > 0) {
      console.log(`🏗️ Analyzing ${files.length} construction document(s)`);
      
      // Process construction documents with GPT-4.1-2025-04-14 Vision
      const analysis = await analyzeConstructionDocuments(client, files, message);
      
      const response = {
        id: `analysis-${Date.now()}`,
        message: analysis,
        timestamp: new Date().toISOString(),
        type: 'assistant',
        analysisType: 'construction'
      };

      return NextResponse.json(response);
    } else {
      // Regular chat without files
      const chatResponse = await client.chat.completions.create({
        model: "gpt-4.1-2025-04-14",
        messages: [
          {
            role: "system",
            content: ESTIMATOR_PROMPT
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const response = {
        id: `chat-${Date.now()}`,
        message: chatResponse.choices[0].message.content,
        timestamp: new Date().toISOString(),
        type: 'assistant'
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your Vercel environment variables.',
          hint: 'Go to your Vercel dashboard → Project Settings → Environment Variables'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function analyzeConstructionDocuments(client: OpenAI, files: Array<{name: string, type: string, data: string}>, userMessage: string) {
  try {
    console.log('🔍 Starting construction document analysis...');

    // Prepare the messages for GPT-4.1-2025-04-14 Vision
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: ESTIMATOR_PROMPT
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${userMessage}\n\nPlease analyze the uploaded construction documents and provide:\n1. List of all detected trades\n2. For each trade: complete Scope of Work and Material Takeoff in CSI order\n3. Flag any missing or unclear information\n\nFocus on accuracy and detail for commercial construction estimating.`
          },
          ...files.map(file => ({
            type: "image_url" as const,
            image_url: {
              url: `data:${file.type};base64,${file.data}`,
              detail: "high" as const
            }
          }))
        ]
      }
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages,
      max_tokens: 4000,
      temperature: 0.1, // Low temperature for consistency in construction analysis
    });

    const analysis = response.choices[0].message.content;
    console.log('✅ Construction analysis completed');
    
    return analysis || "Analysis completed but no content was generated.";
    
  } catch (error) {
    console.error('❌ Construction analysis failed:', error);
    throw new Error(`Construction analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function GET() {
  try {
    // Check if OpenAI client can be initialized
    const client = getOpenAIClient();
    
    return NextResponse.json({
      status: 'EstimAItor Chat API is running',
      model: 'gpt-4.1-2025-04-14',
      environment: process.env.VERCEL ? 'Vercel' : process.env.NODE_ENV || 'development',
      openai_configured: true,
      capabilities: [
        'Construction document analysis',
        'Trade detection and mapping',
        'CSI Division classification',
        'Scope of Work generation',
        'Material Takeoff calculation',
        'GPT-4.1-2025-04-14 Vision integration'
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'EstimAItor Chat API - Configuration Error',
      environment: process.env.VERCEL ? 'Vercel' : process.env.NODE_ENV || 'development',
      openai_configured: false,
      error: error instanceof Error ? error.message : 'Unknown configuration error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
