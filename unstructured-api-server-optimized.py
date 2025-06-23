#!/usr/bin/env python3
"""
Optimized FastAPI server for Unstructured document processing
HIGH PERFORMANCE & MAXIMUM QUALITY CONFIGURATION
"""

from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
import asyncio
import time
import multiprocessing
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from typing import Optional, List, Dict, Any
import logging
from contextlib import asynccontextmanager

# Configure high-performance logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global thread pool for I/O operations
thread_pool = None
process_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize thread and process pools
    global thread_pool, process_pool
    
    # Calculate optimal pool sizes
    cpu_count = multiprocessing.cpu_count()
    thread_pool = ThreadPoolExecutor(max_workers=min(32, cpu_count * 4))
    process_pool = ProcessPoolExecutor(max_workers=min(8, cpu_count))
    
    logger.info(f"🚀 High-Performance Unstructured Server Starting...")
    logger.info(f"   CPU Cores: {cpu_count}")
    logger.info(f"   Thread Pool: {min(32, cpu_count * 4)} workers")
    logger.info(f"   Process Pool: {min(8, cpu_count)} workers")
    
    yield
    
    # Shutdown: Clean up pools
    thread_pool.shutdown(wait=True)
    process_pool.shutdown(wait=True)
    logger.info("🛑 Pools shut down gracefully")

