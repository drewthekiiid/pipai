#!/usr/bin/env python3
"""
Simple FastAPI server for Unstructured document processing
Compatible with the open source Unstructured library
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
import tempfile
import os
from typing import Optional, List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Unstructured API Server",
    description="Free open source document processing",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {"message": "Unstructured API Server - Open Source Edition"}

@app.get("/general/docs")
async def docs_redirect():
    return {"message": "Unstructured API is running", "status": "healthy"}

@app.get("/healthcheck")
async def health_check():
    return {"status": "healthy", "version": "open-source"}

@app.post("/general/v0/general")
async def process_document(
    files: UploadFile = File(...),
    strategy: str = Form("hi_res"),
    coordinates: str = Form("true"),
    extract_images: str = Form("true"),
    extract_tables: str = Form("true"),
    pdf_infer_table_structure: str = Form("true"),
    chunking_strategy: str = Form("by_title")
):
    """Process document using Unstructured library"""
    
    try:
        # Import here to avoid startup issues if library isn't available
        from unstructured.partition.auto import partition
        
        logger.info(f"Processing file: {files.filename}")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{files.filename}") as tmp_file:
            content = await files.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Process with Unstructured
            elements = partition(
                filename=tmp_file_path,
                strategy=strategy,
                infer_table_structure=(pdf_infer_table_structure.lower() == "true"),
                coordinates=(coordinates.lower() == "true"),
                chunking_strategy=chunking_strategy if chunking_strategy != "none" else None
            )
            
            # Convert elements to JSON-serializable format
            result = []
            for i, element in enumerate(elements):
                element_dict = {
                    "type": str(type(element).__name__),
                    "text": str(element),
                    "element_id": f"element_{i}",
                    "metadata": {}
                }
                
                # Add metadata if available
                if hasattr(element, 'metadata'):
                    metadata = element.metadata.to_dict() if hasattr(element.metadata, 'to_dict') else {}
                    element_dict["metadata"] = metadata
                
                result.append(element_dict)
            
            logger.info(f"Successfully processed {len(result)} elements")
            return result
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
                
    except ImportError:
        logger.error("Unstructured library not available")
        return JSONResponse(
            status_code=500,
            content={"error": "Unstructured library not installed"}
        )
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Processing failed: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("UNSTRUCTURED_PORT", 8000))  # Use env var or default to 8000
    logger.info(f"🚀 Starting Unstructured Server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info") 