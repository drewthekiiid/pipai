#!/bin/bash

# =============================================================================
# PIP AI Enhanced Vercel Setup Script
# =============================================================================
# This script automatically configures Vercel for the existing project
# =============================================================================

set -e

echo "🚀 Setting up PIP AI Vercel Deployment (Enhanced)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to root directory
cd "$(dirname "$0")/.."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local file not found!${NC}"
    echo "Please create .env.local with your environment variables first."
    exit 1
fi

echo -e "${BLUE}📋 Loading environment variables from .env.local...${NC}"

# Source the environment variables
set -o allexport
source .env.local
set +o allexport

# Navigate to web app directory
cd apps/web

# Temporarily unset Vercel environment variables that might conflict
unset VERCEL_ORG_ID
unset VERCEL_PROJECT_ID

# Check if .vercel directory exists
if [ ! -d ".vercel" ]; then
    echo -e "${YELLOW}⚠️  No Vercel project found. Initializing...${NC}"
    vercel --yes
else
    echo -e "${GREEN}✅ Vercel project already configured${NC}"
fi

# Get project information
if [ -f ".vercel/project.json" ]; then
    PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4)
    ORG_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4)
    echo -e "${BLUE}📊 Using existing project:${NC}"
    echo "   Project ID: $PROJECT_ID"
    echo "   Org ID: $ORG_ID"
else
    echo -e "${RED}❌ Could not find project.json${NC}"
    exit 1
fi

echo -e "${BLUE}⚙️  Configuring environment variables in Vercel...${NC}"

# Function to set environment variable in Vercel
set_vercel_env() {
    local key=$1
    local value=$2
    
    if [ -n "$value" ]; then
        echo "Setting $key..."
        echo "$value" | vercel env add "$key" production --force
        echo "$value" | vercel env add "$key" preview --force
        echo "$value" | vercel env add "$key" development --force
    else
        echo -e "${YELLOW}⚠️  Skipping $key (not set in .env.local)${NC}"
    fi
}

# Core API Keys
echo -e "${GREEN}🔑 Setting API Keys...${NC}"
set_vercel_env "OPENAI_API_KEY" "$OPENAI_API_KEY"
set_vercel_env "OPENAI_GPT4_KEY" "$OPENAI_GPT4_KEY"
set_vercel_env "OPENAI_GPT4_MINI_KEY" "$OPENAI_GPT4_MINI_KEY"

# AWS Configuration
echo -e "${GREEN}☁️  Setting AWS Configuration...${NC}"
set_vercel_env "AWS_ACCESS_KEY_ID" "$AWS_ACCESS_KEY_ID"
set_vercel_env "AWS_SECRET_ACCESS_KEY" "$AWS_SECRET_ACCESS_KEY"
set_vercel_env "AWS_REGION" "$AWS_REGION"
set_vercel_env "AWS_S3_BUCKET_NAME" "$AWS_S3_BUCKET_NAME"

# Temporal Configuration
echo -e "${GREEN}⏰ Setting Temporal Configuration...${NC}"
set_vercel_env "TEMPORAL_ADDRESS" "$TEMPORAL_ADDRESS"
set_vercel_env "TEMPORAL_NAMESPACE" "$TEMPORAL_NAMESPACE"
set_vercel_env "TEMPORAL_API_KEY" "$TEMPORAL_API_KEY"
set_vercel_env "TEMPORAL_TASK_QUEUE" "$TEMPORAL_TASK_QUEUE"

# Redis Configuration (Upstash)
echo -e "${GREEN}🔄 Setting Redis Configuration...${NC}"
set_vercel_env "UPSTASH_REDIS_REST_URL" "$UPSTASH_REDIS_REST_URL"
set_vercel_env "UPSTASH_REDIS_REST_TOKEN" "$UPSTASH_REDIS_REST_TOKEN"

# Application URLs
echo -e "${GREEN}🌐 Setting Application URLs...${NC}"
set_vercel_env "NEXT_PUBLIC_APP_URL" "${NEXT_PUBLIC_APP_URL:-https://pipai.vercel.app}"
set_vercel_env "NEXT_PUBLIC_API_URL" "${NEXT_PUBLIC_API_URL:-https://pipai.vercel.app/api}"

# Development Configuration
echo -e "${GREEN}🛠️  Setting Development Configuration...${NC}"
echo "production" | vercel env add "NODE_ENV" production --force
echo "development" | vercel env add "NODE_ENV" development --force
echo "development" | vercel env add "NODE_ENV" preview --force

# Get Vercel token for GitHub secrets
VERCEL_TOKEN=$(vercel whoami --token 2>/dev/null || echo "")

echo ""
echo -e "${GREEN}🎯 Setup Complete! Next Steps:${NC}"
echo ""
echo "1. GitHub Secrets (Add to: https://github.com/drewthekiiid/pipai/settings/secrets/actions):"
echo "   • VERCEL_TOKEN: $VERCEL_TOKEN"
echo "   • VERCEL_PROJECT_ID: $PROJECT_ID"
echo "   • VERCEL_ORG_ID: $ORG_ID"
echo ""
echo "2. Test the deployment:"
echo "   vercel --prod"
echo ""
echo "3. Push to trigger automatic deployment:"
echo "   git add ."
echo "   git commit -m \"🚀 Vercel deployment ready\""
echo "   git push origin main"
echo ""
echo -e "${GREEN}✅ Vercel setup complete!${NC}"
echo ""
echo "🌐 Your app will be deployed at: https://pipai.vercel.app"
echo "📊 Vercel dashboard: https://vercel.com/dashboard"

cd ../..
