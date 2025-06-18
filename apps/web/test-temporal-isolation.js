/**
 * Minimal Temporal Cloud Connection Test
 * Isolates the UNIMPLEMENTED error to identify the root cause
 */

import { Client } from '@temporalio/client';
import { Connection } from '@temporalio/client';
import { config as loadEnv } from 'dotenv';

// Load environment variables from the .env.local file
loadEnv({ path: '.env.local' });

// Load environment variables
const config = {
  address: process.env.TEMPORAL_ADDRESS || 'us-east-1.aws.api.temporal.io:7233',
  namespace: process.env.TEMPORAL_NAMESPACE || 'pip-ai.ts7wf',
  apiKey: process.env.TEMPORAL_API_KEY || '',
};

console.log('🧪 Temporal Cloud Connection Test');
console.log('================================');
console.log(`Address: ${config.address}`);
console.log(`Namespace: ${config.namespace}`);
console.log(`API Key: ${config.apiKey ? '***' : 'NOT_SET'}`);
console.log('');

async function testConnection() {
  try {
    console.log('1️⃣ Testing raw connection...');
    
    // Test 1: Basic connection
    const connection = await Connection.connect({
      address: config.address,
      tls: {},
      apiKey: config.apiKey,
    });
    console.log('✅ Raw connection successful');

    // Test 2: Client creation
    console.log('2️⃣ Testing client creation...');
    const client = new Client({
      connection,
      namespace: config.namespace,
    });
    console.log('✅ Client created successfully');

    // Test 3: Basic service call
    console.log('3️⃣ Testing service call...');
    try {
      const namespaceInfo = await client.service.describeNamespace({
        namespace: config.namespace,
      });
      console.log('✅ Service call successful');
      console.log(`   Namespace ID: ${namespaceInfo.namespaceInfo?.id}`);
    } catch (error) {
      console.log('❌ Service call failed:', error);
    }

    // Test 4: List workflows (minimal call)
    console.log('4️⃣ Testing workflow list...');
    try {
      const workflows = await client.workflow.list({
        pageSize: 1,
      });
      console.log('✅ Workflow list successful');
      console.log(`   Found ${workflows.executions.length} workflows`);
    } catch (error) {
      console.log('❌ Workflow list failed:', error);
    }

    // Test 5: Attempt to start a simple workflow
    console.log('5️⃣ Testing workflow start...');
    try {
      const handle = await client.workflow.start('testWorkflow', {
        workflowId: `test-${Date.now()}`,
        taskQueue: 'test-queue',
        args: [{ test: true }],
      });
      console.log('✅ Workflow start successful');
      console.log(`   Workflow ID: ${handle.workflowId}`);
    } catch (error) {
      console.log('❌ Workflow start failed:', error);
      console.log(`   Error code: ${error.code}`);
      console.log(`   Error message: ${error.message}`);
    }

    connection.close();
    console.log('✅ Connection closed');

  } catch (error) {
    console.error('💥 Test failed:', error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
  }
}

async function testWorkerCompatibility() {
  console.log('\n🔧 Worker Compatibility Test');
  console.log('============================');
  
  try {
    // Import worker modules to test compatibility
    const { Worker, NativeConnection } = await import('@temporalio/worker');
    console.log('✅ Worker modules imported successfully');

    // Test worker connection
    const connection = await NativeConnection.connect({
      address: config.address,
      tls: {},
      apiKey: config.apiKey,
    });
    console.log('✅ Worker connection successful');

    // Test minimal worker creation (without workflows)
    const worker = await Worker.create({
      connection,
      namespace: config.namespace,
      taskQueue: 'test-queue',
      workflowsPath: require.resolve('./test-workflow.js'), // We'll create this
      activities: {},
    });
    console.log('✅ Worker created successfully');

    connection.close();
    console.log('✅ Worker connection closed');

  } catch (error) {
    console.error('❌ Worker test failed:', error);
  }
}

// Create a minimal test workflow file
import { writeFileSync } from 'fs';
const testWorkflowContent = `
export async function testWorkflow(input) {
  return { success: true, input };
}
`;

try {
  writeFileSync('./test-workflow.js', testWorkflowContent);
  console.log('📝 Created test workflow file');
} catch (error) {
  console.log('⚠️  Could not create test workflow file:', error.message);
}

// Run tests
async function runAllTests() {
  await testConnection();
  await testWorkerCompatibility();
  
  // Cleanup
  try {
    const { unlinkSync } = await import('fs');
    unlinkSync('./test-workflow.js');
    console.log('🧹 Cleaned up test files');
  } catch {}
}

runAllTests().catch(console.error);
