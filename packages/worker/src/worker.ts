/**
 * PIP AI Temporal Worker
 * Production-ready worker with error handling, metrics, and graceful shutdown
 */

import 'dotenv/config';
import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables from project root
dotenv.config({ path: '../../.env' });

// Debug: log environment variables
console.log('🔍 Environment Debug:');
console.log(`   TEMPORAL_ADDRESS: ${process.env.TEMPORAL_ADDRESS}`);
console.log(`   TEMPORAL_NAMESPACE: ${process.env.TEMPORAL_NAMESPACE}`);
console.log(`   TEMPORAL_API_KEY: ${process.env.TEMPORAL_API_KEY ? '***' : 'NOT_SET'}`);

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const config = {
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    apiKey: process.env.TEMPORAL_API_KEY,
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
      connectionOptions.tls = {}; // Empty TLS config for standard TLS
      connectionOptions.apiKey = config.temporal.apiKey;
      
      // Add gRPC channel args for Temporal Cloud compatibility
      connectionOptions.channelArgs = {
        'grpc.keepalive_time_ms': 30000,
        'grpc.keepalive_timeout_ms': 5000,
        'grpc.keepalive_permit_without_calls': true,
        'grpc.http2.max_pings_without_data': 0,
        'grpc.http2.min_time_between_pings_ms': 10000,
        'grpc.http2.min_ping_interval_without_data_ms': 300000,
      };
      
      console.log('   ✅ Using API key authentication with enhanced gRPC config');
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
    // Minimal worker configuration for maximum Temporal Cloud compatibility
    const worker = await Worker.create({
      connection,
      namespace: config.temporal.namespace,
      taskQueue: config.worker.taskQueue,
      workflowsPath: fileURLToPath(new URL('./workflows.js', import.meta.url)),
      activities,
      // Conservative settings for Temporal Cloud
      maxConcurrentActivityTaskExecutions: 1,
      maxConcurrentWorkflowTaskExecutions: 1,
      // Disable advanced features that might cause issues
      enableSDKTracing: false,
      debugMode: false,
    });

    console.log('✅ Worker created successfully');
    console.log(`   Task Queue: ${config.worker.taskQueue}`);
    console.log(`   Max Concurrent Activities: 1`);
    console.log(`   Max Concurrent Workflows: 1`);
    
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
