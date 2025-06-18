#!/usr/bin/env node
/**
 * Node.js Client to test workflow execution directly
 * This should bypass the Python-Node.js compatibility issue
 */
import 'dotenv/config';
import { Client, Connection } from '@temporalio/client';
import { config } from 'dotenv';
// Load environment variables from project root
config({ path: '../../../.env' });
console.log('🧪 Testing Workflow Execution with Node.js Client...');
async function testWorkflowExecution() {
    try {
        // Create connection
        const connectionOptions = {
            address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
        };
        if (connectionOptions.address.includes('temporal.io')) {
            connectionOptions.tls = {};
            connectionOptions.apiKey = process.env.TEMPORAL_API_KEY;
        }
        console.log(`🔌 Connecting to: ${connectionOptions.address}`);
        const connection = await Connection.connect(connectionOptions);
        console.log('✅ Connected successfully');
        // Create client
        const client = new Client({
            connection,
            namespace: process.env.TEMPORAL_NAMESPACE || 'default',
        });
        // Prepare workflow input (same as Python API)
        const workflowInput = {
            fileUrl: 'https://example.com/test-file.pdf',
            userId: 'test-user-123',
            fileName: 'test-file.pdf',
            analysisType: 'document',
            options: {
                extractImages: false,
                generateSummary: true,
                detectLanguage: true,
            }
        };
        console.log('🚀 Starting workflow execution...');
        // Start workflow
        const handle = await client.workflow.start('analyzeDocumentWorkflow', {
            workflowId: `test-workflow-${Date.now()}`,
            taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'pip-ai-task-queue',
            args: [workflowInput],
        });
        console.log(`✅ Workflow started with ID: ${handle.workflowId}`);
        console.log('⏳ Waiting for workflow to complete...');
        // Wait for result (with timeout)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Workflow timeout after 30 seconds')), 30000);
        });
        const result = await Promise.race([
            handle.result(),
            timeoutPromise
        ]);
        console.log('🎉 Workflow completed successfully!');
        console.log('📊 Result:', JSON.stringify(result, null, 2));
        // Close connection
        connection.close();
        console.log('✅ Test completed successfully');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        if (error instanceof Error) {
            console.error('   Message:', error.message);
            console.error('   Stack:', error.stack);
        }
        process.exit(1);
    }
}
testWorkflowExecution();
//# sourceMappingURL=test-workflow-execution.js.map