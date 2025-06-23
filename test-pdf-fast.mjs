import fs from 'fs';
import { createUnstructuredClient } from './packages/worker/src/unstructured-client.ts';

async function testPDFFast() {
  console.log('⚡ FAST PDF Processing Test - WEN GNG40_Fall2024_PDF_V1 2.pdf\n');

  const pdfFile = 'WEN GNG40_Fall2024_PDF_V1 2.pdf';
  
  if (!fs.existsSync(pdfFile)) {
    console.log('❌ PDF file not found:', pdfFile);
    return;
  }

  try {
    console.log('1. Quick service check...');
    const client = createUnstructuredClient();
    const isHealthy = await client.healthCheck();
    
    if (!isHealthy) {
      console.log('❌ Service not healthy - run: ./start-unstructured.sh');
      return;
    }
    console.log('✅ Service ready');

    console.log('\n2. Fast PDF processing...');
    console.log(`   File: ${Math.round(fs.statSync(pdfFile).size / 1024)} KB`);
    console.log('   Strategy: FAST (prioritizing speed over quality)');
    
    const startTime = Date.now();
    
    // OPTIMIZED SETTINGS FOR SPEED:
    const result = await client.processDocument(pdfFile, {
      strategy: 'fast',           // 🚀 FAST instead of hi_res
      extractImages: false,       // 🚀 Skip images (major speedup)
      extractTables: true,        // ✅ Keep tables (useful for construction)
      coordinates: false,         // 🚀 Skip coordinates (small speedup)
      includePage: false         // 🚀 Skip page info (small speedup)
    });

    const processingTime = Date.now() - startTime;
    console.log(`⚡ Processed in ${processingTime}ms (${Math.round(processingTime/1000)}s)`);

    // Quick analysis
    console.log('\n3. Results:');
    console.log(`   📝 Text: ${result.extractedText.length.toLocaleString()} characters`);
    console.log(`   📊 Tables: ${result.tables.length}`);
    console.log(`   🧱 Elements: ${result.metadata.elementCount}`);
    console.log(`   📄 Pages: ${result.metadata.pageCount || 'N/A'}`);

    // Speed metrics
    const charPerSec = Math.round(result.extractedText.length / (processingTime / 1000));
    console.log(`   ⚡ Speed: ${charPerSec.toLocaleString()} chars/sec`);

    // Quick content check
    const text = result.extractedText.toLowerCase();
    const constructionTerms = ['construction', 'building', 'concrete', 'steel', 'electrical', 'plumbing']
      .filter(term => text.includes(term)).length;
    
    console.log(`   🏗️  Construction terms: ${constructionTerms}/6`);

    // Show first bit of text
    const preview = result.extractedText.substring(0, 200).replace(/\s+/g, ' ').trim();
    console.log(`   📖 Preview: "${preview}..."`);

    console.log('\n🎉 Fast processing complete!');
    console.log(`\n⚡ Performance vs hi_res strategy:`);
    console.log(`   • ~5-10x faster processing`);
    console.log(`   • Table extraction: Still included`);
    console.log(`   • Image extraction: Disabled (major speedup)`);
    console.log(`   • OCR quality: Lower but adequate`);
    console.log(`   • Good for: Quick text extraction, table detection`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    if (error.message.includes('timeout')) {
      console.log('💡 Even fast mode timed out - PDF might be extremely complex');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Start service: ./start-unstructured.sh');
    }
  }
}

testPDFFast(); 