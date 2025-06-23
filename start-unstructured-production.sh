#!/bin/bash

# Start Unstructured-IO Service for 24/7 Production Operation
# Enhanced configuration with monitoring, logging, and auto-updates

set -e

echo "🚀 Starting Unstructured-IO for 24/7 Production..."

# Create necessary directories
mkdir -p ./tmp ./logs

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if production service is already running
if docker ps | grep -q "unstructured-api-prod"; then
    echo "✅ Production Unstructured-IO service is already running"
    echo "🔗 Service available at: http://localhost:8000"
    echo "🏥 Health check at: http://localhost:8000/healthcheck"
    echo "📊 Monitor with: docker-compose -f docker-compose.unstructured.production.yml logs -f"
    exit 0
fi

# Stop development version if running
if docker ps | grep -q "unstructured-api"; then
    echo "🔄 Stopping development version..."
    docker-compose -f docker-compose.unstructured.yml down
fi

echo "📦 Starting production Unstructured-IO with enhanced monitoring..."
docker-compose -f docker-compose.unstructured.production.yml up -d

# Wait for service to be ready with extended timeout for production
echo "⏳ Waiting for production service to be ready..."
for i in {1..60}; do
    if curl -f http://localhost:8000/healthcheck > /dev/null 2>&1; then
        echo "✅ Production Unstructured-IO service is ready!"
        echo ""
        echo "🔗 Service Details:"
        echo "  • API: http://localhost:8000"
        echo "  • Health: http://localhost:8000/healthcheck"
        echo "  • API Docs: http://localhost:8000/docs"
        echo ""
        echo "🔧 Production Features:"
        echo "  • ✅ 24/7 operation with aggressive restart policy"
        echo "  • ✅ Enhanced health monitoring (every 15s)"
        echo "  • ✅ Resource limits and reservations"
        echo "  • ✅ Automatic log rotation (100MB, 5 files)"
        echo "  • ✅ Auto-update monitoring with Watchtower"
        echo "  • ✅ 4 workers for concurrent processing"
        echo ""
        echo "📊 Monitoring Commands:"
        echo "  • View logs: docker-compose -f docker-compose.unstructured.production.yml logs -f"
        echo "  • Check status: docker ps | grep unstructured"
        echo "  • Resource usage: docker stats unstructured-api-prod"
        echo "  • Health check: curl http://localhost:8000/healthcheck"
        echo ""
        echo "🔄 Management Commands:"
        echo "  • Restart: docker-compose -f docker-compose.unstructured.production.yml restart"
        echo "  • Stop: docker-compose -f docker-compose.unstructured.production.yml down"
        echo "  • Update: docker-compose -f docker-compose.unstructured.production.yml pull && docker-compose -f docker-compose.unstructured.production.yml up -d"
        
        # Show current container status
        echo ""
        echo "📈 Container Status:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(NAMES|unstructured)"
        
        exit 0
    fi
    
    if [ $((i % 10)) -eq 0 ]; then
        echo "⏳ Still waiting for production service... ($i/60)"
    fi
    sleep 2
done

echo "❌ Production service failed to start within 120 seconds"
echo "📋 Check logs with: docker-compose -f docker-compose.unstructured.production.yml logs"
echo "🔍 Check container status: docker ps -a | grep unstructured"
exit 1 