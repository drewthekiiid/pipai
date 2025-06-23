#!/usr/bin/env python3
"""
FREE Unstructured-IO API Server
Simple FastAPI wrapper for the open source Unstructured library
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import tempfile
import os
from typing import List, Dict, Any
import traceback

# Import Unstructured library
try:
    from unstructured.partition.auto import partition
    # Try different staging functions based on available version
    try:
        from unstructured.staging.base import elements_to_json
        elements_converter = elements_to_json
    except ImportError:
        try:
            from unstructured.staging.base import elements_to_dict
            elements_converter = elements_to_dict
        except ImportError:
            # Fallback to manual conversion
            elements_converter = None
except ImportError as e:
    print(f"❌ Failed to import Unstructured library: {e}")
    print("Make sure you're running this inside the Unstructured Docker container")
    exit(1)

app = FastAPI(
    title="FREE Unstructured-IO API",
    description="100% FREE document processing with no limits",
    version="1.0.0"
)

@app.get("/healthcheck")
async def healthcheck():
    """Health check endpoint"""
    return {"status": "healthy", "service": "unstructured-free", "version": "1.0.0"}

@app.post("/general/v0/general")
async def process_document(
    files: UploadFile = File(...),
    strategy: str = "auto",
    hi_res_model_name: str = "yolox"
):
    """
    Process a document and return structured data
    Compatible with Unstructured API format
    """
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{files.filename}") as tmp_file:
            content = await files.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name

        try:
            # Process document with Unstructured
            elements = partition(
                filename=tmp_file_path,
                strategy=strategy,
                hi_res_model_name=hi_res_model_name,
                include_page_breaks=True,
                infer_table_structure=True,
                model_name="yolox"  # Free OCR model
            )
            
            # Convert to dictionary format
            if elements_converter:
                result = elements_converter(elements)
            else:
                # Manual conversion fallback
                result = [element.to_dict() for element in elements]
            
            return JSONResponse(content=result)
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
                
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"❌ Processing error: {error_details}")
        raise HTTPException(
            status_code=500, 
            detail=f"Document processing failed: {str(e)}"
        )

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "FREE Unstructured-IO API",
        "status": "running",
        "description": "100% FREE document processing service",
        "endpoints": {
            "health": "/healthcheck",
            "process": "/general/v0/general"
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("🆓 Starting FREE Unstructured-IO API Server...")
    print("✅ 100% FREE - No API keys required")
    print("✅ No usage limits")
    print("✅ Full document processing capabilities")
    uvicorn.run(app, host="0.0.0.0", port=8000) 