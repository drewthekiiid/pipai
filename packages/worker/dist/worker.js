/**
 * PIP AI Temporal Worker - Minimal Configuration for Temporal Cloud
 * Simplified to avoid "Unimplemented" errors
 */
import { NativeConnection, Worker } from '@temporalio/worker';
import dotenv from 'dotenv';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import * as activities from './activities.js';
// Load environment variables
dotenv.config({ path: '../../.env' });
console.log('🔍 Environment Debug:');
console.log(`   TEMPORAL_ADDRESS: ${process.env.TEMPORAL_ADDRESS}`);
console.log(`   TEMPORAL_NAMESPACE: ${process.env.TEMPORAL_NAMESPACE}`);
console.log(`   TEMPORAL_API_KEY: ${process.env.TEMPORAL_API_KEY ? '***' : 'NOT_SET'}`);
// Simple configuration for Temporal Cloud
const config = {
    temporal: {
        address: process.env.TEMPORAL_ADDRESS || 'us-east-1.aws.api.temporal.io:7233',
        namespace: process.env.TEMPORAL_NAMESPACE || 'pip-ai.ts7wf',
        apiKey: process.env.TEMPORAL_API_KEY,
    },
    taskQueue: 'pip-ai-task-queue',
};
async function createConnection() {
    console.log('🔌 Connecting to Temporal Cloud...');
    console.log(`   Address: ${config.temporal.address}`);
    console.log(`   Namespace: ${config.temporal.namespace}`);
    try {
        // Explicit configuration for Temporal Cloud with v1.10.3 SDK
        const connectionOptions = {
            address: config.temporal.address,
            tls: {
            // Explicitly enable TLS for Temporal Cloud
            },
        };
        // Add API key authentication for Temporal Cloud
        if (config.temporal.apiKey) {
            connectionOptions.apiKey = config.temporal.apiKey;
            console.log('   ✅ Using Temporal Cloud API key authentication');
        }
        else {
            throw new Error('TEMPORAL_API_KEY is required for Temporal Cloud');
        }
        const connection = await NativeConnection.connect(connectionOptions);
        console.log('✅ Connected to Temporal Cloud successfully');
        return connection;
    }
    catch (error) {
        console.error('❌ Failed to connect:', error);
        throw error;
    }
}
async function createWorker(connection) {
    console.log('🏗️  Creating minimal worker for Temporal Cloud...');
    try {
        // MINIMAL configuration - no advanced settings that might cause "Unimplemented" 
        const worker = await Worker.create({
            connection,
            namespace: config.temporal.namespace,
            taskQueue: config.taskQueue,
            workflowsPath: fileURLToPath(new URL('./workflows.js', import.meta.url)),
            activities,
            // Keep it simple - no advanced settings!
        });
        console.log('✅ Minimal worker created successfully');
        console.log(`   Task Queue: ${config.taskQueue}`);
        return worker;
    }
    catch (error) {
        console.error('❌ Failed to create worker:', error);
        throw error;
    }
}
async function run() {
    console.log('🚀 Starting PIP AI Temporal Worker (Minimal Config)...');
    console.log(`   Node.js: ${process.version}`);
    try {
        const connection = await createConnection();
        const worker = await createWorker(connection);
        // Setup graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down gracefully...');
            worker.shutdown();
        });
        console.log('\n🎯 Worker ready and polling for tasks...');
        console.log(`   Task Queue: ${config.taskQueue}`);
        console.log('   Press Ctrl+C to shutdown\n');
        // Start processing
        await worker.run();
    }
    catch (error) {
        console.error('💥 Worker failed:', error);
        process.exit(1);
    }
}
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection:', reason);
    process.exit(1);
});
// Start the worker
run().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=worker.js.map