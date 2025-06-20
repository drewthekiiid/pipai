/**
 * Super Simple Temporal Worker Test
 * Just to verify connection works
 */

import { NativeConnection, Worker } from '@temporalio/worker';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as activities from './simple-activities.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run(): Promise<void> {
  console.log('🚀 Simple Test Worker Starting...');
  
  const address = process.env.TEMPORAL_ADDRESS || 'us-east-1.aws.api.temporal.io:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'pipai-fresh-1750378821.ts7wf';
  const apiKey = process.env.TEMPORAL_API_KEY;
  
  console.log(`📍 Address: ${address}`);
  console.log(`🏠 Namespace: ${namespace}`);
  console.log(`🔑 API Key: ${apiKey ? 'Set' : 'Missing'}`);

  if (!apiKey) {
    throw new Error('TEMPORAL_API_KEY is required');
  }

  try {
    // Connect
    const connection = await NativeConnection.connect({
      address,
      tls: true,
      apiKey,
    });

    console.log('✅ Connected successfully');

    // Create minimal worker
    const worker = await Worker.create({
      connection,
      namespace,
      taskQueue: 'simple-test-queue',
      workflowsPath: join(__dirname, 'simple-workflows.js'),
      activities,
    });

    console.log('✅ Simple worker created');
    console.log('🎯 Polling for tasks on simple-test-queue...');

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      worker.shutdown();
    });

    // Start
    await worker.run();
  } catch (error) {
    console.error('💥 Failed:', error);
    process.exit(1);
  }
}

run().catch(console.error); 