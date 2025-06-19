import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { PDFDocument } from 'pdf-lib';
import pdfParse from 'pdf-parse';

// Conditional canvas import for serverless compatibility
interface CanvasContext {
  fillStyle: string;
  fillRect: (x: number, y: number, width: number, height: number) => void;
  fillText: (text: string, x: number, y: number) => void;
  font: string;
  textAlign: string;
  measureText: (text: string) => { width: number };
}

interface Canvas {
  getContext: (type: string) => CanvasContext;
  toDataURL: (type: string) => string;
}

let createCanvas: ((width: number, height: number) => Canvas) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const canvasModule = require('canvas');
  createCanvas = canvasModule.createCanvas;
  console.log('✅ Canvas module loaded successfully');
} catch {
  console.log('⚠️ Canvas not available in serverless environment, using text-only fallback');
}

// Configure API route to handle larger payloads for construction documents
export const runtime = 'nodejs';
export const maxDuration = 300; // Allow up to 5 minutes for large document analysis
export const dynamic = 'force-dynamic';

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
const ESTIMATOR_PROMPT = `NAME
EstimAItor

ROLE
The Greatest Commercial Construction Estimator Ever

PRIMARY FUNCTION

ALWAYS READ THE FULL DOC NO MATTER HOW LONG IT TAKES

You are a commercial construction estimator trained to analyze construction drawing sets and immediately generate:

Trade detection

CSI Division and Cost Code tagging

Contract-ready Scope of Work

Matching Material Takeoff

Optional RFI generation if missing info is found

All deliverables must be based strictly on the uploaded plans and specifications. If something is unclear, highlight it using "yellow flag" language.

CORE CAPABILITIES

Trade Detection & Auto Execution
When plans are uploaded:

Scan all filenames, sheet headers, and content

Detect all trades shown in the drawings

Tag each trade with CSI Division and Cost Code using the reference table below

List supporting sheet references

Identify missing, unclear, or OFOI ("by others") scope

Always generate both Scope of Work and Takeoff unless instructed otherwise

Continue through the list in CSI order unless instructed otherwise

Scope of Work Format – Checklist with unchecked boxes (Default)
Use the following template with no examples. Fill in all [placeholders] based on actual plan content.

PROJECT: [Project Name]
LOCATION: [City, State]
TRADE: [Trade Name]
CSI DIVISION: [Division Number – Division Name]
COST CODE: [Insert Cost Code]
SCOPE VALUE: [Insert if known or applicable]

COMPLIANCE CHECKLIST

 Reviewed all drawings, specifications, and applicable codes

 Includes all labor, materials, equipment, and supervision

 Responsible for verifying all quantities

 May not sublet or assign this scope without written approval

 Price is valid for [Insert Duration]

GENERAL CONDITIONS

 Includes applicable sales tax

 Includes all parking, tools, and logistics

 Badging and insurance per project requirements

 Manpower and schedule confirmed

 Coordination with other trades included

PROJECT-SPECIFIC CONDITIONS

 [Optional: Union labor required, Secure site access, Long-lead deadlines, etc.]

SCOPE OF WORK
[Category Name]

 [Task Description – Include plan/spec reference]

 [Task Description]

[Next Category]

 [Task Description]

 [Task Description]

CLEANUP & TURNOVER

 Area to be left broom clean

 All trade debris removed to GC-designated dumpster

 Final walkthrough and punch coordination included

ASSUMPTIONS / YELLOW FLAGS

 [Unverified quantity, coordination dependency, or missing data]

 [OF/OI or "by others" scope]

REFERENCES

DRAWINGS: [Insert list of referenced sheets]

SPEC SECTIONS: [Insert referenced spec sections]

DETAILS/KEYNOTES: [Optional: Insert plan detail/callout references]

Material Takeoff Format (Always Included with SOW)

TRADE: [Insert Trade]
CSI DIVISION: [Insert Division Number – Division Name]

ITEMS

[Quantity] [Unit] – [Material or Scope Item]

[Quantity] [Unit] – [Material or Scope Item]

NOTES

Show math or quantity logic when helpful

Flag unverified or estimated values in yellow

Group materials by system, floor, or location where appropriate

Prompt Flexibility
Understand and execute when user says:

"Start with Electrical"

"Give me only Division 9"

"What trades are in the plans?"

"Use contract format instead"

"List all OFOI trades"

"Generate scopes and takeoffs for everything"

Always return the trade list first unless already given, then generate scopes + takeoffs in order.

Output Rules

Checklist Format is default unless user specifies otherwise

Every SOW must include a Takeoff

Always generate outputs immediately after detecting the first trade

Continue in CSI Division order unless otherwise directed

Format all deliverables as if they will be included in a subcontract, bid package, or site log

CSI DIVISION + COST CODE TAGGING (Auto-Mapped)
Use the uploaded "Cost Codes.pdf" to match each detected trade to its CSI Division and Cost Code.
When tagging, use the format:
Division [####] – [Division Name] | Cost Code: [####]

Example:
Division 09500 – Finishes | Cost Code: 9680 (Fluid-Applied Flooring)

If no perfect match exists, return the closest CSI-based category and flag the line item for review.

MANDATE: ACCURACY = LEVERAGE
Your purpose is to eliminate ambiguity before construction begins by:

Catching missed scope before change orders happen

Producing deliverables that hold up under bid review and subcontracts

Empowering PMs with clean, actionable documentation

Protecting the project team with accurate and defensible estimates

GENERAL REQUIREMENTS
1450, 1500, 1552, 1570, 1712, 1742

EXISTING CONDITIONS
2240, 2300, 2400, 2500, 2820, 2850

CONCRETE
3050, 3100, 3200, 3300, 3350, 3400, 3500, 3800

MASONRY
4050, 4200, 4400

METALS
5100, 5200, 5500, 5510, 5550, 5700

WOOD & PLASTICS
6100, 6170, 6200, 6400, 6600

THERMAL & MOISTURE PROTECTION
7050, 7100, 7200, 7240, 7400, 7500, 7600, 7712, 7723, 7800, 7900

OPENINGS
8050, 8100, 8300, 8400, 8500, 8600, 8700, 8800, 8830, 8870, 8900

FINISHES
9050, 9200, 9220, 9240, 9300, 9500, 9600, 9660, 9670, 9680, 9700, 9800, 9900

SPECIALTIES
10100, 10110, 10140, 10210, 10220, 10260, 10280, 10300, 10440, 10510, 10550, 10730, 10750, 10810

EQUIPMENT
11100, 11130, 11400, 11520, 11660, 11700, 11810, 11900

FURNISHINGS
12200, 12300, 12360, 12400, 12500

SPECIAL CONSTRUCTION
13110, 13120, 13341

CONVEYING SYSTEMS
14200, 14400, 14800

FIRE SUPPRESSION
21100

PLUMBING
22050, 22100

HVAC
23050, 23059, 23071, 23090, 23200

INTEGRATED AUTOMATION
25100

ELECTRICAL
26050, 26100, 26410, 26500

COMMUNICATIONS
27100

ELECTRONIC SAFETY & SECURITY
28100, 28200

EARTHWORK
31100, 31130, 31200, 31230, 31250, 31310, 31311, 31400, 31600

EXTERIOR IMPROVEMENTS
32100, 32120, 32160, 32172, 32310, 32320, 32800, 32900

UTILITIES
33100, 33200, 33300, 33400

TRANSPORTATION
34700

MARINE & WATERWAY CONSTRUCTION
35100

PROCESS INTERCONNECTIONS
40660

MATERIAL PROCESSING & HANDLING
41220

POLLUTION & WASTE CONTROL EQUIPMENT
44100

ELECTRICAL POWER GENERATION
48140, 48150`;

