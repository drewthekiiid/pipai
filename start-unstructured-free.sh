#!/bin/bash

# 🆓 FREE Unstructured-IO Open Source Setup
# No API keys, no limits, no costs - completely free forever!

set -e

echo "🆓 =========================================="
echo "🆓   STARTING FREE UNSTRUCTURED-IO SERVICE"
echo "🆓 =========================================="
echo ""
echo "✅ 100% FREE - No API keys required"
echo "✅ No usage limits"
echo "✅ Your data stays private"
echo "✅ Full document processing capabilities"
echo ""

# Create tmp directory if it doesn't exist
mkdir -p ./tmp

echo "📦 Pulling latest open source image..."
docker pull downloads.unstructured.io/unstructured-io/unstructured:latest

echo "🚀 Starting service..."
docker-compose -f docker-compose.unstructured.yml up -d

echo ""
echo "⏳ Waiting for service to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:8000/general/docs > /dev/null 2>&1; then
        echo "✅ FREE Unstructured-IO service is ready!"
        echo ""
        echo "🔗 Service available at: http://localhost:8000"
        echo "📊 API docs at: http://localhost:8000/general/docs"
        echo ""
        echo "🎯 FEATURES AVAILABLE FOR FREE:"
        echo "   • 20+ file formats (PDF, Word, Excel, etc.)"
        echo "   • Advanced table extraction"
        echo "   • Image OCR"
        echo "   • Layout analysis"
        echo "   • Metadata extraction"
        echo "   • Construction document optimization"
        echo ""
        echo "💡 Your PIP AI system will now use this FREE service automatically!"
        exit 0
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

echo "❌ Service failed to start. Check logs with:"
echo "   docker-compose -f docker-compose.unstructured.yml logs"
exit 1 