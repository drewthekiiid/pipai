#!/usr/bin/env node

const fs = require('fs');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testUploadAndSSE() {
    console.log('🧪 Testing Upload and SSE with WEN GNG40 PDF...\n');
    
    const baseURL = 'http://localhost:3000';
    const fileName = 'WEN GNG40_Fall2024_PDF_V1 2.pdf';
    
    try {
        // Check if file exists
        if (!fs.existsSync(fileName)) {
            console.error('❌ PDF file not found:', fileName);
            return;
        }
        
        const fileStats = fs.statSync(fileName);
        console.log(`📄 File: ${fileName} (${fileStats.size} bytes)`);
        
        // Step 1: Get presigned URL
        console.log('\n🔗 Step 1: Getting presigned URL...');
        const presignedResponse = await fetch(`${baseURL}/api/upload/presigned`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileName: fileName,
                fileSize: fileStats.size,
                fileType: 'application/pdf'
            })
        });
        
        if (!presignedResponse.ok) {
            throw new Error(`Presigned URL request failed: ${presignedResponse.status}`);
        }
        
        const presignedData = await presignedResponse.json();
        console.log('✅ Presigned URL obtained:', presignedData.fileId);
        
        // Step 2: Upload to S3 (simulate)
        console.log('\n📤 Step 2: Simulating S3 upload...');
        // We'll skip the actual S3 upload and go straight to completion
        
        // Step 3: Complete upload (triggers workflow)
        console.log('\n🎯 Step 3: Completing upload (triggers workflow)...');
        const completeResponse = await fetch(`${baseURL}/api/upload/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileId: presignedData.fileId,
                fileName: fileName,
                s3Key: presignedData.s3Key
            })
        });
        
        if (!completeResponse.ok) {
            throw new Error(`Upload completion failed: ${completeResponse.status}`);
        }
        
        const completeData = await completeResponse.json();
        console.log('✅ Upload completed! Workflow ID:', completeData.workflowId);
        
        // Step 4: Test SSE streaming
        console.log('\n🔄 Step 4: Testing SSE streaming...');
        console.log(`📡 Connecting to: ${baseURL}/api/stream/${completeData.workflowId}`);
        
        return completeData.workflowId;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return null;
    }
}

// Run the test
testUploadAndSSE().then(workflowId => {
    if (workflowId) {
        console.log(`\n🎉 Test completed! Use this command to test SSE:`);
        console.log(`curl -N -H "Accept: text/event-stream" "http://localhost:3000/api/stream/${workflowId}"`);
    }
}).catch(console.error); 