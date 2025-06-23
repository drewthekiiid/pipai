#!/bin/bash

# Start Unstructured-IO Service
# This script starts the Unstructured-IO Docker container for document processing

set -e

echo "🚀 Starting FREE Unstructured-IO Open Source Service..."

# Create tmp directory if it doesn't exist
mkdir -p ./tmp

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if the service is already running
if docker ps | grep -q "unstructured-api"; then
    echo "✅ Unstructured-IO service is already running"
    echo "🔗 Service available at: http://localhost:8000"
    echo "🏥 Health check at: http://localhost:8000/healthcheck"
    exit 0
fi

# Start the service
echo "📦 Starting Unstructured-IO container..."
docker-compose -f docker-compose.unstructured.yml up -d

# Wait for service to be ready
echo "⏳ Waiting for service to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:8000/general/docs > /dev/null 2>&1; then
        echo "✅ Unstructured-IO service is ready!"
        echo "🔗 Service available at: http://localhost:8000"
        echo "📋 API docs at: http://localhost:8000/docs"
        
        echo ""
        echo "🔧 Supported file types:"
        echo "  - PDF, Word (docx/doc), PowerPoint (pptx/ppt)"
        echo "  - Excel (xlsx/xls), HTML, XML, Text, Markdown"
        echo "  - Images (PNG, JPG, TIFF, BMP, HEIC) with OCR"
        echo ""
        echo "📝 Features enabled:"
        echo "  - High-resolution text extraction"
        echo "  - Table structure recognition"
        echo "  - Image and diagram extraction"
        echo "  - Layout-aware processing"
        echo "  - OCR support for images"
        
        exit 0
    fi
    
    echo "⏳ Still waiting... ($i/30)"
    sleep 2
done

echo "❌ Service failed to start within 60 seconds"
echo "📋 Check logs with: docker-compose -f docker-compose.unstructured.yml logs"
exit 1 