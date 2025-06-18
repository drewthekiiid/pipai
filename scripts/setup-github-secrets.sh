#!/bin/bash

# 🔐 Automated GitHub Secrets Setup Script
# This script reads your .env file and automatically sets GitHub repository secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 PIP AI - Automated GitHub Secrets Setup${NC}"
echo "=================================================="

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install it with: brew install gh"
    echo "Then run: gh auth login"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Default env file path
ENV_FILE="${1:-.env}"

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file '$ENV_FILE' not found${NC}"
    echo "Usage: $0 [path-to-env-file]"
    echo "Example: $0 .env.production"
    exit 1
fi

echo -e "${GREEN}✅ Found environment file: $ENV_FILE${NC}"

# List of required secrets for the CI/CD pipeline
REQUIRED_SECRETS=(
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_REGION"
    "AWS_S3_BUCKET_NAME"
    "VERCEL_API_TOKEN"
    "VERCEL_ORG_ID"
    "VERCEL_PROJECT_ID"
    "PULUMI_ACCESS_TOKEN"
    "OPENAI_API_KEY"
    "UPSTASH_REDIS_REST_URL"
    "UPSTASH_REDIS_REST_TOKEN"
    "TEMPORAL_ADDRESS"
    "TEMPORAL_NAMESPACE"
    "TEMPORAL_API_KEY"
    "TEMPORAL_TASK_QUEUE"
)

# Load environment variables from file
echo -e "${BLUE}📖 Loading environment variables...${NC}"
set -a  # automatically export all variables
source "$ENV_FILE"
set +a

# Get current repository info
REPO=$(gh repo view --json owner,name --jq '.owner.login + "/" + .name')
echo -e "${GREEN}📂 Repository: $REPO${NC}"

# Counters
SECRETS_SET=0
SECRETS_FAILED=0
SECRETS_SKIPPED=0

echo -e "${BLUE}🔐 Setting GitHub repository secrets...${NC}"
echo ""

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if [ -z "$secret_value" ]; then
        echo -e "  ${YELLOW}⏭️  $secret_name - SKIPPED (not found in env file)${NC}"
        ((SECRETS_SKIPPED++))
        return
    fi
    
    # Mask the value for display (show first 4 chars + ***)
    local masked_value="${secret_value:0:4}***"
    
    if gh secret set "$secret_name" --body "$secret_value" &> /dev/null; then
        echo -e "  ${GREEN}✅ $secret_name - SET ($masked_value)${NC}"
        ((SECRETS_SET++))
    else
        echo -e "  ${RED}❌ $secret_name - FAILED${NC}"
        ((SECRETS_FAILED++))
    fi
}

# Set all required secrets
for secret_name in "${REQUIRED_SECRETS[@]}"; do
    # Get the value of the environment variable
    secret_value="${!secret_name}"
    set_secret "$secret_name" "$secret_value"
done

echo ""
echo "=================================================="
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "  ${GREEN}✅ Secrets set: $SECRETS_SET${NC}"
echo -e "  ${YELLOW}⏭️  Secrets skipped: $SECRETS_SKIPPED${NC}"
echo -e "  ${RED}❌ Secrets failed: $SECRETS_FAILED${NC}"

if [ $SECRETS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All available secrets have been set successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "1. Verify secrets in GitHub: https://github.com/$REPO/settings/secrets/actions"
    echo "2. Create a test PR to trigger preview deployment"
    echo "3. Push a git tag (v1.0.0) for production release"
    echo ""
    echo -e "${GREEN}🚀 Your CI/CD pipeline is ready to go!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Some secrets failed to set. Please check your GitHub permissions.${NC}"
fi

echo "" 