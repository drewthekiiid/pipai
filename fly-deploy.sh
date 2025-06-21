#!/bin/bash

# PIP AI Temporal Worker - Fly.io Deployment Script
set -e

echo "🚀 Deploying PIP AI Temporal Workers to Fly.io..."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it first:"
    echo "   https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Check if we have FLY_API_TOKEN or are logged in
if [ -z "$FLY_API_TOKEN" ]; then
    echo "🔑 FLY_API_TOKEN not found, checking if logged in..."
    if ! flyctl auth whoami &> /dev/null; then
        echo "❌ Not authenticated with Fly.io. Either:"
        echo "   1. Set FLY_API_TOKEN environment variable, or"
        echo "   2. Run: flyctl auth login"
        exit 1
    fi
else
    echo "🔑 Using FLY_API_TOKEN for authentication"
    export FLY_API_TOKEN
fi

# Load environment variables from .env
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env..."
    set -a
    source .env
    set +a
fi

# Create the app if it doesn't exist
echo "🔧 Setting up Fly.io app..."
if ! flyctl apps list | grep -q "pip-ai-temporal-workers"; then
    echo "Creating new Fly.io app: pip-ai-temporal-workers"
    flyctl apps create pip-ai-temporal-workers --generate-name=false
fi

# Set secrets for the app
echo "🔐 Setting environment secrets..."
flyctl secrets set \
    TEMPORAL_API_KEY="${TEMPORAL_API_KEY}" \
    OPENAI_API_KEY="${OPENAI_API_KEY}" \
    AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
    AWS_REGION="${AWS_REGION}" \
    AWS_S3_BUCKET_NAME="${AWS_S3_BUCKET_NAME}" \
    UPSTASH_REDIS_REST_URL="${UPSTASH_REDIS_REST_URL}" \
    UPSTASH_REDIS_REST_TOKEN="${UPSTASH_REDIS_REST_TOKEN}" \
    --app pip-ai-temporal-workers

# Deploy the application
echo "🚢 Deploying to Fly.io..."
flyctl deploy --config fly.toml

# Scale to ensure at least 1 instance is running
echo "📊 Scaling workers..."
flyctl scale count 1 --app pip-ai-temporal-workers

# Show deployment status
echo "✅ Deployment complete!"
echo "📊 App status:"
flyctl status --app pip-ai-temporal-workers

echo "📋 Logs (last 100 lines):"
flyctl logs --app pip-ai-temporal-workers -n 100

echo ""
echo "🎉 Temporal workers are now running 24/7 on Fly.io!"
echo "💡 Monitor logs with: flyctl logs --app pip-ai-temporal-workers -f"
echo "💡 Scale workers with: flyctl scale count <number> --app pip-ai-temporal-workers" 