#!/bin/bash

# =============================================================================
# Prepare Web App for Vercel Deployment 
# =============================================================================

echo "🚀 Preparing web app for Vercel deployment..."

# Navigate to web app directory
cd "$(dirname "$0")/../apps/web"

# Install dependencies locally
echo "📦 Installing dependencies..."
npm install

# Copy shared packages if needed
echo "📋 Copying package.json files..."
cp ../../package.json ./root-package.json || true

echo "✅ Web app prepared for deployment!"
echo ""
echo "🚀 Now run: vercel --prod"
