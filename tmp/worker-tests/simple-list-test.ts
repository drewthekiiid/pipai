/**
 * Simple test to list workflows
 */

import { Client, Connection } from '@temporalio/client';

async function run(): Promise<void> {
  console.log('🚀 Testing workflow listing...');
  
  const address = process.env.TEMPORAL_ADDRESS || 'us-east-1.aws.api.temporal.io:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'pip-ai.ts7wf';
  const apiKey = process.env.TEMPORAL_API_KEY;
  
  console.log(`📍 Address: ${address}`);
  console.log(`🏠 Namespace: ${namespace}`);
  console.log(`🔑 API Key: ${apiKey ? 'Set' : 'Missing'}`);

  if (!apiKey) {
    throw new Error('TEMPORAL_API_KEY is required');
  }

  try {
    // Connect
    const connection = await Connection.connect({
      address,
      tls: true,
      apiKey,
    });

    console.log('✅ Connected successfully');

    // Create client
    const client = new Client({
      connection,
      namespace,
    });

    console.log('✅ Client created');

    // Try to get the workflow we created with CLI
    try {
      const handle = client.workflow.getHandle('test-cli-123');
      const status = await handle.describe();
      console.log('✅ Found CLI workflow:', status.type);
    } catch (error) {
      const err = error as Error;
      console.log('❌ Could not access CLI workflow:', err.message);
    }

    await connection.close();
    console.log('✅ Connection closed');

  } catch (error) {
    console.error('💥 Failed:', error);
    process.exit(1);
  }
}

run().catch(console.error); 