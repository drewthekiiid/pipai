import fs from 'fs';
import { createUnstructuredClient } from './packages/worker/src/unstructured-client.ts';

async function testPDFProcessing() {
  console.log('🧪 Testing PDF Processing with WEN GNG40_Fall2024_PDF_V1 2.pdf\n');

  const pdfFile = 'WEN GNG40_Fall2024_PDF_V1 2.pdf';
  
  // Check if PDF file exists
  if (!fs.existsSync(pdfFile)) {
    console.log('❌ PDF file not found:', pdfFile);
    console.log('Available files:', fs.readdirSync('.').filter(f => f.endsWith('.pdf')));
    return;
  }

  try {
    // Test 1: Service Health
    console.log('1. Testing Unstructured-IO service health...');
    const client = createUnstructuredClient();
    const isHealthy = await client.healthCheck();
    
    if (!isHealthy) {
      console.log('❌ Unstructured-IO service is not healthy');
      console.log('💡 Try running: ./start-unstructured.sh');
      return;
    }
    console.log('✅ Service is healthy');

    // Test 2: PDF Processing
    console.log('\n2. Processing PDF with Unstructured-IO...');
    console.log(`   File: ${pdfFile}`);
    console.log(`   Size: ${Math.round(fs.statSync(pdfFile).size / 1024)} KB`);
    
    const startTime = Date.now();
    
    const result = await client.processDocument(pdfFile, {
      strategy: 'hi_res',
      extractImages: true,
      extractTables: true,
      coordinates: true,
      includePage: true
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ PDF processed successfully in ${processingTime}ms`);

    // Test 3: Results Analysis
    console.log('\n3. Analyzing extraction results...');
    console.log(`   📄 Pages: ${result.metadata.pageCount}`);
    console.log(`   📝 Text length: ${result.extractedText.length} characters`);
    console.log(`   📊 Tables: ${result.tables.length}`);
    console.log(`   🖼️  Images: ${result.images.length}`);
    console.log(`   🧱 Elements: ${result.metadata.elementCount}`);
    console.log(`   🏗️  Headers: ${result.metadata.layout.headers.length}`);
    console.log(`   📋 Sections: ${result.metadata.layout.sections.length}`);
    console.log(`   📌 Lists: ${result.metadata.layout.lists.length}`);

    // Test 4: Construction Content Detection
    console.log('\n4. Checking for construction content...');
    const text = result.extractedText.toLowerCase();
    
    const constructionKeywords = {
      'Project Info': ['project', 'building', 'construction', 'contractor'],
      'Materials': ['concrete', 'steel', 'wood', 'metal', 'lumber'],
      'Trades': ['electrical', 'plumbing', 'hvac', 'mechanical'],
      'Specs': ['specification', 'requirement', 'standard', 'code'],
      'CSI Divisions': ['division', 'section', 'subsection']
    };

    let totalMatches = 0;
    Object.entries(constructionKeywords).forEach(([category, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        console.log(`   ✅ ${category}: ${matches.join(', ')}`);
        totalMatches += matches.length;
      }
    });

    if (totalMatches === 0) {
      console.log('   ⚠️  No construction keywords detected');
    } else {
      console.log(`   🎯 Total construction terms found: ${totalMatches}`);
    }

    // Test 5: Text Preview
    console.log('\n5. Text extraction preview...');
    const preview = result.extractedText.substring(0, 500);
    console.log(`   First 500 characters:`);
    console.log(`   "${preview}..."`);

    // Test 6: Table Detection
    if (result.tables.length > 0) {
      console.log('\n6. Table extraction results...');
      result.tables.slice(0, 3).forEach((table, index) => {
        console.log(`   Table ${index + 1} (Page ${table.pageNumber}):`);
        console.log(`     Text: "${table.text.substring(0, 100)}..."`);
      });
    } else {
      console.log('\n6. No tables detected in PDF');
    }

    // Test 7: Performance Summary
    console.log('\n7. Performance metrics...');
    console.log(`   ⚡ Processing speed: ${Math.round(result.extractedText.length / processingTime * 1000)} chars/sec`);
    console.log(`   📊 Extraction ratio: ${Math.round(result.extractedText.length / fs.statSync(pdfFile).size * 100)}% text per byte`);
    
    console.log('\n🎉 PDF Processing Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • PDF File: ${pdfFile} ✅`);
    console.log(`   • Unstructured-IO: Working ✅`);
    console.log(`   • Text Extraction: ${result.extractedText.length > 0 ? 'Success' : 'Failed'} ${result.extractedText.length > 0 ? '✅' : '❌'}`);
    console.log(`   • Table Detection: ${result.tables.length > 0 ? 'Found ' + result.tables.length : 'None found'} ${result.tables.length > 0 ? '✅' : '⚠️'}`);
    console.log(`   • Construction Content: ${totalMatches > 0 ? 'Detected' : 'Not detected'} ${totalMatches > 0 ? '✅' : '⚠️'}`);
    console.log(`   • Processing Time: ${processingTime}ms ✅`);

  } catch (error) {
    console.error('\n❌ PDF Processing Test Failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Solution: Start Unstructured-IO service:');
      console.log('   ./start-unstructured.sh');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 The PDF might be large - this is normal for complex documents');
    } else {
      console.log('\n💡 Check that the Unstructured-IO service is running and accessible');
    }
  }
}

testPDFProcessing(); 