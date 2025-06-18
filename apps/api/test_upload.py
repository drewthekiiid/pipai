"""
Tests for PIP AI Upload API
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import io

from upload import app

client = TestClient(app)

def test_root():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "PIP AI Upload API"

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()

@patch('upload.s3_client')
@patch('upload.temporal_client')
def test_file_upload(mock_temporal, mock_s3):
    """Test file upload endpoint"""
    # Mock S3 upload
    mock_s3.put_object.return_value = None
    
    # Mock Temporal workflow start
    mock_workflow_handle = MagicMock()
    mock_workflow_handle.id = "test-workflow-123"
    mock_temporal.start_workflow.return_value = mock_workflow_handle
    
    # Create test file
    test_file_content = b"Test file content"
    test_file = ("test.txt", io.BytesIO(test_file_content), "text/plain")
    
    # Test upload
    response = client.post(
        "/upload",
        files={"file": test_file},
        data={
            "user_id": "test-user",
            "generate_summary": True,
            "detect_language": True
        }
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["filename"] == "test.txt"
    assert response_data["status"] == "uploaded"
    assert "workflow_id" in response_data

def test_upload_no_file():
    """Test upload endpoint without file"""
    response = client.post("/upload", data={"user_id": "test-user"})
    assert response.status_code == 422  # Validation error

if __name__ == "__main__":
    pytest.main([__file__])
