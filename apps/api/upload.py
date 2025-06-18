"""
PIP AI Edge Upload API
Handles file uploads to S3 and triggers Temporal workflows for analysis
"""

import os
import uuid
import logging
from typing import Optional, List
from datetime import datetime

import boto3
import aiofiles
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from temporalio.client import Client as TemporalClient
from dotenv import load_dotenv

# Import streaming functionality
from stream import create_stream_app, stream_manager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="PIP AI Upload API",
    description="Edge API for file uploads and workflow orchestration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_S3_BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
TEMPORAL_HOST = os.getenv("TEMPORAL_HOST", "us-east-1.aws.api.temporal.io:7233")
TEMPORAL_NAMESPACE = os.getenv("TEMPORAL_NAMESPACE", "pip-ai.ts7wf")
TEMPORAL_API_KEY = os.getenv("TEMPORAL_API_KEY")
TEMPORAL_TASK_QUEUE = os.getenv("TEMPORAL_TASK_QUEUE", "pip-ai-task-queue")
UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL", "")
UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")

# Validate required environment variables
required_env_vars = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY", 
    "AWS_S3_BUCKET_NAME",
    "TEMPORAL_API_KEY"
]

optional_env_vars = [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN"
]

for var in required_env_vars:
    if not os.getenv(var):
        raise ValueError(f"Required environment variable {var} is not set")

# Initialize AWS S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

# Pydantic models
class UploadResponse(BaseModel):
    file_id: str
    filename: str
    s3_key: str
    size: int
    content_type: str
    workflow_id: str
    upload_url: str
    status: str = "uploaded"
    created_at: datetime

class AnalysisOptions(BaseModel):
    extract_images: bool = False
    generate_summary: bool = True
    detect_language: bool = True
    analysis_type: str = "document"

class FileMetadata(BaseModel):
    user_id: str
    filename: str
    content_type: str
    size: int
    analysis_options: Optional[AnalysisOptions] = None

# Temporal client - will be initialized on startup
temporal_client: Optional[TemporalClient] = None

@app.on_event("startup")
async def startup_event():
    """Initialize Temporal client and streaming on startup"""
    global temporal_client
    try:
        temporal_client = await TemporalClient.connect(
            target_host=TEMPORAL_HOST,
            namespace=TEMPORAL_NAMESPACE,
            api_key=TEMPORAL_API_KEY,
            tls=True
        )
        logger.info("Connected to Temporal Cloud successfully")
        
        # Initialize stream manager if Redis is available
        if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN:
            await stream_manager.initialize()
            logger.info("Stream manager initialized")
        else:
            logger.warning("Redis not configured, streaming features disabled")
            
    except Exception as e:
        logger.error(f"Failed to connect to Temporal: {e}")
        raise

def generate_s3_key(user_id: str, filename: str) -> str:
    """Generate unique S3 key for uploaded file"""
    file_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().strftime("%Y/%m/%d")
    safe_filename = filename.replace(" ", "_").replace("/", "_")
    return f"uploads/{user_id}/{timestamp}/{file_id}_{safe_filename}"

