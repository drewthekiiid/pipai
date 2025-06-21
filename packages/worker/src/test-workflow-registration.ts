#!/usr/bin/env node
/**
 * Test script to verify workflow registration
 */

import { NativeConnection, Worker } from '@temporalio/worker';
import { config } from 'dotenv';
import 'dotenv/config';
import { fileURLToPath } from 'url';

// Load environment variables from project root
config({ path: '../../../.env' });

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);

console.log('🧪 Testing Workflow Registration...');

async function testWorkflowRegistration() {
  try {
    // Create connection
    const address = process.env.TEMPORAL_ADDRESS || 'us-east-1.aws.api.temporal.io:7233';
    const namespace = process.env.TEMPORAL_NAMESPACE || 'pip-ai.ts7wf';
    const apiKey = process.env.TEMPORAL_API_KEY;

    console.log(`🔌 Connecting to: ${address}`);
    const connection = await NativeConnection.connect({
      address,
      tls: apiKey ? {} : undefined,
      apiKey,
    });
    console.log('✅ Connected successfully');

    // Create minimal worker to test workflow registration
    const worker = await Worker.create({
      connection,
      namespace,
      taskQueue: 'test-queue',
      workflowsPath: fileURLToPath(new URL('./workflows.js', import.meta.url)),
      activities: {}, // No activities for this test
      maxConcurrentActivityTaskExecutions: 1,
      maxConcurrentWorkflowTaskExecutions: 1,
    });

    console.log('✅ Worker created with workflow registration');
    console.log('🎯 Workflows should be registered and ready');
    
    // Close connection
    connection.close();
    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

testWorkflowRegistration();
