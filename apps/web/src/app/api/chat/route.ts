/**
 * PIP AI Chat API - Follow-up Questions for Construction Analysis
 * POST /api/chat - Handle chat messages and scope generation requests
 */

import { NextRequest, NextResponse } from 'next/server';

// Configure route as dynamic for API functionality  
export const dynamic = 'force-dynamic';

interface ChatRequest {
  message: string;
  analysisContext?: {
    summary: string;
    insights: string[];
    extractedText: string;
    analysisId: string;
  };
}

interface ChatResponse {
  response: string;
  type: 'scope' | 'general' | 'error';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ChatRequest = await request.json();
    const { message, analysisContext } = body;

    console.log('💬 Chat request received:', {
      message: message.substring(0, 100) + '...',
      hasContext: !!analysisContext
    });

    // Detect if this is a scope-related request
    const isScopeRequest = detectScopeRequest(message);
    
    if (isScopeRequest && analysisContext) {
      console.log('🔧 Detected scope request, generating detailed SOW...');
      const scopeResponse = await generateScopeOfWork(message, analysisContext);
      
      return NextResponse.json({
        response: scopeResponse,
        type: 'scope'
      } as ChatResponse);
    }

    // For non-scope requests, provide helpful guidance
    const generalResponse = generateGeneralResponse(message, !!analysisContext);
    
    return NextResponse.json({
      response: generalResponse,
      type: 'general'
    } as ChatResponse);

  } catch (error) {
    console.error('❌ Chat API error:', error);
    
    return NextResponse.json({
      response: 'Sorry, I encountered an error processing your request. Please try again.',
      type: 'error'
    } as ChatResponse, { status: 500 });
  }
}

/**
 * Detect if the user message is requesting scope of work generation
 */
function detectScopeRequest(message: string): boolean {
  const scopeKeywords = [
    'scope', 'sow', 'scope of work', 'takeoff', 'material takeoff',
    'electrical scope', 'plumbing scope', 'hvac scope', 'csi',
    'division', 'generate scope', 'create scope', 'show scope',
    'electrical work', 'plumbing work', 'hvac work',
    'all scopes', 'all trades', 'trade scope'
  ];
  
  const lowerMessage = message.toLowerCase();
  return scopeKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Generate detailed scope of work using EstimAItor prompt
 */
async function generateScopeOfWork(message: string, context: {
  summary: string;
  insights: string[];
  extractedText: string;
  analysisId: string;
}): Promise<string> {
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('sk-your-')) {
    console.error('No valid OpenAI API key configured for scope generation');
    throw new Error('OpenAI API key not configured - cannot generate scope of work. Please configure OPENAI_API_KEY environment variable.');
  }

  try {
    console.log('🤖 Calling GPT-4o for scope generation...');
    
    // Initialize OpenAI client with dynamic import
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // EstimAItor prompt optimized for scope generation
    const estimatorPrompt = `You are EstimAItor, the Greatest Commercial Construction Estimator Ever.

CONTEXT: The user has already uploaded and analyzed construction documents. Here's the analysis summary:
${context.summary}

Key trades identified: ${context.insights.join(', ')}

CURRENT REQUEST: "${message}"

Your task is to generate detailed, contract-ready Scope of Work documents using this format:

PROJECT: [Extracted from context]
LOCATION: [City, State if available]
TRADE: [Specific trade requested]
CSI DIVISION: [Division Number – Division Name]
COST CODE: [Insert Cost Code]

COMPLIANCE CHECKLIST
☐ Reviewed all drawings, specifications, and applicable codes
☐ Includes all labor, materials, equipment, and supervision
☐ Responsible for verifying all quantities
☐ May not sublet or assign this scope without written approval
☐ Price is valid for 30 days

GENERAL CONDITIONS
☐ Includes applicable sales tax
☐ Includes all parking, tools, and logistics
☐ Badging and insurance per project requirements
☐ Manpower and schedule confirmed
☐ Coordination with other trades included

SCOPE OF WORK
[Category Name]
☐ [Task Description – Include plan/spec reference]
☐ [Task Description]

[Next Category]
☐ [Task Description]
☐ [Task Description]

CLEANUP & TURNOVER
☐ Area to be left broom clean
☐ All trade debris removed to GC-designated dumpster
☐ Final walkthrough and punch coordination included

MATERIAL TAKEOFF
TRADE: [Insert Trade]
CSI DIVISION: [Insert Division Number – Division Name]

ITEMS
[Quantity] [Unit] – [Material or Scope Item]
[Quantity] [Unit] – [Material or Scope Item]

NOTES
• Show math or quantity logic when helpful
• Flag unverified or estimated values
• Group materials by system, floor, or location

Generate the appropriate scope based on the user's request. If they ask for "all scopes" or "all trades", provide one detailed example and list the others available.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: estimatorPrompt
        },
        {
          role: "user",
          content: `Based on the construction analysis provided, please generate the requested scope of work: ${message}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.1, // Low temperature for consistent, professional output
    });

    const scopeContent = response.choices[0].message.content || 'Unable to generate scope at this time.';
    
    console.log('✅ GPT-4o scope generation completed:', {
      length: scopeContent.length,
      preview: scopeContent.substring(0, 200) + '...'
    });

    return scopeContent;

  } catch (error) {
    console.error('❌ Scope generation failed:', error);
    throw new Error(`Scope generation failed: ${error instanceof Error ? error.message : 'Unknown OpenAI error'}. No fallback scope will be generated.`);
  }
}





/**
 * Generate general responses for non-scope requests
 */
function generateGeneralResponse(message: string, hasContext: boolean): string {
  if (!hasContext) {
    return `I'd be happy to help! However, I need some context from a construction document analysis first. 

Please upload your construction documents to get started, then I can help you with:
• Generate scope of work documents
• Create material takeoffs
• CSI division breakdowns
• Trade-specific analysis

Once you have analysis results, you can ask me things like:
• "Generate electrical scope of work"
• "Show me HVAC takeoffs"
• "All scopes in CSI order"`;
  }

  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('help') || lowerMessage.includes('what can')) {
    return `Based on your construction document analysis, I can help you generate:

🔧 **Scope of Work Documents**
• "Generate electrical scope"
• "Create HVAC scope of work"
• "Show plumbing scope"

📋 **Material Takeoffs**
• "Electrical takeoffs"
• "HVAC material list"
• "All takeoffs in CSI order"

📊 **Trade-Specific Analysis**
• "Focus on Division 26"
• "Electrical coordination items"
• "All scopes in CSI order"

Just ask for what you need!`;
  }

  return `I understand you're asking about "${message}". 

To generate detailed construction scopes and takeoffs, try asking:
• "Generate scope of work for [trade]"
• "Show material takeoffs for [trade]"
• "All scopes in CSI order"
• "Create electrical scope"

I can create contract-ready scope documents with checklists, takeoffs, and CSI formatting based on your analyzed construction documents.`;
}

export async function GET() {
  return NextResponse.json({
    status: 'Chat API is running',
    timestamp: new Date().toISOString(),
  });
}
