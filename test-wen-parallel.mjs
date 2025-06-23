import { exec } from 'child_process';
import fs from 'fs/promises';
import { promisify } from 'util';
import { createUnstructuredClient } from './packages/worker/dist/unstructured-client.js';

const execAsync = promisify(exec);

async function testWenFileParallelProcessing() {
  console.log('🚀 Testing WEN File with Parallel Processing');
  console.log('============================================');
  console.log('This test will demonstrate the power of parallel processing!');
  console.log('');

  const client = createUnstructuredClient();
  
  // Check service health and start if needed
  console.log('1. Checking service status...');
  let isHealthy = false;
  
  try {
    isHealthy = await client.healthCheck();
  } catch (error) {
    // Service not available
  }
  
  if (!isHealthy) {
    console.log('   🔄 Unstructured service not running - starting it now...');
    console.log('   ⏳ This may take a minute to download Docker images...');
    
    try {
      await execAsync('./scripts/service-manager.sh start-unstructured');
      console.log('   ✅ Service started successfully!');
    } catch (error) {
      console.log('   ❌ Failed to start service automatically');
      console.log('   💡 Please run: ./start-services.sh');
      console.log('   💡 Or manually: ./scripts/service-manager.sh start');
      return;
    }
  } else {
    console.log('   ✅ Unstructured service is already running');
  }

  // Look for WEN file
  const wenFile = 'WEN GNG40_Fall2024_PDF_V1 2.pdf';
  
  try {
    console.log(`\n2. Checking for WEN file: ${wenFile}`);
    const stats = await fs.stat(wenFile);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    console.log(`   📄 File found: ${fileSizeMB.toFixed(2)}MB`);
    console.log(`   🎯 This is a ${fileSizeMB > 20 ? 'LARGE' : 'standard'} PDF - perfect for testing!`);
    
    // Show what we're about to do
    console.log('\n📋 Test Plan:');
    console.log('   1. Process WITHOUT parallel processing (baseline)');
    console.log('   2. Process WITH parallel processing (optimized)');
    console.log('   3. Compare performance and show improvements');
    console.log('');
    
    const proceed = await askForConfirmation('Ready to proceed with the test? This may take several minutes.');
    if (!proceed) {
      console.log('   Test cancelled by user.');
      return;
    }
    
    // Test WITHOUT parallel processing first (for comparison)
    console.log(`\n3. Phase 1: Baseline Processing (Sequential)`);
    console.log('   =====================================');
    console.log('   ⚠️  This will be slow - demonstrating the old way...');
    
    const baselineStart = Date.now();
    
    const baselineResult = await client.processDocument(wenFile, {
      strategy: 'fast',
      extractImages: false,
      extractTables: true,
      coordinates: false,
      includePage: false,
      enableParallelProcessing: false, // DISABLED for baseline
      concurrencyLevel: 1,
      allowPartialFailure: true
    });
    
    const baselineTime = Date.now() - baselineStart;
    
    console.log('\n   📊 Baseline Results (NO parallel processing):');
    console.log(`   ⏱️  Processing time: ${(baselineTime / 1000).toFixed(1)} seconds`);
    console.log(`   📄 Pages: ${baselineResult.metadata.pageCount}`);
    console.log(`   📊 Elements: ${baselineResult.metadata.elementCount}`);
    console.log(`   📝 Text length: ${baselineResult.extractedText.length} characters`);
    console.log(`   🗂️  Tables found: ${baselineResult.tables.length}`);
    
    // Test WITH parallel processing (our optimization)
    console.log(`\n4. Phase 2: Parallel Processing (Optimized)`);
    console.log('   =========================================');
    console.log('   🚀 Now watch the magic of parallel processing!');
    
    const optimizedStart = Date.now();
    
    let optimizedResult;
    if (fileSizeMB > 20) {
      // Use large PDF optimization
      console.log('   🎯 Using LARGE PDF optimization (15 concurrent requests)');
      optimizedResult = await client.processLargePDF(wenFile, {
        maxConcurrency: 15,
        allowPartialFailure: true,
        extractTables: true
      });
    } else {
      // Use standard parallel processing
      console.log('   🎯 Using standard parallel processing (10 concurrent requests)');
      optimizedResult = await client.processDocument(wenFile, {
        strategy: 'fast',
        extractImages: false,
        extractTables: true,
        coordinates: false,
        includePage: false,
        enableParallelProcessing: true,
        concurrencyLevel: 10,
        allowPartialFailure: true
      });
    }
    
    const optimizedTime = Date.now() - optimizedStart;
    const speedImprovement = ((baselineTime - optimizedTime) / baselineTime * 100);
    const timeSaved = (baselineTime - optimizedTime) / 1000;
    
    console.log('\n   📊 Optimized Results (WITH parallel processing):');
    console.log(`   ⚡ Processing time: ${(optimizedTime / 1000).toFixed(1)} seconds`);
    console.log(`   📄 Pages: ${optimizedResult.metadata.pageCount}`);
    console.log(`   📊 Elements: ${optimizedResult.metadata.elementCount}`);
    console.log(`   📝 Text length: ${optimizedResult.extractedText.length} characters`);
    console.log(`   🗂️  Tables found: ${optimizedResult.tables.length}`);
    
    // Performance comparison
    console.log('\n🎉 PERFORMANCE COMPARISON');
    console.log('==========================');
    console.log(`📈 Speed improvement: ${speedImprovement.toFixed(1)}% faster`);
    console.log(`⏱️  Time saved: ${timeSaved.toFixed(1)} seconds`);
    console.log(`🔄 Parallel efficiency: ${(baselineTime / optimizedTime).toFixed(1)}x speedup`);
    
    // Performance rating
    if (speedImprovement > 50) {
      console.log(`✅ EXCELLENT! Parallel processing provided significant speedup!`);
    } else if (speedImprovement > 20) {
      console.log(`✅ GOOD! Parallel processing provided meaningful speedup!`);
    } else {
      console.log(`⚠️  Modest improvement - this document may already be well-optimized`);
    }
    
    // Analysis results
    console.log('\n🔍 CONTENT ANALYSIS');
    console.log('===================');
    
    const hasConstruction = optimizedResult.extractedText.toLowerCase().includes('construction') || 
                           optimizedResult.extractedText.toLowerCase().includes('building') ||
                           optimizedResult.extractedText.toLowerCase().includes('wen') ||
                           optimizedResult.extractedText.toLowerCase().includes('engineering');
    
    console.log(`🏗️  Construction content detected: ${hasConstruction ? '✅ YES' : '❌ NO'}`);
    
    if (optimizedResult.tables.length > 0) {
      console.log(`📋 Tables extracted: ${optimizedResult.tables.length}`);
      console.log(`   Perfect for construction cost estimation and trade analysis!`);
    }
    
    // Show first few words of extracted text
    const preview = optimizedResult.extractedText.substring(0, 200) + '...';
    console.log(`📝 Text preview: "${preview}"`);
    
    // Final summary
    console.log('\n🎯 FINAL SUMMARY');
    console.log('================');
    console.log(`   • File size: ${fileSizeMB.toFixed(2)}MB`);
    console.log(`   • Processing method: ${fileSizeMB > 20 ? 'Large PDF optimization' : 'Standard parallel'}`);
    console.log(`   • Speed improvement: ${speedImprovement.toFixed(1)}%`);
    console.log(`   • Time saved: ${timeSaved.toFixed(1)} seconds`);
    console.log(`   • Data extracted: ${optimizedResult.extractedText.length} characters`);
    console.log(`   • Ready for AI analysis: ✅`);
    
    console.log('\n💡 What this means for your workflow:');
    console.log(`   • Large construction documents process ${(baselineTime / optimizedTime).toFixed(1)}x faster`);
    console.log(`   • More time for analysis, less time waiting`);
    console.log(`   • Automatic optimization based on file size`);
    console.log(`   • Reliable processing even if some pages fail`);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`\n❌ WEN file not found: ${wenFile}`);
      console.log('\n💡 Available PDF files:');
      try {
        const files = await fs.readdir('.');
        const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
        if (pdfFiles.length > 0) {
          pdfFiles.forEach(file => {
            console.log(`   - ${file}`);
          });
          console.log(`\n💡 You can update the 'wenFile' variable in this script to test with any of these files.`);
        } else {
          console.log('   No PDF files found in current directory');
          console.log('   💡 Add a PDF file to the project root to test parallel processing');
        }
      } catch {
        console.log('   Could not list files');
      }
    } else {
      console.error('\n❌ Test failed:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('   • Check service status: ./service-status.sh');
      console.log('   • Restart services: ./scripts/service-manager.sh restart');
      console.log('   • View logs: ls -la logs/');
    }
  }
}

// Helper function to ask for user confirmation
async function askForConfirmation(question) {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

testWenFileParallelProcessing().catch(console.error); 