def get_content_type_category(content_type: str) -> str:
    """Determine analysis type based on content type"""
    if content_type.startswith("image/"):
        return "image"
    elif content_type in ["application/pdf", "text/plain", "application/msword", 
                         "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        return "document"
    elif content_type in ["text/x-python", "application/javascript", "text/x-java-source"]:
        return "code"
    elif content_type in ["application/json", "text/csv", "application/vnd.ms-excel"]:
        return "data"
    else:
        return "document"  # Default fallback

async def upload_to_s3(file: UploadFile, s3_key: str) -> str:
    """Upload file to S3 and return the URL"""
    try:
        # Read file content
        file_content = await file.read()
        
        # Upload to S3
        s3_client.put_object(
            Bucket=AWS_S3_BUCKET_NAME,
            Key=s3_key,
            Body=file_content,
            ContentType=file.content_type or "application/octet-stream",
            Metadata={
                "original_filename": file.filename or "unknown",
                "upload_timestamp": datetime.utcnow().isoformat(),
            }
        )
        
        # Generate S3 URL
        s3_url = f"https://{AWS_S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        return s3_url
        
    except Exception as e:
        logger.error(f"Failed to upload to S3: {e}")
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")

async def start_analysis_workflow(file_url: str, metadata: FileMetadata, s3_key: str) -> str:
    """Start Temporal workflow for file analysis"""
    if not temporal_client:
        raise HTTPException(status_code=500, detail="Temporal client not initialized")
    
    try:
        workflow_id = f"analyze-{uuid.uuid4()}"
        
        # Prepare workflow input
        analysis_input = {
            "fileUrl": file_url,
            "userId": metadata.user_id,
            "fileName": metadata.filename,
            "s3Key": s3_key,
            "analysisType": get_content_type_category(metadata.content_type),
            "options": {
                "extractImages": metadata.analysis_options.extract_images if metadata.analysis_options else False,
                "generateSummary": metadata.analysis_options.generate_summary if metadata.analysis_options else True,
                "detectLanguage": metadata.analysis_options.detect_language if metadata.analysis_options else True,
            }
        }
        
        # Start workflow
        handle = await temporal_client.start_workflow(
            "analyzeDocumentWorkflow",
            analysis_input,
            id=workflow_id,
            task_queue=TEMPORAL_TASK_QUEUE,
        )
        
        logger.info(f"Started workflow {workflow_id} for file {metadata.filename}")
        return workflow_id
        
    except Exception as e:
        logger.error(f"Failed to start workflow: {e}")
        logger.error(f"Exception type: {type(e)}")
        if hasattr(e, 'args'):
            logger.error(f"Exception args: {e.args}")
        if hasattr(e, 'details'):
            logger.error(f"Exception details: {e.details}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Workflow start failed: {str(e)}")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "PIP AI Upload API", "version": "1.0.0", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Detailed health check"""
    health_status = {
        "api": "healthy",
        "s3": "unknown",
        "temporal": "unknown"
    }
    
    # Test S3 connection
    try:
        s3_client.head_bucket(Bucket=AWS_S3_BUCKET_NAME)
        health_status["s3"] = "healthy"
    except Exception as e:
        health_status["s3"] = f"unhealthy: {str(e)}"
    
    # Test Temporal connection
    try:
        if temporal_client:
            # Simple check - if client exists and we can access it
            health_status["temporal"] = "healthy"
        else:
            health_status["temporal"] = "unhealthy: not connected"
    except Exception as e:
        health_status["temporal"] = f"unhealthy: {str(e)}"
    
    overall_healthy = all(status == "healthy" for status in health_status.values())
    
    return {
        "status": "healthy" if overall_healthy else "degraded",
        "services": health_status,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/upload", response_model=UploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = "default-user",  # In production, extract from JWT token
    extract_images: bool = False,
    generate_summary: bool = True,
    detect_language: bool = True,
    analysis_type: str = "auto"
):
    """
    Upload file to S3 and start analysis workflow
    
    - **file**: The file to upload
    - **user_id**: User ID (extracted from auth in production)
    - **extract_images**: Whether to extract images from document
    - **generate_summary**: Whether to generate summary
    - **detect_language**: Whether to detect document language
    - **analysis_type**: Type of analysis (auto, document, code, data, image)
    """
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    
    if file.size and file.size > 100 * 1024 * 1024:  # 100MB limit
        raise HTTPException(status_code=413, detail="File too large (max 100MB)")
    
    try:
        # Generate S3 key
        s3_key = generate_s3_key(user_id, file.filename)
        file_id = s3_key.split('/')[-1].split('_')[0]  # Extract UUID from key
        
        # Create metadata
        metadata = FileMetadata(
            user_id=user_id,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream",
            size=file.size or 0,
            analysis_options=AnalysisOptions(
                extract_images=extract_images,
                generate_summary=generate_summary,
                detect_language=detect_language,
                analysis_type=analysis_type if analysis_type != "auto" else get_content_type_category(file.content_type or "")
            )
        )
        
        # Upload to S3
        file_url = await upload_to_s3(file, s3_key)
        
        # Publish upload completion to stream
        if stream_manager.redis_client:
            await stream_manager.publish_analysis_progress(file_id, {
                "step": "uploaded",
                "progress": 25,
                "message": "File uploaded to S3 successfully",
                "s3_url": file_url
            })
        
        # Start workflow in background
        workflow_id = await start_analysis_workflow(file_url, metadata, s3_key)
        
        # Publish workflow start to stream
        if stream_manager.redis_client:
            await stream_manager.publish_workflow_progress(workflow_id, {
                "step": "started",
                "progress": 30,
                "message": "Analysis workflow started",
                "file_id": file_id
            })
        
        # Return response
        response = UploadResponse(
            file_id=file_id,
            filename=file.filename,
            s3_key=s3_key,
            size=file.size or 0,
            content_type=file.content_type or "application/octet-stream",
            workflow_id=workflow_id,
            upload_url=file_url,
            status="uploaded",
            created_at=datetime.utcnow()
        )
        
        logger.info(f"Successfully uploaded {file.filename} and started workflow {workflow_id}")
        return response
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/workflow/{workflow_id}/status")
async def get_workflow_status(workflow_id: str):
    """Get status of analysis workflow"""
    if not temporal_client:
        raise HTTPException(status_code=500, detail="Temporal client not initialized")
    
    try:
        handle = temporal_client.get_workflow_handle(workflow_id)
        
        # Query workflow status
        try:
            status = await handle.query("getAnalysisStatus")
            return {
                "workflow_id": workflow_id,
                "status": status,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            # If query fails, get basic workflow info
            description = await handle.describe()
            return {
                "workflow_id": workflow_id,
                "status": {
                    "step": "unknown",
                    "progress": 0,
                    "workflow_status": description.status.name
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Failed to get workflow status: {e}")
        raise HTTPException(status_code=404, detail=f"Workflow not found: {str(e)}")

@app.post("/workflow/{workflow_id}/cancel")
async def cancel_workflow(workflow_id: str):
    """Cancel analysis workflow"""
    if not temporal_client:
        raise HTTPException(status_code=500, detail="Temporal client not initialized")
    
    try:
        handle = temporal_client.get_workflow_handle(workflow_id)
        await handle.signal("cancelAnalysis")
        
        # Publish cancellation to stream
        if stream_manager.redis_client:
            await stream_manager.publish_workflow_progress(workflow_id, {
                "step": "cancelled",
                "progress": 0,
                "message": "Workflow cancelled by user",
                "cancelled": True
            })
        
        return {
            "workflow_id": workflow_id,
            "status": "cancel_requested",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to cancel workflow: {e}")
        raise HTTPException(status_code=404, detail=f"Workflow not found: {str(e)}")

# === STREAMING ENDPOINTS ===

@app.get("/stream/workflow/{workflow_id}")
async def stream_workflow_progress(workflow_id: str, request: Request):
    """Stream workflow progress events via SSE"""
    async def event_generator():
        async for message in stream_manager.stream_workflow_events(workflow_id):
            yield message
            
            # Check if client disconnected
            if await request.is_disconnected():
                stream_manager.stop_stream(workflow_id)
                break
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )

@app.get("/stream/file/{file_id}")
async def stream_file_analysis(file_id: str, request: Request):
    """Stream file analysis progress events via SSE"""
    async def event_generator():
        async for message in stream_manager.stream_file_analysis(file_id):
            yield message
            
            if await request.is_disconnected():
                stream_manager.stop_stream(file_id)
                break
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )

@app.get("/stream/user/{user_id}")
async def stream_user_events(user_id: str, request: Request):
    """Stream all events for a specific user via SSE"""
    async def event_generator():
        async for message in stream_manager.stream_global_events(user_id):
            yield message
            
            if await request.is_disconnected():
                stream_manager.stop_stream(f"user:{user_id}:events")
                break
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
