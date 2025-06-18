import { NextRequest, NextResponse } from 'next/server'
import { Connection, Client } from '@temporalio/client'

interface ChatRequest {
  message: string
  files?: Array<{ name: string; size: number; type: string }>
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      )
    }

    try {
      const connection = await Connection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
        tls: process.env.TEMPORAL_ADDRESS?.includes('tmprl.cloud') ? {} : false,
        connectTimeout: '3s',
      })

      const client = new Client({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || 'default',
      })

      const workflowId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const handle = await client.workflow.start('chatWorkflow', {
        args: [{ text: body.message, files: body.files || [] }],
        taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'pip-ai-task-queue',
        workflowId,
      })

      const result = await handle.result()

      return NextResponse.json({
        response: result.analysis || 'I processed your message successfully.',
        workflowId,
        timestamp: new Date().toISOString()
      })

    } catch (temporalError) {
      console.warn('Temporal connection failed, using fallback response:', temporalError)
      
      const mockResponse = generateMockResponse(body.message)
      
      return NextResponse.json({
        response: mockResponse,
        workflowId: `mock-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fallback: true
      })
    }

  } catch (error) {
    console.error('Chat API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function generateMockResponse(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('construction') || lowerMessage.includes('document') || lowerMessage.includes('analyze')) {
    return "I'd be happy to help you analyze construction documents! I can review blueprints, specifications, contracts, and other construction-related files to extract key insights, identify potential issues, and answer your questions. Please upload a document or ask me specific questions about your construction project."
  }
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('help')) {
    return "Hello! I'm PIP AI, your construction document analysis assistant. I can help you analyze construction documents, extract insights from blueprints and specifications, review contracts, and answer questions about your construction projects. How can I assist you today?"
  }
  
  if (lowerMessage.includes('cost') || lowerMessage.includes('budget') || lowerMessage.includes('estimate')) {
    return "I can help you analyze cost estimates and budget documents for construction projects. I can review line items, identify potential cost overruns, compare estimates, and help you understand pricing structures. Please share your cost documentation for detailed analysis."
  }
  
  return "Thank you for your message! I'm PIP AI, specialized in construction document analysis. I can help you review blueprints, specifications, contracts, cost estimates, and other construction-related documents. Please let me know what specific documents or questions you'd like me to help with."
}