app = FastAPI(
    title="PIP AI Unstructured Server - High Performance Edition",
    description="Maximum quality document processing with parallel execution",
    version="2.0.0-optimized",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def process_document_sync(
    file_path: str,
    strategy: str = "hi_res",
    coordinates: bool = True,
    extract_images: bool = True,
    extract_tables: bool = True,
    pdf_infer_table_structure: bool = True,
    chunking_strategy: str = "by_title",
    include_page_breaks: bool = True,
    ocr_languages: Optional[List[str]] = None,
    extract_image_block_types: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Synchronous document processing with MAXIMUM QUALITY settings
    """
    try:
        from unstructured.partition.auto import partition
        from unstructured.cleaners.core import clean_extra_whitespace, clean_non_ascii_chars
        from unstructured.staging.base import convert_to_isd
        
        # Set default OCR languages for maximum language support
        if ocr_languages is None:
            ocr_languages = ["eng", "spa", "fra", "deu", "ita", "por"]
        
        # Set default image block types for comprehensive extraction
        if extract_image_block_types is None:
            extract_image_block_types = ["Image", "Table", "FigureCaption"]
        
        start_time = time.time()
        logger.info(f"🔄 Processing with MAXIMUM QUALITY settings: {os.path.basename(file_path)}")
        
        # MAXIMUM QUALITY PARTITION with all advanced features
        elements = partition(
            filename=file_path,
            
            # CORE PROCESSING STRATEGY
            strategy=strategy,  # hi_res for maximum quality
            
            # ADVANCED EXTRACTION FEATURES
            infer_table_structure=pdf_infer_table_structure,
            coordinates=coordinates,
            include_page_breaks=include_page_breaks,
            
            # IMAGE & TABLE PROCESSING
            extract_images_in_pdf=extract_images,
            extract_image_block_types=extract_image_block_types,
            
            # OCR OPTIMIZATION
            ocr_languages=ocr_languages,
            
            # CHUNKING STRATEGY
            chunking_strategy=chunking_strategy,
            
            # ADVANCED METADATA
            include_orig_elements=True,
            
            # PDF SPECIFIC OPTIMIZATIONS
            pdf_extract_images=True,
            pdf_extract_to_payload=False,
            pdf_image_output_dir_path=None,
            
            # ADVANCED CLEANING
            skip_infer_table_types=[],
            
            # PERFORMANCE OPTIMIZATIONS
            multipage_sections=True,
        )
        
        # ADVANCED POST-PROCESSING with cleaning
        processed_elements = []
        for i, element in enumerate(elements):
            
            # Clean the text content
            text_content = str(element)
            text_content = clean_extra_whitespace(text_content)
            text_content = clean_non_ascii_chars(text_content)
            
            # Build comprehensive element dictionary
            element_dict = {
                "element_id": f"element_{i}",
                "type": str(type(element).__name__),
                "text": text_content,
                "metadata": {},
                "coordinates": None,
                "page_number": None,
                "category_confidence": None
            }
            
            # Extract comprehensive metadata
            if hasattr(element, 'metadata'):
                metadata = element.metadata.to_dict() if hasattr(element.metadata, 'to_dict') else {}
                element_dict["metadata"] = metadata
                
                # Extract key metadata fields
                if 'page_number' in metadata:
                    element_dict["page_number"] = metadata['page_number']
                if 'coordinates' in metadata:
                    element_dict["coordinates"] = metadata['coordinates']
                if 'category_confidence' in metadata:
                    element_dict["category_confidence"] = metadata['category_confidence']
            
            # Add coordinates if available
            if hasattr(element, 'coordinates') and coordinates:
                element_dict["coordinates"] = element.coordinates
            
            processed_elements.append(element_dict)
        
        processing_time = time.time() - start_time
        logger.info(f"✅ HIGH-QUALITY processing completed: {len(processed_elements)} elements in {processing_time:.2f}s")
        
        return processed_elements
        
    except Exception as e:
        logger.error(f"❌ Processing error: {str(e)}")
        raise e

@app.get("/")
async def root():
    return {
        "message": "PIP AI Unstructured Server - High Performance Edition",
        "version": "2.0.0-optimized",
        "features": [
            "Maximum quality document processing",
            "Parallel execution support",
            "Advanced OCR capabilities",
            "Comprehensive metadata extraction",
            "Multi-language support",
            "Table structure inference",
            "Image extraction",
            "Coordinate detection"
        ]
    }

@app.get("/general/docs")
async def docs_redirect():
    return {"message": "High-Performance Unstructured API", "status": "optimized"}

@app.get("/healthcheck")
async def health_check():
    cpu_count = multiprocessing.cpu_count()
    return {
        "status": "healthy",
        "version": "2.0.0-optimized",
        "performance_mode": "maximum",
        "thread_pool_size": min(32, cpu_count * 4) if thread_pool else 0,
        "process_pool_size": min(8, cpu_count) if process_pool else 0
    }

@app.get("/performance-stats")
async def performance_stats():
    """Get current performance statistics"""
    cpu_count = multiprocessing.cpu_count()
    return {
        "cpu_cores": cpu_count,
        "thread_pool_workers": min(32, cpu_count * 4) if thread_pool else 0,
        "process_pool_workers": min(8, cpu_count) if process_pool else 0,
        "configuration": "maximum_quality",
        "parallel_processing": "enabled",
        "advanced_features": [
            "hi_res_strategy",
            "table_structure_inference", 
            "coordinate_detection",
            "multi_language_ocr",
            "image_extraction",
            "advanced_chunking",
            "metadata_enrichment"
        ]
    }

@app.post("/general/v0/general")
async def process_document_endpoint(
    files: UploadFile = File(...),
    strategy: str = Form("hi_res"),  # Default to highest quality
    coordinates: str = Form("true"),
    extract_images: str = Form("true"),
    extract_tables: str = Form("true"),
    pdf_infer_table_structure: str = Form("true"),
    chunking_strategy: str = Form("by_title"),
    include_page_breaks: str = Form("true"),
    ocr_languages: str = Form("eng,spa,fra,deu,ita,por"),  # Multi-language support
    parallel_processing: str = Form("true")
):
    """
    HIGH-PERFORMANCE document processing endpoint with maximum quality settings
    """
    
    try:
        logger.info(f"🚀 HIGH-PERFORMANCE processing request: {files.filename}")
        logger.info(f"   Strategy: {strategy} (MAXIMUM QUALITY)")
        logger.info(f"   Parallel: {parallel_processing}")
        logger.info(f"   OCR Languages: {ocr_languages}")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{files.filename}") as tmp_file:
            content = await files.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Parse OCR languages
            ocr_lang_list = [lang.strip() for lang in ocr_languages.split(",") if lang.strip()]
            
            # Choose execution method based on parallel_processing flag
            if parallel_processing.lower() == "true" and thread_pool:
                # PARALLEL EXECUTION for maximum performance
                logger.info("🔄 Using PARALLEL PROCESSING mode")
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    thread_pool,
                    process_document_sync,
                    tmp_file_path,
                    strategy,
                    coordinates.lower() == "true",
                    extract_images.lower() == "true", 
                    extract_tables.lower() == "true",
                    pdf_infer_table_structure.lower() == "true",
                    chunking_strategy,
                    include_page_breaks.lower() == "true",
                    ocr_lang_list
                )
            else:
                # SYNCHRONOUS EXECUTION
                logger.info("🔄 Using SYNCHRONOUS processing mode")
                result = process_document_sync(
                    tmp_file_path,
                    strategy,
                    coordinates.lower() == "true",
                    extract_images.lower() == "true",
                    extract_tables.lower() == "true", 
                    pdf_infer_table_structure.lower() == "true",
                    chunking_strategy,
                    include_page_breaks.lower() == "true",
                    ocr_lang_list
                )
            
            return result
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
                
    except ImportError:
        logger.error("❌ Unstructured library not available")
        return JSONResponse(
            status_code=500,
            content={"error": "Unstructured library not installed"}
        )
    except Exception as e:
        logger.error(f"❌ Processing error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Processing failed: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    
    # HIGH-PERFORMANCE SERVER CONFIGURATION
    logger.info("🚀 Starting HIGH-PERFORMANCE Unstructured Server...")
    
    uvicorn.run(
        app,
        host="0.0.0.0", 
        port=8001,  # Use different port to avoid conflicts
        log_level="info",
        workers=1,  # Single worker with internal parallelization
        loop="asyncio",
        access_log=True
    ) 