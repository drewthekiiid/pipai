/**
 * PIP AI Temporal Worker
 * Production-ready worker with error handling, metrics, and graceful shutdown
 */

import { NativeConnection, Worker } from '@temporalio/worker';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import * as activities from './activities.js';

// Load environment variables from project root - MUST be first to override defaults
dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../.env.local', override: true }); // Allow local overrides

// Debug: log environment variables
console.log('🔍 Environment Debug:');
console.log(`   TEMPORAL_ADDRESS: ${process.env.TEMPORAL_ADDRESS}`);
console.log(`   TEMPORAL_NAMESPACE: ${process.env.TEMPORAL_NAMESPACE}`);
console.log(`   TEMPORAL_API_KEY: ${process.env.TEMPORAL_API_KEY ? '***' : 'NOT_SET'}`);
console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '***' : 'NOT_SET'}`);
console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '***' : 'NOT_SET'}`);
console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '***' : 'NOT_SET'}`);
console.log(`   AWS_REGION: ${process.env.AWS_REGION || 'NOT_SET'}`);
console.log(`   Environment files loaded: ../../.env, ../../.env.local`);

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const config = {
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'us-east-1.aws.api.temporal.io:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'pip-ai.ts7wf',
    apiKey: process.env.TEMPORAL_API_KEY || '',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'pip-ai-task-queue',
  },
  worker: {
    taskQueue: 'pip-ai-task-queue',
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 10,
  },
  app: {
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  }
};

// Metrics tracking
let metricsData = {
  startTime: Date.now(),
  activitiesExecuted: 0,
  workflowsExecuted: 0,
  errors: 0,
};

async function createConnection(): Promise<NativeConnection> {
  console.log('🔌 Connecting to Temporal...');
  console.log(`   Address: ${config.temporal.address}`);
  console.log(`   Namespace: ${config.temporal.namespace}`);
  console.log(`   Environment: ${config.app.environment}`);

  try {
    const connectionOptions: any = {
      address: config.temporal.address,
    };

    // Configure TLS and authentication for Temporal Cloud
    if (config.temporal.address.includes('temporal.io')) {
      connectionOptions.tls = true; // Use boolean true for API key authentication
      connectionOptions.apiKey = config.temporal.apiKey;
      console.log('   ✅ Using Temporal Cloud with TLS and API key authentication');
    }

    const connection = await NativeConnection.connect(connectionOptions);
    console.log('✅ Connected to Temporal successfully');
    
    return connection;

  } catch (error) {
    console.error('❌ Failed to connect to Temporal:', error);
    throw error;
  }
}

async function createWorker(connection: NativeConnection): Promise<Worker> {
  console.log('🏗️  Creating Temporal worker...');

  try {
    // Determine the workflows path based on execution context
    const isCompiledVersion = __filename.includes('/dist/');
    const workflowsPath = isCompiledVersion
      ? fileURLToPath(new URL('./workflows.js', import.meta.url))  // Use .js for compiled version
      : fileURLToPath(new URL('./workflows.ts', import.meta.url)); // Use .ts for dev/tsx version

    console.log(`   Using workflows path: ${workflowsPath}`);

    // Create and configure Temporal worker with MAXIMUM PERFORMANCE settings for 16 CPUs + 32GB RAM
    const worker = await Worker.create({
      connection: connection,
      namespace: config.temporal.namespace,
      taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'pip-ai-task-queue',
      workflowsPath,
      activities,
      // 🚀 MAXIMUM PARALLELIZATION: Fully utilize 16 CPUs + 32GB RAM
      maxConcurrentActivityTaskExecutions: 500, // EXTREME AUTO-SCALE: Handle up to 500 activities for massive parallel processing
      maxConcurrentWorkflowTaskExecutions: 100,  // Handle 100 concurrent workflows for extreme throughput
      // Polling settings for maximum task pickup speed
      maxConcurrentActivityTaskPolls: 50,       // Maximum polling for instant task pickup
      maxConcurrentWorkflowTaskPolls: 20,        // Increased to 20 for maximum workflow throughput
      // Heartbeat settings optimized for high-performance processing
      maxHeartbeatThrottleInterval: '10s',       // Faster heartbeats for better monitoring
      defaultHeartbeatThrottleInterval: '5s',    // More responsive heartbeats
      // Disable advanced features for maximum stability and performance
      enableSDKTracing: false,
      debugMode: false
    });

    console.log('✅ Worker created successfully - MAXIMUM PERFORMANCE MODE');
    console.log(`   Task Queue: ${process.env.TEMPORAL_TASK_QUEUE || 'pip-ai-task-queue'}`);
    console.log(`   Max Concurrent Activities: 500 (EXTREME AUTO-SCALE: 16 CPUs + 32GB RAM)`);
    console.log(`   Max Concurrent Workflows: 100`);
    console.log(`   Activity Polls: 50 | Workflow Polls: 20`);
    
    return worker;

  } catch (error) {
    console.error('❌ Failed to create worker:', error);
    throw error;
  }
}

function setupGracefulShutdown(worker: Worker): void {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    try {
      // Stop accepting new work
      worker.shutdown();
      console.log('✅ Worker shutdown initiated');
      
      // Print final metrics
      const uptime = Date.now() - metricsData.startTime;
      console.log('\n📊 Final Metrics:');
      console.log(`   Uptime: ${Math.floor(uptime / 1000)}s`);
      console.log(`   Activities Executed: ${metricsData.activitiesExecuted}`);
      console.log(`   Workflows Executed: ${metricsData.workflowsExecuted}`);
      console.log(`   Errors: ${metricsData.errors}`);
      
      console.log('\n👋 Worker stopped gracefully');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

function startMetricsReporting(): void {
  // Report metrics every 60 seconds
  setInterval(() => {
    const uptime = Date.now() - metricsData.startTime;
    console.log('\n📊 Worker Metrics:');
    console.log(`   Uptime: ${Math.floor(uptime / 1000)}s`);
    console.log(`   Activities Executed: ${metricsData.activitiesExecuted}`);
    console.log(`   Workflows Executed: ${metricsData.workflowsExecuted}`);
    console.log(`   Errors: ${metricsData.errors}`);
    console.log(`   Activities/min: ${Math.round((metricsData.activitiesExecuted / uptime) * 60000)}`);
  }, 60000);
}

async function run(): Promise<void> {
  console.log('🚀 Starting PIP AI Temporal Worker...');
  console.log(`   Version: ${process.env.npm_package_version || 'unknown'}`);
  console.log(`   Node.js: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);

  try {
    // Create connection and worker
    const connection = await createConnection();
    const worker = await createWorker(connection);

    // Setup monitoring and shutdown handling
    setupGracefulShutdown(worker);
    startMetricsReporting();

    console.log('\n🎯 Worker is ready and listening for tasks...');
    console.log(`   Task Queue: ${config.worker.taskQueue}`);
    console.log(`   Press Ctrl+C to shutdown gracefully\n`);

    // Start processing
    await worker.run();

  } catch (error) {
    console.error('💥 Worker startup failed:', error);
    
    if (error instanceof Error) {
      console.error('   Error Details:', error.message);
      console.error('   Stack:', error.stack);
    }
    
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the worker
run().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
