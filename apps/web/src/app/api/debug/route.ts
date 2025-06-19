import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    openaiKeyPresent: !!process.env.OPENAI_API_KEY,
    openaiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 20) + '...',
    assistantIdPresent: !!process.env.OPENAI_ASSISTANT_ID,
    assistantId: process.env.OPENAI_ASSISTANT_ID,
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('OPENAI') || 
      key.includes('AWS') || 
      key.includes('TEMPORAL')
    ).sort()
  };

  return NextResponse.json(envVars);
} 