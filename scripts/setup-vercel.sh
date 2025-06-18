#!/bin/bash

# =============================================================================
# PIP AI Vercel Setup Script
# =============================================================================
# This script sets up Vercel project and configures environment variables
# for automatic deployment
# =============================================================================

set -e

echo "🚀 Setting up PIP AI Vercel Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel@latest
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local file not found!${NC}"
    echo "Please create .env.local with your environment variables first."
    echo "You can copy from env.template: cp env.template .env.local"
    exit 1
fi

echo -e "${BLUE}📋 Loading environment variables from .env.local...${NC}"

# Source the environment variables
set -o allexport
source .env.local
set +o allexport

# Navigate to web app directory
cd apps/web

echo -e "${BLUE}🔧 Setting up Vercel project...${NC}"

# Initialize Vercel project (this will create .vercel directory)
vercel --yes

echo -e "${BLUE}⚙️  Configuring environment variables in Vercel...${NC}"

# Function to set environment variable in Vercel
set_vercel_env() {
    local key=$1
    local value=$2
    local env_type=${3:-"production,preview,development"}
    
    if [ -n "$value" ]; then
        echo "Setting $key..."
        echo "$value" | vercel env add "$key" "$env_type" --force
    else
        echo -e "${YELLOW}⚠️  Skipping $key (not set in .env.local)${NC}"
    fi
}

# Core API Keys
echo -e "${GREEN}🔑 Setting API Keys...${NC}"
set_vercel_env "OPENAI_API_KEY" "$OPENAI_API_KEY"

# AWS Configuration
echo -e "${GREEN}☁️  Setting AWS Configuration...${NC}"
set_vercel_env "AWS_ACCESS_KEY_ID" "$AWS_ACCESS_KEY_ID"
set_vercel_env "AWS_SECRET_ACCESS_KEY" "$AWS_SECRET_ACCESS_KEY"
set_vercel_env "AWS_REGION" "$AWS_REGION"
set_vercel_env "S3_BUCKET_NAME" "$S3_BUCKET_NAME"

# Temporal Configuration
echo -e "${GREEN}⏰ Setting Temporal Configuration...${NC}"
set_vercel_env "TEMPORAL_NAMESPACE" "$TEMPORAL_NAMESPACE"
set_vercel_env "TEMPORAL_API_KEY" "$TEMPORAL_API_KEY"
set_vercel_env "TEMPORAL_TASK_QUEUE" "$TEMPORAL_TASK_QUEUE"

# Redis Configuration
echo -e "${GREEN}🔄 Setting Redis Configuration...${NC}"
set_vercel_env "REDIS_URL" "$REDIS_URL"
set_vercel_env "REDIS_TOKEN" "$REDIS_TOKEN"

# Application URLs
echo -e "${GREEN}🌐 Setting Application URLs...${NC}"
set_vercel_env "NEXT_PUBLIC_APP_URL" "${NEXT_PUBLIC_APP_URL:-https://pipai.vercel.app}"
set_vercel_env "NEXT_PUBLIC_API_URL" "${NEXT_PUBLIC_API_URL:-https://pipai.vercel.app/api}"

# Development Configuration
echo -e "${GREEN}🛠️  Setting Development Configuration...${NC}"
set_vercel_env "NODE_ENV" "production" "production"
set_vercel_env "NODE_ENV" "development" "development,preview"

echo -e "${GREEN}📝 Getting Vercel project information...${NC}"

# Get project information
PROJECT_INFO=$(vercel project ls --format=json | jq -r '.[] | select(.name | contains("pipai")) | .id, .accountId' | head -2)
PROJECT_ID=$(echo "$PROJECT_INFO" | head -1)
ORG_ID=$(echo "$PROJECT_INFO" | tail -1)

echo -e "${BLUE}📊 Project Information:${NC}"
echo "   Project ID: $PROJECT_ID"
echo "   Org ID: $ORG_ID"

# Add these to GitHub secrets instructions
echo ""
echo -e "${GREEN}🎯 Next Steps:${NC}"
echo ""
echo "1. Add these secrets to your GitHub repository:"
echo "   Go to: https://github.com/drewthekiiid/pipai/settings/secrets/actions"
echo ""
echo "   Add the following secrets:"
echo "   • VERCEL_TOKEN: $(vercel whoami --token)"
echo "   • VERCEL_PROJECT_ID: $PROJECT_ID"
echo "   • VERCEL_ORG_ID: $ORG_ID"
echo ""
echo "2. All your environment variables have been configured in Vercel"
echo ""
echo "3. Push to main branch to trigger automatic deployment:"
echo "   git add ."
echo "   git commit -m \"🚀 Setup Vercel auto-deployment\""
echo "   git push origin main"
echo ""
echo -e "${GREEN}✅ Vercel setup complete!${NC}"
echo ""
echo "🌐 Your app will be deployed at: https://pipai.vercel.app"
echo "📊 Vercel dashboard: https://vercel.com/dashboard"

cd ../.. 