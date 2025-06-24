#!/usr/bin/env python3
"""
Test PDF to Images conversion locally
This tests the core functionality that will be used in the Temporal workflow
"""

import os
import subprocess
import tempfile
from pathlib import Path

def test_pdf_to_images():
    print("🧪 Testing PDF to Images conversion...")
    
    # Test file
    test_file = "WEN GNG40_Fall2024_PDF_V1 2.pdf"
    
    if not os.path.exists(test_file):
        print(f"❌ Test file not found: {test_file}")
        print("   Please make sure the WEN PDF is in the current directory")
        return False
    
    try:
        # Create temp directory
        with tempfile.TemporaryDirectory() as temp_dir:
            print(f"📁 Using temp directory: {temp_dir}")
            
            # Convert PDF to images using pdftoppm
            output_prefix = os.path.join(temp_dir, "page")
            
            print(f"🔄 Converting PDF to images at 300 DPI...")
            cmd = [
                "pdftoppm",
                test_file,
                output_prefix,
                "-png",
                "-r", "300"
            ]
            
            print(f"🔧 Running: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"❌ pdftoppm failed: {result.stderr}")
                return False
            
            # Check generated files
            image_files = list(Path(temp_dir).glob("page-*.png"))
            image_files.sort()
            
            print(f"✅ Generated {len(image_files)} image files:")
            total_size = 0
            for i, img_file in enumerate(image_files[:5]):  # Show first 5
                size = img_file.stat().st_size
                total_size += size
                print(f"   {i+1}. {img_file.name} ({size/1024/1024:.2f}MB)")
            
            if len(image_files) > 5:
                remaining = len(image_files) - 5
                for img_file in image_files[5:]:
                    total_size += img_file.stat().st_size
                print(f"   ... and {remaining} more files")
            
            print(f"📊 Total size: {total_size/1024/1024:.2f}MB")
            print(f"📄 Total pages: {len(image_files)}")
            
            # Test image quality (basic check)
            if image_files:
                first_image = image_files[0]
                print(f"🔍 First image: {first_image.name} ({first_image.stat().st_size/1024:.0f}KB)")
            
            return True
            
    except Exception as error:
        print(f"❌ Test failed: {error}")
        return False

if __name__ == "__main__":
    success = test_pdf_to_images()
    if success:
        print("\n✅ PDF to Images conversion test PASSED")
        print("🚀 Ready to integrate with Temporal workflow!")
    else:
        print("\n❌ PDF to Images conversion test FAILED")
        print("🔧 Please check pdftoppm installation and try again") 