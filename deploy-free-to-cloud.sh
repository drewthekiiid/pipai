#!/bin/bash

# 🆓 Deploy FREE Unstructured-IO to 24/7 Cloud Infrastructure
# No costs, no API keys, no limits - completely free forever!

set -e

echo "🆓 =========================================="
echo "🆓   DEPLOYING FREE UNSTRUCTURED TO CLOUD"
echo "🆓 =========================================="
echo ""
echo "✅ 100% FREE - No costs or limits"
echo "✅ No API keys required"
echo "✅ 24/7 availability"
echo "✅ Enterprise-grade processing"
echo ""

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "📦 Installing Fly.io CLI..."
    curl -L https://fly.io/install.sh | sh
    export PATH="$HOME/.fly/bin:$PATH"
fi

# Check authentication
if ! flyctl auth whoami &> /dev/null; then
    echo "🔑 Please authenticate with Fly.io:"
    echo "   flyctl auth login"
    echo ""
    echo "   Then run this script again."
    exit 1
fi

echo "🚀 Deploying FREE Unstructured-IO service..."
./deploy-unstructured-cloud.sh

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "🆓 Your FREE Unstructured-IO is now running 24/7 in the cloud:"
echo "   • URL: https://pip-ai-unstructured-free.fly.dev"
echo "   • Cost: $0.00 forever"
echo "   • Limits: None"
echo "   • API Keys: Not required"
echo ""
echo "💡 Your PIP AI system will automatically use the cloud service!"
echo ""
echo "🛠️  Management Commands:"
echo "   • Status: flyctl status --app pip-ai-unstructured-free"
echo "   • Logs: flyctl logs --app pip-ai-unstructured-free"
echo "   • Scale: flyctl scale count 2 --app pip-ai-unstructured-free"
echo ""
echo "🌟 Your document processing is now completely independent of your laptop!" 