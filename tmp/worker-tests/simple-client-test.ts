/**
 * Simple client to test workflow execution
 */

import { Client, Connection } from '@temporalio/client';
import { helloWorkflow } from './simple-workflows.js';

async function run(): Promise<void> {
  console.log('🚀 Testing workflow execution...');
  
  const address = process.env.TEMPORAL_ADDRESS || 'us-east-1.aws.api.temporal.io:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'pip-ai.ts7wf';
  const apiKey = process.env.TEMPORAL_API_KEY;
  
  console.log(`📍 Address: ${address}`);
  console.log(`🏠 Namespace: ${namespace}`);
  console.log(`🔑 API Key: ${apiKey ? 'Set' : 'Missing'}`);
  console.log(`🔍 API Key (first 50 chars): ${apiKey?.substring(0, 50)}`);
  console.log(`🔍 API Key length: ${apiKey?.length}`);

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

    // Start a simple workflow
    const handle = await client.workflow.start(helloWorkflow, {
      taskQueue: 'simple-test-queue',
      workflowId: 'simple-test-' + Date.now(),
      args: ['World'],
    });

    console.log(`✅ Workflow started: ${handle.workflowId}`);
    console.log('⏳ Waiting for result...');

    // Wait for result (with timeout)
    const result = await Promise.race([
      handle.result(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 30 seconds')), 30000)
      )
    ]);

    console.log(`🎉 Result: ${result}`);

    await connection.close();
    console.log('✅ Connection closed');

  } catch (error) {
    console.error('💥 Failed:', error);
    process.exit(1);
  }
}

run().catch(console.error); 