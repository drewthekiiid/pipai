#!/bin/bash

# PIP AI Temporal Worker - Environment Verification Script
set -e

echo "🔍 Verifying environment setup for Fly.io deployment..."

# Load environment variables from .env
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env..."
    set -a
    source .env
    set +a
fi

# Check required environment variables
REQUIRED_VARS=(
    "FLY_API_TOKEN"
    "TEMPORAL_API_KEY"
    "OPENAI_API_KEY"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_REGION"
    "AWS_S3_BUCKET_NAME"
    "UPSTASH_REDIS_REST_URL"
    "UPSTASH_REDIS_REST_TOKEN"
)

MISSING_VARS=()

echo "🔍 Checking required environment variables..."
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
        echo "❌ Missing: $var"
    else
        # Show first 10 characters of the value for verification
        value="${!var}"
        masked_value="${value:0:10}..."
        echo "✅ Found: $var = $masked_value"
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo ""
    echo "❌ Missing ${#MISSING_VARS[@]} required environment variables:"
    printf '   - %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please set these variables in your .env file before deploying."
    exit 1
fi

echo ""
echo "✅ All required environment variables are set!"
echo "🚀 Ready for Fly.io deployment!"
echo ""
echo "Next steps:"
echo "  1. Run: ./fly-deploy.sh"
echo "  2. Monitor: ./fly-logs.sh"
echo "  3. Check status: ./fly-status.sh" 