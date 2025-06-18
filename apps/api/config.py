"""
Configuration module for PIP AI Upload API
"""

import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Settings
    app_name: str = "PIP AI Upload API"
    version: str = "1.0.0"
    debug: bool = False
    port: int = 8000
    
    # AWS S3 Settings
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_s3_bucket_name: str
    aws_region: str = "us-east-1"
    
    # Temporal Settings
    temporal_host: str = "us-east-1.aws.api.temporal.io:7233"
    temporal_namespace: str = "pip-ai.ts7wf"
    temporal_api_key: str
    temporal_task_queue: str = "pip-ai-task-queue"
    
    # Upstash Redis Settings
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""
    
    # File Upload Settings  
    max_file_size: str = "100MB"  # Will be parsed to bytes
    allowed_file_types: List[str] = [
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/gif",
        "text/csv",
        "application/json"
    ]
    
    # CORS Settings
    allowed_origins: List[str] = ["*"]
    
    class Config:
        env_file = "../../.env"  # Look for .env in project root
        case_sensitive = False
        extra = "ignore"  # Ignore extra environment variables

# Global settings instance
settings = Settings()
