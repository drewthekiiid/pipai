#!/bin/bash

# =============================================================================
# PIP AI Environment Configuration Validator & Fixer
# =============================================================================

echo "🔍 PIP AI Environment Configuration Check"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ISSUES_FOUND=0

check_env_var() {
    local var_name=$1
    local file_path=$2
    local is_required=${3:-false}
    
    if grep -q "^${var_name}=" "$file_path" 2>/dev/null; then
        local value=$(grep "^${var_name}=" "$file_path" | cut -d'=' -f2- | tr -d '"')
        if [[ -n "$value" && "$value" != "your_"* ]]; then
            echo -e "${GREEN}✅ $var_name${NC} (configured)"
        else
            echo -e "${YELLOW}⚠️  $var_name${NC} (placeholder value)"
            ((ISSUES_FOUND++))
        fi
    else
        if [[ "$is_required" == "true" ]]; then
            echo -e "${RED}❌ $var_name${NC} (missing - required)"
            ((ISSUES_FOUND++))
        else
            echo -e "${YELLOW}⚠️  $var_name${NC} (missing - optional)"
        fi
    fi
}

echo -e "\n${BLUE}📁 Checking Root .env file...${NC}"
if [[ -f ".env" ]]; then
    echo "Core Services:"
    check_env_var "OPENAI_API_KEY" ".env" true
    check_env_var "AWS_ACCESS_KEY_ID" ".env" true  
    check_env_var "AWS_SECRET_ACCESS_KEY" ".env" true
    check_env_var "AWS_S3_BUCKET_NAME" ".env" true
    check_env_var "TEMPORAL_API_KEY" ".env" true
    check_env_var "UPSTASH_REDIS_REST_URL" ".env" true
    check_env_var "DATABASE_URL" ".env" true
else
    echo -e "${RED}❌ Root .env file not found!${NC}"
    ((ISSUES_FOUND++))
fi

echo -e "\n${BLUE}📁 Checking Apps/Web .env.local file...${NC}"
if [[ -f "apps/web/.env.local" ]]; then
    echo "Web App Configuration:"
    check_env_var "OPENAI_API_KEY" "apps/web/.env.local" true
    check_env_var "AWS_ACCESS_KEY_ID" "apps/web/.env.local" true
    check_env_var "TEMPORAL_ADDRESS" "apps/web/.env.local" true
    check_env_var "UPSTASH_REDIS_REST_URL" "apps/web/.env.local" true
else
    echo -e "${RED}❌ apps/web/.env.local file not found!${NC}"
    ((ISSUES_FOUND++))
fi

echo -e "\n${BLUE}🔗 Checking Service Connectivity...${NC}"

# Test Redis connection
if command -v curl &> /dev/null; then
    REDIS_URL=$(grep "^UPSTASH_REDIS_REST_URL=" ".env" 2>/dev/null | cut -d'=' -f2)
    REDIS_TOKEN=$(grep "^UPSTASH_REDIS_REST_TOKEN=" ".env" 2>/dev/null | cut -d'=' -f2)
    
    if [[ -n "$REDIS_URL" && -n "$REDIS_TOKEN" ]]; then
        if curl -s -H "Authorization: Bearer $REDIS_TOKEN" "$REDIS_URL/ping" | grep -q "PONG"; then
            echo -e "${GREEN}✅ Redis connection${NC} (working)"
        else
            echo -e "${YELLOW}⚠️  Redis connection${NC} (check credentials)"
            ((ISSUES_FOUND++))
        fi
    fi
fi

echo -e "\n${BLUE}📊 Summary${NC}"
echo "============"

if [[ $ISSUES_FOUND -eq 0 ]]; then
    echo -e "${GREEN}🎉 All environment variables are properly configured!${NC}"
else
    echo -e "${YELLOW}⚠️  Found $ISSUES_FOUND issues that need attention${NC}"
    
    echo -e "\n${BLUE}🔧 Recommended Actions:${NC}"
    echo "1. Copy missing variables from .env to apps/web/.env.local:"
    echo "   cp .env apps/web/.env.local"
    echo ""
    echo "2. Ensure consistent Temporal configuration:"
    echo "   - For local dev: TEMPORAL_ADDRESS=localhost:7233"
    echo "   - For production: TEMPORAL_ADDRESS=us-east-1.aws.api.temporal.io:7233"
    echo ""
    echo "3. Verify all API keys are set and not placeholder values"
    echo ""
    echo "4. Run: pnpm dev to test the configuration"
fi

echo -e "\n${BLUE}🚀 Ready for Deployment Check:${NC}"
echo "================================="

required_for_deployment=(
    "OPENAI_API_KEY"
    "AWS_ACCESS_KEY_ID" 
    "AWS_SECRET_ACCESS_KEY"
    "AWS_S3_BUCKET_NAME"
    "TEMPORAL_API_KEY"
    "UPSTASH_REDIS_REST_URL"
    "UPSTASH_REDIS_REST_TOKEN"
    "DATABASE_URL"
)

deployment_ready=true
for var in "${required_for_deployment[@]}"; do
    if ! grep -q "^${var}=" ".env" 2>/dev/null || [[ $(grep "^${var}=" ".env" | cut -d'=' -f2- | tr -d '"') =~ ^your_.* ]]; then
        deployment_ready=false
        break
    fi
done

if [[ "$deployment_ready" == "true" ]]; then
    echo -e "${GREEN}✅ Ready for Vercel deployment!${NC}"
    echo "Run: bash scripts/setup-vercel-auto.sh"
else
    echo -e "${YELLOW}⚠️  Complete environment setup before deployment${NC}"
fi
