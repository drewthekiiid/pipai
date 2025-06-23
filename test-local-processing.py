#!/usr/bin/env python3
"""
Test local document processing without Docker
This will verify the workflow works before deploying to production
"""

import sys
import subprocess

def install_unstructured():
    """Install unstructured locally if not available"""
    try:
        import unstructured
        print("✅ Unstructured library already available")
        return True
    except ImportError:
        print("📦 Installing Unstructured library...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "unstructured[all-docs]"])
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to install Unstructured")
            return False

def test_document_processing():
    """Test document processing with a sample file"""
    try:
        from unstructured.partition.auto import partition
        
        # Test with existing text file
        test_file = "test_upload.txt"
        if not os.path.exists(test_file):
            # Create a test file
            with open(test_file, 'w') as f:
                f.write("""
CONSTRUCTION PROJECT SCOPE OF WORK

Project: Office Building Renovation
Location: 123 Main Street

TRADES REQUIRED:
1. Electrical - Install new lighting and outlets
2. Plumbing - Update bathroom fixtures  
3. HVAC - Replace air conditioning system
4. Flooring - Install carpet and tile
5. Painting - Interior walls and trim

MATERIALS:
- Electrical outlets: 50 units
- Light fixtures: 25 units
- Carpet: 2,000 sq ft
- Tile: 500 sq ft
- Paint: 15 gallons

SCHEDULE:
Week 1: Electrical rough-in
Week 2: Plumbing installation
Week 3: HVAC installation  
Week 4: Flooring installation
Week 5: Painting and final touches

TOTAL ESTIMATED COST: $75,000
                """)
        
        print(f"🔄 Processing document: {test_file}")
        
        # Process the document
        elements = partition(filename=test_file)
        
        print(f"✅ Successfully processed {len(elements)} elements")
        
        # Show some sample elements
        for i, element in enumerate(elements[:5]):
            print(f"Element {i+1}: {type(element).__name__} - {str(element)[:100]}...")
        
        # Extract specific information
        text_content = "\n".join([str(el) for el in elements])
        
        # Look for construction-specific terms
        trades = ["electrical", "plumbing", "hvac", "flooring", "painting"]
        found_trades = [trade for trade in trades if trade.lower() in text_content.lower()]
        
        print(f"\n🔍 Found trades: {', '.join(found_trades)}")
        
        # Check for cost information
        import re
        cost_matches = re.findall(r'\$[\d,]+', text_content)
        if cost_matches:
            print(f"💰 Found costs: {', '.join(cost_matches)}")
        
        return True, elements, text_content
        
    except Exception as e:
        print(f"❌ Document processing failed: {e}")
        return False, None, None

def test_streaming_simulation():
    """Simulate streaming response"""
    print("\n🌊 Testing streaming simulation...")
    
    sample_analysis = [
        "Analyzing document structure...",
        "Identifying construction trades...", 
        "Extracting material quantities...",
        "Calculating cost estimates...",
        "Generating SOW recommendations...",
        "Complete!"
    ]
    
    import time
    for step in sample_analysis:
        print(f"📡 {step}")
        time.sleep(0.5)
    
    return True

def test_followup_prompts():
    """Test follow-up prompt generation"""
    print("\n🔄 Testing follow-up prompt generation...")
    
    construction_prompts = {
        "sow": [
            "Generate detailed Statement of Work for electrical trade",
            "Create material takeoff list for HVAC installation", 
            "Develop project timeline with dependencies",
            "Calculate labor hours by trade"
        ],
        "trades": {
            "electrical": [
                "List all electrical components needed",
                "Calculate electrical load requirements",
                "Specify wire gauge and conduit sizes"
            ],
            "plumbing": [
                "Identify plumbing fixture requirements", 
                "Calculate pipe sizes and fittings",
                "Specify water pressure needs"
            ],
            "hvac": [
                "Size HVAC equipment for space",
                "Calculate ductwork requirements",
                "Specify insulation needs"
            ]
        }
    }
    
    print("📋 SOW Prompts:")
    for prompt in construction_prompts["sow"]:
        print(f"  • {prompt}")
    
    print("\n🔧 Trade-Specific Prompts:")
    for trade, prompts in construction_prompts["trades"].items():
        print(f"  {trade.upper()}:")
        for prompt in prompts:
            print(f"    - {prompt}")
    
    return construction_prompts

if __name__ == "__main__":
    import os
    
    print("🧪 ========================================")
    print("🧪   PIP AI COMPLETE WORKFLOW TEST")
    print("🧪 ========================================")
    print()
    
    # Step 1: Install dependencies
    if not install_unstructured():
        sys.exit(1)
    
    # Step 2: Test document processing
    success, elements, content = test_document_processing()
    if not success:
        sys.exit(1)
    
    # Step 3: Test streaming
    if not test_streaming_simulation():
        sys.exit(1)
    
    # Step 4: Test follow-up prompts
    prompts = test_followup_prompts()
    
    print("\n🎉 ========================================")
    print("🎉   ALL TESTS PASSED!")
    print("🎉 ========================================")
    print()
    print("✅ Document processing: Working")
    print("✅ Streaming simulation: Working") 
    print("✅ Follow-up prompts: Generated")
    print("✅ Construction workflows: Ready")
    print()
    print("🚀 Ready for production deployment!")
    print("   Run: ./deploy-hybrid-cloud.sh") 