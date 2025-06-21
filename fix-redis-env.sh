#!/bin/bash

# Script to fix and re-add Redis environment variables to Vercel
# This ensures no whitespace issues cause deployment failures

set -e

echo "🔧 Fixing Redis Environment Variables for Vercel..."

# Read and clean the values from .env
REDIS_URL=$(grep "UPSTASH_REDIS_REST_URL=" .env | cut -d'=' -f2- | xargs)
REDIS_TOKEN=$(grep "UPSTASH_REDIS_REST_TOKEN=" .env | cut -d'=' -f2- | xargs)

# Verify the values are not empty
if [ -z "$REDIS_URL" ]; then
    echo "❌ Error: UPSTASH_REDIS_REST_URL not found in .env"
    exit 1
fi

if [ -z "$REDIS_TOKEN" ]; then
    echo "❌ Error: UPSTASH_REDIS_REST_TOKEN not found in .env"
    exit 1
fi

# Verify URL format
if [[ ! "$REDIS_URL" =~ ^https:// ]]; then
    echo "❌ Error: UPSTASH_REDIS_REST_URL should start with https://"
    echo "Found: $REDIS_URL"
    exit 1
fi

# Check for any remaining whitespace or newlines
if [[ "$REDIS_URL" =~ [[:space:]] ]]; then
    echo "❌ Error: UPSTASH_REDIS_REST_URL contains whitespace"
    echo "Value: '$REDIS_URL'"
    exit 1
fi

if [[ "$REDIS_TOKEN" =~ [[:space:]] ]]; then
    echo "❌ Error: UPSTASH_REDIS_REST_TOKEN contains whitespace"
    echo "Value: '$REDIS_TOKEN'"
    exit 1
fi

echo "✅ Redis URL: $REDIS_URL"
echo "✅ Redis Token: ${REDIS_TOKEN:0:20}... (truncated)"

# Add to Vercel environments
echo "📡 Adding UPSTASH_REDIS_REST_URL to Vercel..."
echo "$REDIS_URL" | vercel env add UPSTASH_REDIS_REST_URL production
echo "$REDIS_URL" | vercel env add UPSTASH_REDIS_REST_URL preview
echo "$REDIS_URL" | vercel env add UPSTASH_REDIS_REST_URL development

echo "📡 Adding UPSTASH_REDIS_REST_TOKEN to Vercel..."
echo "$REDIS_TOKEN" | vercel env add UPSTASH_REDIS_REST_TOKEN production
echo "$REDIS_TOKEN" | vercel env add UPSTASH_REDIS_REST_TOKEN preview
echo "$REDIS_TOKEN" | vercel env add UPSTASH_REDIS_REST_TOKEN development

echo "✅ Redis environment variables successfully added to Vercel!"
echo "🚀 Ready to deploy again!" 