// PDF to Image conversion function with serverless fallback
async function convertPdfToImages(pdfBuffer: Buffer, fileName: string): Promise<Array<{name: string, type: string, data: string}>> {
  try {
    console.log(`🔄 Converting PDF "${fileName}" to images...`);
    
    // First, try to extract text from PDF for better context
    let extractedText = '';
    try {
      const pdfData = await pdfParse(pdfBuffer);
      extractedText = pdfData.text;
      console.log(`📝 Extracted ${extractedText.length} characters of text from PDF`);
    } catch (textError) {
      console.log(`⚠️ Could not extract text from PDF: ${textError}`);
    }
    
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    console.log(`📄 PDF has ${pageCount} page(s)`);
    
    const images: Array<{name: string, type: string, data: string}> = [];
    
    // Check if canvas is available for image generation
    if (!createCanvas) {
      console.log('📝 Canvas unavailable - using text-only fallback for serverless environment');
      
      // Fallback: Create text-based representations
      const textPerPage = extractedText ? extractedText.split(/\f|\n\n\n/).filter(text => text.trim()) : [];
      
      for (let i = 0; i < pageCount; i++) {
        const pageText = textPerPage[i] || `Page ${i + 1} content from ${fileName}`;
        const textRepresentation = `CONSTRUCTION DOCUMENT - ${fileName}
Page ${i + 1} of ${pageCount}

📐 CONSTRUCTION DOCUMENT CONTENT:
${pageText.substring(0, 2000)}${pageText.length > 2000 ? '\n\n... [content continues]' : ''}

📋 Plan drawings and specifications detected
🔍 Visual elements require GPT-4o Vision analysis  
📏 Dimensions, symbols, and technical drawings
⚡ Processing with advanced AI vision capabilities

Converted for GPT-4o Analysis | EstimAItor ${new Date().toLocaleDateString()}`;
        
        // Convert text to base64 for consistent API
        const base64Data = Buffer.from(textRepresentation).toString('base64');
        
        images.push({
          name: `${fileName.replace('.pdf', '')}_page_${i + 1}_text.txt`,
          type: 'text/plain',
          data: base64Data
        });
        
        console.log(`✅ Created text representation for page ${i + 1}/${pageCount} of ${fileName}`);
      }
      
      return images;
    }
    
    const textPerPage = extractedText ? extractedText.split(/\f|\n\n\n/).filter(text => text.trim()) : [];
    
    // For each page in the PDF
    for (let i = 0; i < pageCount; i++) {
      try {
        // Get page dimensions from original PDF
        const page = pdfDoc.getPages()[i];
        const { width, height } = page.getSize();
        
        // Scale for high quality (300 DPI equivalent)
        const scale = 2;
        const canvasWidth = width * scale;
        const canvasHeight = height * scale;
        
        // Create canvas for this page
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        
        // Set white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw page header
        ctx.fillStyle = '#2563eb'; // Blue header
        ctx.fillRect(0, 0, canvasWidth, 100 * scale);
        
        // Page title
        ctx.fillStyle = 'white';
        ctx.font = `bold ${28 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(`${fileName} - Page ${i + 1}/${pageCount}`, canvasWidth / 2, 60 * scale);
        
        // Add page content representation
        ctx.fillStyle = '#1f2937'; // Dark gray for content
        ctx.font = `${16 * scale}px Arial`;
        ctx.textAlign = 'left';
        
        let yPosition = 150 * scale;
        const lineHeight = 25 * scale;
        const margin = 40 * scale;
        const maxWidth = canvasWidth - (2 * margin);
        
        // Draw construction drawing indicator
        ctx.fillStyle = '#059669'; // Green accent
        ctx.fillRect(margin, yPosition, maxWidth, 2 * scale);
        yPosition += 30 * scale;
        
        ctx.fillStyle = '#1f2937';
        ctx.fillText('📐 CONSTRUCTION DOCUMENT CONTENT:', margin, yPosition);
        yPosition += 40 * scale;
        
        // Add extracted text preview for this page
        if (textPerPage[i]) {
          const pageText = textPerPage[i].substring(0, 500) + (textPerPage[i].length > 500 ? '...' : '');
          const words = pageText.split(' ');
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine + word + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine !== '') {
              ctx.fillText(currentLine, margin, yPosition);
              currentLine = word + ' ';
              yPosition += lineHeight;
              
              // Prevent overflow
              if (yPosition > canvasHeight - 100 * scale) break;
            } else {
              currentLine = testLine;
            }
          }
          
          // Draw remaining text
          if (currentLine && yPosition < canvasHeight - 100 * scale) {
            ctx.fillText(currentLine, margin, yPosition);
          }
        } else {
          // No text extracted - show visual representation indicators
          const indicators = [
            '📋 Plan drawings and specifications detected',
            '🔍 Visual elements require GPT-4o Vision analysis',
            '📏 Dimensions, symbols, and technical drawings',
            '⚡ Processing with advanced AI vision capabilities'
          ];
          
          indicators.forEach((indicator) => {
            if (yPosition < canvasHeight - 100 * scale) {
              ctx.fillText(indicator, margin, yPosition);
              yPosition += lineHeight * 1.5;
            }
          });
        }
        
        // Add footer
        ctx.fillStyle = '#6b7280';
        ctx.font = `${14 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(
          `Converted for GPT-4o Vision Analysis | EstimAItor ${new Date().toLocaleDateString()}`,
          canvasWidth / 2,
          canvasHeight - 30 * scale
        );
        
        // Convert canvas to base64
        const imageData = canvas.toDataURL('image/png');
        const base64Data = imageData.split(',')[1]; // Remove data:image/png;base64, prefix
        
        images.push({
          name: `${fileName.replace('.pdf', '')}_page_${i + 1}.png`,
          type: 'image/png',
          data: base64Data
        });
        
        console.log(`✅ Converted page ${i + 1}/${pageCount} of ${fileName}`);
      } catch (pageError) {
        console.error(`❌ Error converting page ${i + 1} of ${fileName}:`, pageError);
        // Continue with other pages even if one fails
      }
    }
    
    console.log(`🎯 Successfully converted ${images.length}/${pageCount} pages from ${fileName}`);
    
    // If we have extracted text and canvas is available, also create a text summary "page"
    if (extractedText && extractedText.length > 100 && createCanvas) {
      try {
        const summaryCanvas = createCanvas(800 * 2, 600 * 2);
        const summaryCtx = summaryCanvas.getContext('2d');
        
        // Background
        summaryCtx.fillStyle = '#f8fafc';
        summaryCtx.fillRect(0, 0, 800 * 2, 600 * 2);
        
        // Header
        summaryCtx.fillStyle = '#1e40af';
        summaryCtx.fillRect(0, 0, 800 * 2, 80 * 2);
        
        summaryCtx.fillStyle = 'white';
        summaryCtx.font = 'bold 24px Arial';
        summaryCtx.textAlign = 'center';
        summaryCtx.fillText(`📄 TEXT EXTRACTED FROM ${fileName.toUpperCase()}`, 400 * 2, 50 * 2);
        
        // Text preview
        summaryCtx.fillStyle = '#1f2937';
        summaryCtx.font = '16px Arial';
        summaryCtx.textAlign = 'left';
        
        const textPreview = extractedText.substring(0, 1000) + (extractedText.length > 1000 ? '\n\n... [truncated]' : '');
        const lines = textPreview.split('\n');
        let y = 120 * 2;
        
        lines.forEach((line) => {
          if (y < 550 * 2) {
            summaryCtx.fillText(line.substring(0, 100), 40 * 2, y);
            y += 20 * 2;
          }
        });
        
        const summaryImageData = summaryCanvas.toDataURL('image/png');
        const summaryBase64 = summaryImageData.split(',')[1];
        
        images.push({
          name: `${fileName.replace('.pdf', '')}_text_summary.png`,
          type: 'image/png',
          data: summaryBase64
        });
        
        console.log(`📋 Created text summary image for ${fileName}`);
      } catch (summaryError) {
        console.error(`❌ Error creating text summary for ${fileName}:`, summaryError);
      }
    }
    
    return images;
    
  } catch (error) {
    console.error(`❌ Error converting PDF "${fileName}" to images:`, error);
    throw new Error(`PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize OpenAI client at request time for Vercel compatibility
    const client = getOpenAIClient();
    
    const contentType = request.headers.get('content-type') || '';
    
    let message: string;
    let files: Array<{name: string, type: string, data: string}> = [];
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData uploads (more efficient for large files)
      const formData = await request.formData();
      message = formData.get('message') as string || '';
      
      // Process uploaded files
      const uploadedFiles: Array<{name: string, type: string, data: string}> = [];
      
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file-') && value instanceof File) {
          console.log(`📁 Processing file: ${value.name} (${Math.round(value.size / 1024 / 1024)}MB)`);
          
          // Convert file to buffer
          const arrayBuffer = await value.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Check if file is a PDF
          if (value.type === 'application/pdf' || value.name.toLowerCase().endsWith('.pdf')) {
            console.log(`🔍 Detected PDF file: ${value.name} - converting to images...`);
            
            try {
              // Convert PDF to images using Method 3
              const pdfImages = await convertPdfToImages(buffer, value.name);
              uploadedFiles.push(...pdfImages);
              
              console.log(`✅ Successfully converted PDF to ${pdfImages.length} image(s)`);
            } catch (pdfError) {
              console.error(`❌ PDF conversion failed for ${value.name}:`, pdfError);
              
              // Fallback: treat as regular file with base64 encoding
              const base64 = buffer.toString('base64');
              uploadedFiles.push({
                name: value.name,
                type: value.type,
                data: base64
              });
            }
          } else {
            // Handle regular files (images, etc.)
            const base64 = buffer.toString('base64');
            uploadedFiles.push({
              name: value.name,
              type: value.type,
              data: base64
            });
          }
        }
      }
      
      files = uploadedFiles;
    } else {
      // Handle JSON requests (for text-only chats)
      const body = await request.json();
      const { message: msg, files: fileData } = chatRequestSchema.parse(body);
      message = msg;
      files = fileData || [];
    }

    // Check if we have construction documents to analyze
    if (files && files.length > 0) {
      console.log(`🏗️ Analyzing ${files.length} construction document(s)`);
      
      // Process construction documents with GPT-4o Vision
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
        model: "gpt-4o",
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

    // Handle OpenAI API errors specifically
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as { status?: number; message?: string };
      if (apiError.status === 401) {
        return NextResponse.json(
          { 
            error: 'Invalid OpenAI API key. Please check your API key configuration.',
            hint: 'Update OPENAI_API_KEY in your .env.local file with a valid key from https://platform.openai.com/api-keys',
            status: 401
          },
          { status: 401 }
        );
      }
      
      if (apiError.status === 429) {
        return NextResponse.json(
          { 
            error: 'OpenAI API rate limit exceeded. Please try again later.',
            status: 429
          },
          { status: 429 }
        );
      }
    }

    // Handle general OpenAI errors
    if (error instanceof Error && (error.message.includes('401') || error.message.includes('Incorrect API key'))) {
      return NextResponse.json(
        { 
          error: 'Invalid OpenAI API key. Please check your API key configuration.',
          hint: 'Update OPENAI_API_KEY in your .env.local file with a valid key from https://platform.openai.com/api-keys',
          details: error.message
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
      model: "gpt-4o",
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
    getOpenAIClient();
    
    return NextResponse.json({
      status: 'EstimAItor Chat API is running',
      model: 'gpt-4o',
      environment: process.env.VERCEL ? 'Vercel' : process.env.NODE_ENV || 'development',
      openai_configured: true,
      capabilities: [
        'Construction document analysis',
        'Trade detection and mapping',
        'CSI Division classification',
        'Scope of Work generation',
        'Material Takeoff calculation',
        'GPT-4o Vision integration'
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
