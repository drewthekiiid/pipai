#!/usr/bin/env node

// Direct S3 download test to isolate the issue
require('dotenv').config({ path: '../../.env' });

async function testS3Download() {
    console.log('🧪 Testing S3 Download Directly...\n');
    
    const fileUrl = "https://pip-ai-storage-qo56jg9l.s3.us-east-1.amazonaws.com/uploads/demo-user/2025/06/21/99cb1783-1d09-409d-aeeb-d04e58411cff_WEN_GNG40_Fall2024_PDF_V1_2.pdf";
    
    console.log('📍 Environment check:');
    console.log('   AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
    console.log('   AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing');
    console.log('   AWS_REGION:', process.env.AWS_REGION || '❌ Missing');
    console.log('   File URL:', fileUrl.substring(0, 100) + '...');
    
    try {
        console.log('\n🔄 Starting S3 download...');
        
        // Parse S3 URL
        const s3Url = new URL(fileUrl);
        let bucketName = s3Url.hostname.split('.')[0];
        let objectKey = s3Url.pathname.slice(1);
        
        console.log('   Bucket:', bucketName);
        console.log('   Key:', objectKey);
        
        // Import AWS SDK
        const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
        
        // Create S3 client
        const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
        
        console.log('   S3 Client created ✅');
        
        // Download object
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
        });
        
        console.log('   Sending GetObject command...');
        const response = await s3Client.send(command);
        
        if (!response.Body) {
            throw new Error('No file content received from S3');
        }
        
        console.log('✅ S3 download successful!');
        console.log('   Content-Length:', response.ContentLength);
        console.log('   Content-Type:', response.ContentType);
        console.log('   Last-Modified:', response.LastModified);
        
        // Try to read some content
        const stream = response.Body;
        let totalBytes = 0;
        
        if (stream instanceof Buffer) {
            totalBytes = stream.length;
        } else {
            // Read first few chunks to verify stream works
            let chunkCount = 0;
            for await (const chunk of stream) {
                totalBytes += chunk.length;
                chunkCount++;
                if (chunkCount >= 5) break; // Just test first few chunks
            }
        }
        
        console.log('✅ Successfully read', totalBytes, 'bytes');
        
    } catch (error) {
        console.error('❌ S3 download failed!');
        console.error('💥 Error:', error.message);
        console.error('📚 Stack:', error.stack);
        
        if (error.name === 'CredentialsProviderError') {
            console.error('\n🔍 AWS Credentials Issue - Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
        }
        if (error.name === 'AccessDenied') {
            console.error('\n🔍 S3 Access Denied - Check bucket permissions');
        }
        if (error.name === 'NoSuchBucket') {
            console.error('\n🔍 Bucket Not Found - Check bucket name');
        }
        if (error.name === 'NoSuchKey') {
            console.error('\n🔍 File Not Found - Check object key');
        }
    }
}

testS3Download().catch(console.error); 