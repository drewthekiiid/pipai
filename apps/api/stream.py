"""
PIP AI Stream API
Handles Server-Sent Events (SSE) for real-time progress updates
Consumes from Upstash Redis streams and pipes to browser
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime

import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from temporalio.client import Client as TemporalClient

from config import settings

logger = logging.getLogger(__name__)

# Stream configuration
STREAM_KEYS = {
    "workflow_progress": "pip-ai:workflow:progress",
    "file_analysis": "pip-ai:analysis:progress", 
    "ai_processing": "pip-ai:ai:progress",
    "notifications": "pip-ai:notifications"
}

class StreamManager:
    """Manages Redis streams and SSE connections"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.temporal_client: Optional[TemporalClient] = None
        self.active_streams: Dict[str, bool] = {}
        
    async def initialize(self):
        """Initialize Redis and Temporal clients"""
        try:
            # Initialize Redis client (if URL is provided)
            if settings.upstash_redis_rest_url:
                # Convert REST URL to Redis URL format
                redis_url = settings.upstash_redis_rest_url.replace("https://", "rediss://")
                self.redis_client = redis.from_url(
                    redis_url,
                    password=settings.upstash_redis_rest_token,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_keepalive=True,
                    socket_keepalive_options={},
                    retry_on_timeout=True
                )
                print("✅ Connected to Upstash Redis")
            else:
                print("⚠️ No Redis URL provided, stream features will be disabled")
            
            # Test Redis connection (if client is available)
            if self.redis_client:
                await self.redis_client.ping()
                logger.info("Connected to Upstash Redis successfully")
            
            # Initialize Temporal client
            self.temporal_client = await TemporalClient.connect(
                target_host=settings.temporal_host,
                namespace=settings.temporal_namespace,
                api_key=settings.temporal_api_key,
                tls=True
            )
            logger.info("Connected to Temporal Cloud successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize stream manager: {e}")
            raise
    
    async def cleanup(self):
        """Cleanup connections"""
        if self.redis_client:
            await self.redis_client.close()
        # Temporal client cleanup is automatic
    
    async def publish_workflow_progress(self, workflow_id: str, data: Dict[str, Any]):
        """Publish workflow progress to Redis stream"""
        if not self.redis_client:
            return
            
        try:
            stream_data = {
                "workflow_id": workflow_id,
                "timestamp": datetime.utcnow().isoformat(),
                "event_type": "workflow_progress",
                **data
            }
            
            await self.redis_client.xadd(
                STREAM_KEYS["workflow_progress"],
                stream_data,
                maxlen=1000  # Keep last 1000 entries
            )
            
        except Exception as e:
            logger.error(f"Failed to publish workflow progress: {e}")
    
    async def publish_analysis_progress(self, file_id: str, data: Dict[str, Any]):
        """Publish file analysis progress to Redis stream"""
        if not self.redis_client:
            return
            
        try:
            stream_data = {
                "file_id": file_id,
                "timestamp": datetime.utcnow().isoformat(),
                "event_type": "analysis_progress",
                **data
            }
            
            await self.redis_client.xadd(
                STREAM_KEYS["file_analysis"],
                stream_data,
                maxlen=1000
            )
            
        except Exception as e:
            logger.error(f"Failed to publish analysis progress: {e}")
    
    async def stream_workflow_events(self, workflow_id: str) -> AsyncGenerator[str, None]:
        """Stream workflow events as SSE"""
        if not self.redis_client:
            yield self._format_sse_message("error", {"message": "Redis not connected"})
            return
        
        last_id = "0"
        stream_key = f"{workflow_id}:progress"
        self.active_streams[workflow_id] = True
        
        try:
            # Send initial connection message
            yield self._format_sse_message("connected", {
                "workflow_id": workflow_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            while self.active_streams.get(workflow_id, False):
                try:
                    # Read from Redis stream
                    streams = await self.redis_client.xread(
                        {stream_key: last_id},
                        count=10,
                        block=1000  # 1 second timeout
                    )
                    
                    if streams:
                        for stream_name, messages in streams:
                            for message_id, fields in messages:
                                last_id = message_id
                                
                                # Format and yield SSE message
                                event_data = dict(fields)
                                event_type = event_data.get("event_type", "progress")
                                
                                yield self._format_sse_message(event_type, event_data)
                    
                    # Also query Temporal for workflow status
                    if self.temporal_client:
                        try:
                            handle = self.temporal_client.get_workflow_handle(workflow_id)
                            status = await handle.query("getAnalysisStatus")
                            
                            yield self._format_sse_message("temporal_status", {
                                "workflow_id": workflow_id,
                                "status": status,
                                "timestamp": datetime.utcnow().isoformat()
                            })
                            
                        except Exception as e:
                            # Workflow might not support query or be completed
                            logger.debug(f"Could not query workflow {workflow_id}: {e}")
                    
                    # Small delay to prevent overwhelming
                    await asyncio.sleep(0.1)
                    
                except redis.ConnectionError:
                    yield self._format_sse_message("error", {
                        "message": "Redis connection lost",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    break
                except Exception as e:
                    logger.error(f"Error in workflow stream: {e}")
                    yield self._format_sse_message("error", {
                        "message": str(e),
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
        finally:
            self.active_streams.pop(workflow_id, None)
            yield self._format_sse_message("disconnected", {
                "workflow_id": workflow_id,
                "timestamp": datetime.utcnow().isoformat()
            })
    
    async def stream_file_analysis(self, file_id: str) -> AsyncGenerator[str, None]:
        """Stream file analysis events as SSE"""
        if not self.redis_client:
            yield self._format_sse_message("error", {"message": "Redis not connected"})
            return
        
        last_id = "0"
        stream_key = f"{file_id}:analysis"
        self.active_streams[file_id] = True
        
        try:
            yield self._format_sse_message("connected", {
                "file_id": file_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            while self.active_streams.get(file_id, False):
                try:
                    streams = await self.redis_client.xread(
                        {stream_key: last_id},
                        count=10,
                        block=1000
                    )
                    
                    if streams:
                        for stream_name, messages in streams:
                            for message_id, fields in messages:
                                last_id = message_id
                                event_data = dict(fields)
                                event_type = event_data.get("event_type", "analysis")
                                
                                yield self._format_sse_message(event_type, event_data)
                    
                    await asyncio.sleep(0.1)
                    
                except redis.ConnectionError:
                    yield self._format_sse_message("error", {
                        "message": "Redis connection lost"
                    })
                    break
                except Exception as e:
                    logger.error(f"Error in file analysis stream: {e}")
                    yield self._format_sse_message("error", {"message": str(e)})
                    
        finally:
            self.active_streams.pop(file_id, None)
            yield self._format_sse_message("disconnected", {
                "file_id": file_id,
                "timestamp": datetime.utcnow().isoformat()
            })
    
    async def stream_global_events(self, user_id: str) -> AsyncGenerator[str, None]:
        """Stream global events for a user"""
        if not self.redis_client:
            yield self._format_sse_message("error", {"message": "Redis not connected"})
            return
        
        last_ids = {key: "0" for key in STREAM_KEYS.values()}
        stream_key = f"user:{user_id}:events"
        self.active_streams[stream_key] = True
        
        try:
            yield self._format_sse_message("connected", {
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            while self.active_streams.get(stream_key, False):
                try:
                    # Read from multiple streams
                    streams = await self.redis_client.xread(
                        last_ids,
                        count=5,
                        block=1000
                    )
                    
                    if streams:
                        for stream_name, messages in streams:
                            for message_id, fields in messages:
                                last_ids[stream_name] = message_id
                                event_data = dict(fields)
                                
                                # Filter events for this user
                                if self._is_user_event(event_data, user_id):
                                    event_type = event_data.get("event_type", "notification")
                                    yield self._format_sse_message(event_type, event_data)
                    
                    await asyncio.sleep(0.1)
                    
                except redis.ConnectionError:
                    yield self._format_sse_message("error", {
                        "message": "Redis connection lost"
                    })
                    break
                except Exception as e:
                    logger.error(f"Error in global events stream: {e}")
                    yield self._format_sse_message("error", {"message": str(e)})
                    
        finally:
            self.active_streams.pop(stream_key, None)
            yield self._format_sse_message("disconnected", {
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            })
    
    def stop_stream(self, stream_id: str):
        """Stop a specific stream"""
        self.active_streams[stream_id] = False
    
    def _format_sse_message(self, event_type: str, data: Dict[str, Any]) -> str:
        """Format Server-Sent Event message"""
        return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    
    def _is_user_event(self, event_data: Dict[str, Any], user_id: str) -> bool:
        """Check if event belongs to the user"""
        return (
            event_data.get("user_id") == user_id or
            event_data.get("workflow_id", "").startswith(f"user:{user_id}:") or
            event_data.get("file_id", "").startswith(f"user:{user_id}:")
        )

# Global stream manager instance
stream_manager = StreamManager()

# SSE Response headers
SSE_HEADERS = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
}

class StreamRequest(BaseModel):
    user_id: Optional[str] = None
    include_temporal: bool = True
    include_analysis: bool = True

async def create_stream_app() -> FastAPI:
    """Create the streaming FastAPI app"""
    app = FastAPI(
        title="PIP AI Stream API",
        description="Real-time streaming API for workflow and analysis progress",
        version="1.0.0"
    )
    
    @app.on_event("startup")
    async def startup():
        await stream_manager.initialize()
    
    @app.on_event("shutdown")
    async def shutdown():
        await stream_manager.cleanup()
    
    @app.get("/stream/workflow/{workflow_id}")
    async def stream_workflow_progress(workflow_id: str, request: Request):
        """Stream workflow progress events"""
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
            headers=SSE_HEADERS
        )
    
    @app.get("/stream/file/{file_id}")
    async def stream_file_analysis(file_id: str, request: Request):
        """Stream file analysis progress events"""
        async def event_generator():
            async for message in stream_manager.stream_file_analysis(file_id):
                yield message
                
                if await request.is_disconnected():
                    stream_manager.stop_stream(file_id)
                    break
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers=SSE_HEADERS
        )
    
    @app.get("/stream/user/{user_id}")
    async def stream_user_events(user_id: str, request: Request):
        """Stream all events for a specific user"""
        async def event_generator():
            async for message in stream_manager.stream_global_events(user_id):
                yield message
                
                if await request.is_disconnected():
                    stream_manager.stop_stream(f"user:{user_id}:events")
                    break
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers=SSE_HEADERS
        )
    
    @app.post("/stream/publish/workflow/{workflow_id}")
    async def publish_workflow_event(workflow_id: str, data: dict):
        """Publish workflow progress event to stream"""
        await stream_manager.publish_workflow_progress(workflow_id, data)
        return {"status": "published", "workflow_id": workflow_id}
    
    @app.post("/stream/publish/analysis/{file_id}")
    async def publish_analysis_event(file_id: str, data: dict):
        """Publish analysis progress event to stream"""
        await stream_manager.publish_analysis_progress(file_id, data)
        return {"status": "published", "file_id": file_id}
    
    @app.get("/stream/health")
    async def stream_health():
        """Health check for streaming service"""
        redis_status = "healthy" if stream_manager.redis_client else "disconnected"
        temporal_status = "healthy" if stream_manager.temporal_client else "disconnected"
        
        return {
            "status": "healthy" if redis_status == "healthy" and temporal_status == "healthy" else "degraded",
            "services": {
                "redis": redis_status,
                "temporal": temporal_status
            },
            "active_streams": len(stream_manager.active_streams),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    return app

# Export for integration with main app
__all__ = ["create_stream_app", "stream_manager", "StreamManager"]
