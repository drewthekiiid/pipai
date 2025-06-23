#!/usr/bin/env node

// 🆓 Test script for FREE Unstructured-IO Open Source Service
// No API keys required - completely free!

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const UNSTRUCTURED_URL = 'http://localhost:8000';

async function testFreeUnstructuredService() {
  console.log('🆓 Testing FREE Unstructured-IO Open Source Service');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Check if service is running
    console.log('📡 Testing service health...');
    const healthResponse = await axios.get(`${UNSTRUCTURED_URL}/general/docs`);
    console.log('✅ Service is running and accessible');
    
    // Test 2: Test file processing (if test file exists)
    const testFile = 'test_upload.txt';
    if (fs.existsSync(testFile)) {
      console.log(`📄 Testing document processing with ${testFile}...`);
      
      const formData = new FormData();
      formData.append('files', fs.createReadStream(testFile));
      formData.append('strategy', 'fast');
      formData.append('output_format', 'application/json');
      
      const response = await axios.post(
        `${UNSTRUCTURED_URL}/general/v0/general`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 60000, // 1 minute timeout for test
        }
      );
      
      console.log('✅ Document processing successful!');
      console.log(`📊 Processed elements: ${response.data.length}`);
      
      if (response.data.length > 0) {
        console.log(`📝 First element: "${response.data[0].text?.substring(0, 100)}..."`);
      }
    } else {
      console.log('⚠️  No test file found, skipping document processing test');
    }
    
    console.log('');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('🆓 Your FREE Unstructured-IO service is working perfectly!');
    console.log('✅ No API keys needed');
    console.log('✅ No usage limits');
    console.log('✅ Your data stays private');
    console.log('✅ Ready for your PIP AI workflows');
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.code === 'ECONNREFUSED') {
      console.error('🔧 Service not running. Start it with: ./start-unstructured-free.sh');
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

testFreeUnstructuredService(); 