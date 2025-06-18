#!/bin/bash

# PIP AI Upload API Setup Script
# Sets up the API with proper environment variables from Pulumi stack

echo "🚀 Setting up PIP AI Upload API..."

# Check if we're in the right directory
if [ ! -f "apps/api/upload.py" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Navigate to API directory
cd apps/api

# Create .env file from Pulumi outputs
echo "📝 Creating .env file from Pulumi stack outputs..."

# Get Pulumi outputs (requires pulumi CLI and proper stack selection)
if command -v pulumi &> /dev/null; then
    echo "Getting AWS credentials from Pulumi stack..."
    
    AWS_ACCESS_KEY_ID=$(pulumi stack output awsAccessKeyId 2>/dev/null)
    AWS_SECRET_ACCESS_KEY=$(pulumi stack output awsSecretAccessKey 2>/dev/null)
    AWS_S3_BUCKET_NAME=$(pulumi stack output awsS3BucketName 2>/dev/null)
    AWS_REGION=$(pulumi stack output awsRegion 2>/dev/null)
    UPSTASH_REDIS_URL=$(pulumi stack output upstashRedisUrl 2>/dev/null)
    UPSTASH_REDIS_TOKEN=$(pulumi stack output upstashRedisToken 2>/dev/null)
    
    if [ -n "$AWS_ACCESS_KEY_ID" ]; then
        cat > .env << EOF
# AWS S3 Configuration (from Pulumi stack)
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET_NAME=$AWS_S3_BUCKET_NAME
AWS_REGION=$AWS_REGION

# Upstash Redis Configuration (from Pulumi stack)
UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_URL
UPSTASH_REDIS_REST_TOKEN=$UPSTASH_REDIS_TOKEN

# Temporal Configuration
TEMPORAL_HOST=us-east-1.aws.api.temporal.io:7233
TEMPORAL_NAMESPACE=pip-ai.ts7wf
TEMPORAL_API_KEY=${TEMPORAL_API_KEY:-your_temporal_api_key_here}
TEMPORAL_TASK_QUEUE=pip-ai-task-queue

# API Configuration
PORT=8000
DEBUG=true

# CORS Configuration
ALLOWED_ORIGINS=*
EOF
        echo "✅ Environment variables configured from Pulumi stack"
    else
        echo "⚠️  Could not get Pulumi outputs, copying example file"
        cp .env.example .env
        echo "📝 Please edit .env with your actual values"
    fi
else
    echo "⚠️  Pulumi CLI not found, copying example file"
    cp .env.example .env
    echo "📝 Please edit .env with your actual values"
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "✅ PIP AI Upload API setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit apps/api/.env with your actual credentials if needed"
echo "2. Make sure your Temporal worker is running"
echo "3. Start the API development server:"
echo ""
echo "   cd apps/api"
echo "   source venv/bin/activate"
echo "   uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "Or use turbo from the project root:"
echo "   pnpm turbo api:dev"
echo ""
echo "The API will be available at: http://localhost:8000"
echo "API docs will be available at: http://localhost:8000/docs"
