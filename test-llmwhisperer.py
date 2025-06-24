#!/usr/bin/env python3
"""
Test LLMWhisperer with the WEN construction document
"""

import os
import sys
import time
from unstract.llmwhisperer import LLMWhispererClientV2
from unstract.llmwhisperer.client_v2 import LLMWhispererClientException

def test_llmwhisperer():
    print("🧪 Testing LLMWhisperer with WEN construction document...")
    
    # Initialize client
    client = LLMWhispererClientV2(
        base_url="https://llmwhisperer-api.us-central.unstract.com/api/v2",
        api_key=os.getenv("LLMWHISPERER_API_KEY")  # You'll need to set this
    )
    
    # Test file
    test_file = "WEN GNG40_Fall2024_PDF_V1 2.pdf"
    
    if not os.path.exists(test_file):
        print(f"❌ Test file not found: {test_file}")
        print("   Please make sure the WEN PDF is in the current directory")
        return
    
    try:
        print(f"📄 Processing: {test_file}")
        print("   Mode: high_quality (best for construction documents)")
        print("   This may take a few minutes for a 41MB PDF...")
        
        start_time = time.time()
        
        # Process the document
        result = client.whisper(
            file_path=test_file,
            mode="high_quality",  # Best quality for construction documents
            output_mode="layout_preserving",  # Preserve layout for better LLM processing
            wait_for_completion=True,
            wait_timeout=300  # 5 minutes timeout
        )
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        print(f"✅ Processing completed in {processing_time:.1f} seconds")
        
        # Check if we got text
        if "extraction" in result and "resultText" in result["extraction"]:
            extracted_text = result["extraction"]["resultText"]
            text_length = len(extracted_text)
            
            print(f"📊 Results:")
            print(f"   Text length: {text_length:,} characters")
            print(f"   Processing time: {processing_time:.1f} seconds")
            print(f"   Pages processed: {result.get('extraction', {}).get('pageCount', 'Unknown')}")
            
            # Save extracted text
            output_file = "wen_llmwhisperer_output.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(extracted_text)
            print(f"💾 Full text saved to: {output_file}")
            
            # Show preview
            print(f"\n📋 Preview (first 500 characters):")
            print("-" * 50)
            print(extracted_text[:500])
            print("-" * 50)
            
            # Look for construction-specific content
            construction_keywords = [
                "electrical", "HVAC", "plumbing", "concrete", 
                "steel", "CSI", "division", "specification",
                "contractor", "material", "installation"
            ]
            
            found_keywords = []
            for keyword in construction_keywords:
                if keyword.lower() in extracted_text.lower():
                    found_keywords.append(keyword)
            
            print(f"\n🔍 Construction keywords found: {', '.join(found_keywords)}")
            
            return True
            
        else:
            print("❌ No text extracted from document")
            print(f"   Raw result: {result}")
            return False
            
    except LLMWhispererClientException as e:
        print(f"❌ LLMWhisperer API error: {e.error_message()}")
        if hasattr(e, 'status_code'):
            print(f"   Status code: {e.status_code}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False

def check_usage():
    """Check API usage"""
    try:
        client = LLMWhispererClientV2(
            base_url="https://llmwhisperer-api.us-central.unstract.com/api/v2",
            api_key=os.getenv("LLMWHISPERER_API_KEY")
        )
        
        usage = client.get_usage_info()
        print(f"📊 LLMWhisperer Usage Info:")
        print(f"   {usage}")
        
    except Exception as e:
        print(f"❌ Could not get usage info: {str(e)}")

if __name__ == "__main__":
    # Check if API key is set
    if not os.getenv("LLMWHISPERER_API_KEY"):
        print("❌ LLMWHISPERER_API_KEY environment variable not set")
        print("   Please get your API key from: https://unstract.com/")
        print("   Then set it with: export LLMWHISPERER_API_KEY=your_key_here")
        sys.exit(1)
    
    print("🚀 LLMWhisperer Test Script")
    print("=" * 50)
    
    # Check usage first
    check_usage()
    print()
    
    # Test document processing
    success = test_llmwhisperer()
    
    if success:
        print("\n✅ LLMWhisperer test completed successfully!")
        print("   Ready to integrate into your workflow")
    else:
        print("\n❌ LLMWhisperer test failed")
        print("   Please check the error messages above") 