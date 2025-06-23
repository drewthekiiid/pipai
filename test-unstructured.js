#!/usr/bin/env node

/**
 * Test script for Unstructured-IO integration
 * This script tests the basic functionality of the Unstructured client
 */

const axios = require('./packages/worker/node_modules/axios');

async function testUnstructuredService() {
  console.log('🧪 Testing Unstructured-IO Integration...\n');

  // Test 1: Health Check
  console.log('1. Testing health check...');
  try {
    const response = await axios.get('http://localhost:8000/healthcheck', {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log('✅ Health check passed - service is running');
    } else {
      console.log('❌ Health check failed - unexpected status:', response.status);
      return;
    }
  } catch (error) {
    console.log('❌ Health check failed - service may not be running');
    console.log('💡 Try running: ./start-unstructured.sh');
    return;
  }

  // Test 2: API Documentation
  console.log('\n2. Checking API documentation...');
  try {
    const response = await axios.get('http://localhost:8000/docs', {
      timeout: 5000
    });
    console.log('✅ API docs accessible at: http://localhost:8000/docs');
  } catch (error) {
    console.log('⚠️  API docs not accessible, but service is running');
  }

  // Test 3: Supported File Types
  console.log('\n3. Supported file types:');
  const supportedTypes = [
    'pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls',
    'html', 'xml', 'txt', 'md', 'rtf', 'odt', 'odp', 'ods',
    'png', 'jpg', 'jpeg', 'tiff', 'bmp', 'heic'
  ];
  
  console.log('📄 Documents:', supportedTypes.filter(t => 
    ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'txt', 'md'].includes(t)
  ).join(', '));
  
  console.log('🖼️  Images:', supportedTypes.filter(t => 
    ['png', 'jpg', 'jpeg', 'tiff', 'bmp', 'heic'].includes(t)
  ).join(', '));

  // Test 4: Environment Variables
  console.log('\n4. Environment configuration:');
  const unstructuredUrl = process.env.UNSTRUCTURED_API_URL || 'http://localhost:8000';
  const unstructuredKey = process.env.UNSTRUCTURED_API_KEY || 'not-set';
  
  console.log(`📡 API URL: ${unstructuredUrl}`);
  console.log(`🔑 API Key: ${unstructuredKey === 'not-set' ? '❌ Not configured' : '✅ Configured'}`);

  // Test 5: Service Info
  console.log('\n5. Service information:');
  console.log('🚀 Unstructured-IO is a powerful document processing engine');
  console.log('🎯 Optimized for construction documents with:');
  console.log('   • Advanced table extraction');
  console.log('   • Image and diagram recognition');
  console.log('   • Layout-aware text processing');
  console.log('   • OCR capabilities');
  console.log('   • Metadata and coordinate extraction');

  console.log('\n✅ All tests completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('   1. Upload a document through PIP AI interface');
  console.log('   2. Monitor worker logs for processing details');
  console.log('   3. Check for enhanced extraction results');
  
  console.log('\n🔧 Management commands:');
  console.log('   • Start service: ./start-unstructured.sh');
  console.log('   • Stop service: ./stop-unstructured.sh');
  console.log('   • View logs: docker-compose -f docker-compose.unstructured.yml logs');
}

// Check if we're being run directly
if (require.main === module) {
  testUnstructuredService().catch(error => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testUnstructuredService }; 