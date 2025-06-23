import fs from 'fs';
import { createUnstructuredClient } from './packages/worker/src/unstructured-client.ts';

async function viewExtraction() {
  const fileName = process.argv[2] || 'WEN GNG40_Fall2024_PDF_V1 2.pdf';
  
  console.log(`🔍 Viewing Extraction: ${fileName}\n`);

  if (!fs.existsSync(fileName)) {
    console.log(`❌ File not found: ${fileName}`);
    console.log('\nUsage: node view-extraction.mjs [filename]');
    console.log('Example: node view-extraction.mjs "WEN GNG40_Fall2024_PDF_V1 2.pdf"');
    return;
  }

  try {
    console.log('📄 Processing document...');
    const client = createUnstructuredClient();
    
    const startTime = Date.now();
    const result = await client.processDocument(fileName, {
      strategy: 'fast',           // Fast for speed
      extractImages: false,       // Skip images for speed
      extractTables: true,        // Keep tables for construction
      coordinates: false,         // Skip coordinates for speed
      includePage: false         // Skip page info for speed
    });
    
    const processingTime = Date.now() - startTime;
    
    console.log('\n📊 EXTRACTION SUMMARY:');
    console.log('='.repeat(60));
    console.log(`📝 Text Length: ${result.extractedText.length.toLocaleString()} characters`);
    console.log(`📊 Tables Found: ${result.tables.length}`);
    console.log(`🧱 Elements: ${result.metadata.elementCount.toLocaleString()}`);
    console.log(`⚡ Processing Time: ${processingTime}ms`);
    console.log(`🏗️  Headers: ${result.metadata.layout.headers.length}`);
    console.log(`📋 Sections: ${result.metadata.layout.sections.length}`);
    
    // Construction content analysis
    if (result.extractedText.length > 0) {
      const text = result.extractedText.toLowerCase();
      const constructionTerms = [
        'construction', 'building', 'project', 'contractor',
        'concrete', 'steel', 'electrical', 'plumbing', 'hvac',
        'division', 'specification', 'material', 'schedule'
      ].filter(term => text.includes(term));
      
      if (constructionTerms.length > 0) {
        console.log(`🏗️  Construction Keywords: ${constructionTerms.join(', ')}`);
      }
    }
    
    console.log('\n📖 EXTRACTED TEXT PREVIEW (first 1000 chars):');
    console.log('='.repeat(60));
    const preview = result.extractedText.substring(0, 1000);
    console.log(preview);
    if (result.extractedText.length > 1000) {
      console.log(`\n... [${(result.extractedText.length - 1000).toLocaleString()} more characters]`);
    }
    
    if (result.tables.length > 0) {
      console.log('\n📋 TABLES FOUND:');
      console.log('='.repeat(60));
      result.tables.forEach((table, index) => {
        console.log(`\nTable ${index + 1}:`);
        console.log(table.text.substring(0, 200) + (table.text.length > 200 ? '...' : ''));
      });
    }
    
    console.log('\n✅ Extraction complete!');
    
    if (result.extractedText.length === 0) {
      console.log('\n⚠️  No text extracted - this might indicate:');
      console.log('   • Document is image-based (try extractImages: true)');
      console.log('   • Document format not supported');
      console.log('   • Processing error occurred');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('\n💡 File may be large - try again or use smaller files for testing');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Start Unstructured service: ./start-unstructured.sh');
    }
  }
}

viewExtraction(); 