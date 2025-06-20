/**
 * PIP AI Temporal Worker - Simplified Version for Debugging
 */

import 'dotenv/config';
import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from '@pipai/worker/activities.js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from project root
dotenv.config({ path: '../../.env' });

// Debug: log environment variables
console.log('🔍 Environment Debug:');
console.log(`   TEMPORAL_ADDRESS: ${process.env.TEMPORAL_ADDRESS}`);
console.log(`   TEMPORAL_NAMESPACE: ${process.env.TEMPORAL_NAMESPACE}`);
console.log(`   TEMPORAL_API_KEY: ${process.env.TEMPORAL_API_KEY ? '***' : 'NOT_SET'}`);

const config = {
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'us-east-1.aws.api.temporal.io:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'pip-ai.ts7wf',
    apiKey: process.env.TEMPORAL_API_KEY,
  },
  worker: {
    taskQueue: 'pip-ai-task-queue',
  }
};

async function createConnection(): Promise<NativeConnection> {
  console.log('🔌 Connecting to Temporal...');
  console.log(`   Address: ${config.temporal.address}`);
  console.log(`   Namespace: ${config.temporal.namespace}`);

  if (!config.temporal.apiKey) {
    throw new Error('TEMPORAL_API_KEY is required');
  }

  // Enhanced TLS configuration for Temporal Cloud
  const connectionOptions: any = {
    address: config.temporal.address,
    tls: {
      // Empty TLS config - Temporal Cloud uses standard TLS
    },
    apiKey: config.temporal.apiKey,
  };

  // Add gRPC channel args for Temporal Cloud compatibility
  // This helps with authority header issues mentioned in GitHub issues
  connectionOptions.channelArgs = {
    'grpc.keepalive_time_ms': 30000,
    'grpc.keepalive_timeout_ms': 5000,
    'grpc.keepalive_permit_without_calls': true,
    'grpc.http2.max_pings_without_data': 0,
    'grpc.http2.min_time_between_pings_ms': 10000,
    'grpc.http2.min_ping_interval_without_data_ms': 300000,
  };

  console.log('🔧 Connection options:', JSON.stringify(connectionOptions, null, 2));

  const connection = await NativeConnection.connect(connectionOptions);

  console.log('✅ Connected to Temporal successfully');
  return connection;
}

async function createWorker(connection: NativeConnection): Promise<Worker> {
  console.log('🏗️ Creating Temporal worker...');

  const worker = await Worker.create({
    connection,
    namespace: config.temporal.namespace,
    taskQueue: config.worker.taskQueue,
    workflowsPath: fileURLToPath(new URL('./workflows.js', import.meta.url)),
    activities,
    maxConcurrentActivityTaskExecutions: 2,
    maxConcurrentWorkflowTaskExecutions: 2,
  });

  console.log('✅ Worker created successfully');
  return worker;
}

async function run(): Promise<void> {
  console.log('🚀 Starting PIP AI Temporal Worker (Simplified)...');

  try {
    const connection = await createConnection();
    const worker = await createWorker(connection);

    // Setup graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      worker.shutdown();
      process.exit(0);
    });

    console.log('🎯 Worker is ready and listening for tasks...');
    await worker.run();

  } catch (error) {
    console.error('💥 Worker failed:', error);
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
