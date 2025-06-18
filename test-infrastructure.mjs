#!/usr/bin/env node

/**
 * Infrastructure Test Script
 * Tests AWS S3 and Upstash Redis connections using live Pulumi outputs
 */

import * as dotenv from 'dotenv';
import AWS from 'aws-sdk';
import { execSync } from 'child_process';
import path from 'path';

// Load environment variables as fallback
dotenv.config();

// Get live Pulumi outputs
async function getPulumiOutputs() {
  console.log('🔄 Fetching live Pulumi outputs...');
  
  try {
    const infraPath = path.join(process.cwd(), 'infra');
    const outputs = execSync(
      'pulumi stack output envTemplate --json --show-secrets',
      { 
        cwd: infraPath,
        encoding: 'utf8',
        stdio: 'pipe'
      }
    );
    
    const data = JSON.parse(outputs);
    console.log('✅ Live Pulumi outputs fetched successfully\n');
    
    return data.variables || {};
  } catch (error) {
    console.log('⚠️  Could not fetch Pulumi outputs, using .env fallback');
    console.log(`   Error: ${error.message}\n`);
    return null;
  }
}

console.log('🧪 Testing PIP AI Infrastructure...\n');

// Test 1: AWS S3 Connection (using live Pulumi credentials)
async function testAWS(config) {
  console.log('📦 Testing AWS S3 Connection...');
  
  const s3 = new AWS.S3({
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    region: config.AWS_REGION,
  });

  try {
    // Test bucket access directly - list objects instead of all buckets
    const bucketName = config.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      console.log('❌ AWS S3 bucket name not found in config');
      return;
    }

    const result = await s3.listObjectsV2({ 
      Bucket: bucketName, 
      MaxKeys: 1 
    }).promise();
    
    console.log(`✅ AWS S3 bucket accessible: ${bucketName}`);
    console.log(`   Objects count: ${result.KeyCount || 0}`);
    console.log(`   Access Key: ${config.AWS_ACCESS_KEY_ID}`);
    
  } catch (error) {
    if (error.code === 'NoSuchBucket') {
      console.log(`❌ AWS S3 bucket not found: ${bucketName}`);
    } else if (error.code === 'AccessDenied') {
      console.log(`❌ AWS S3 access denied - check IAM permissions`);
    } else {
      console.log(`❌ AWS S3 connection failed: ${error.message} (${error.code})`);
    }
    console.log(`   Access Key: ${config.AWS_ACCESS_KEY_ID}`);
  }
}

// Test 2: Upstash Redis Connection
async function testUpstash(config) {
  console.log('\n🚀 Testing Upstash Redis Connection...');
  
  const url = config.UPSTASH_REDIS_REST_URL;
  const token = config.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    console.log('❌ Upstash Redis credentials missing');
    return;
  }

  try {
    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Test Redis connection with REST API
    const response = await fetch(`${fullUrl}/ping`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const result = await response.text();
      console.log(`✅ Upstash Redis connected: ${result}`);
      console.log(`   Endpoint: ${fullUrl}`);
    } else {
      console.log(`❌ Upstash Redis connection failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ Upstash Redis connection failed: ${error.message}`);
  }
}

// Test 3: Environment Variables Check
function testEnvVars(config) {
  console.log('\n🔧 Checking Configuration...');
  
  const requiredVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY', 
    'AWS_S3_BUCKET_NAME',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
  ];

  let allPresent = true;
  
  requiredVars.forEach(varName => {
    const value = config[varName];
    if (value && value !== 'your_' + varName.toLowerCase() + '_here') {
      console.log(`✅ ${varName}: ${value.length > 20 ? value.substring(0, 10) + '...' : value}`);
    } else {
      console.log(`❌ ${varName}: missing or placeholder`);
      allPresent = false;
    }
  });

  return allPresent;
}

// Test 4: Infrastructure Status
async function testInfrastructureStatus() {
  console.log('\n📊 Checking Pulumi Stack Status...');
  
  try {
    const infraPath = path.join(process.cwd(), 'infra');
    const status = execSync(
      'pulumi stack --show-name',
      { 
        cwd: infraPath,
        encoding: 'utf8',
        stdio: 'pipe'
      }
    ).trim();
    
    console.log(`✅ Active stack: ${status}`);
    
    // Get resource count
    const resources = execSync(
      'pulumi stack --show-urns',
      { 
        cwd: infraPath,
        encoding: 'utf8',
        stdio: 'pipe'
      }
    );
    
    const resourceCount = resources.split('\n').filter(line => line.trim()).length;
    console.log(`✅ Resources deployed: ${resourceCount}`);
    
  } catch (error) {
    console.log(`⚠️  Could not check stack status: ${error.message}`);
  }
}

// Run all tests
async function runTests() {
  // Get live Pulumi outputs
  const pulumiConfig = await getPulumiOutputs();
  
  // Merge with environment variables (Pulumi takes precedence)
  const config = {
    ...process.env,
    ...pulumiConfig
  };
  
  console.log('📋 Configuration source:', pulumiConfig ? 'Live Pulumi outputs' : '.env file');
  
  await testInfrastructureStatus();
  
  const configOk = testEnvVars(config);
  
  if (configOk) {
    await testAWS(config);
    await testUpstash(config);
  }
  
  console.log('\n🎯 Infrastructure test completed!\n');
  
  // Show next steps if needed
  if (!configOk || !pulumiConfig) {
    console.log('💡 Next steps:');
    if (!pulumiConfig) {
      console.log('   - Run "cd infra && pulumi up" to deploy infrastructure');
    }
    console.log('   - Update .env file with missing values');
    console.log('   - Run this test again to verify connections\n');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}
