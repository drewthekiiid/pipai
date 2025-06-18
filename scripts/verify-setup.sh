#!/bin/bash

# =============================================================================
# PIP AI Setup Verification Script
# =============================================================================
# This script verifies that the development environment is working correctly
# =============================================================================

echo "🔍 Verifying PIP AI Development Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to test URL and return status
test_url() {
    local url=$1
    local name=$2
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo -e "   ${GREEN}✅ $name${NC}"
        return 0
    else
        echo -e "   ${RED}❌ $name (HTTP $response)${NC}"
        return 1
    fi
}

echo ""
echo -e "${BLUE}📋 Checking Prerequisites...${NC}"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "   ${GREEN}✅ Node.js ($NODE_VERSION)${NC}"
else
    echo -e "   ${RED}❌ Node.js not found${NC}"
fi

# Check pnpm
if command_exists pnpm; then
    PNPM_VERSION=$(pnpm --version)
    echo -e "   ${GREEN}✅ pnpm ($PNPM_VERSION)${NC}"
else
    echo -e "   ${RED}❌ pnpm not found${NC}"
fi

# Check git
if command_exists git; then
    echo -e "   ${GREEN}✅ Git${NC}"
else
    echo -e "   ${RED}❌ Git not found${NC}"
fi

echo ""
echo -e "${BLUE}📁 Checking Project Structure...${NC}"

# Check important files
files=(
    ".envrc"
    "env.template" 
    "dev-start.sh"
    "dev-stop.sh"
    "apps/web/package.json"
    "packages/shared/src/index.ts"
    "packages/ui/src/index.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "   ${GREEN}✅ $file${NC}"
    else
        echo -e "   ${RED}❌ $file missing${NC}"
    fi
done

echo ""
echo -e "${BLUE}🔧 Checking Environment Configuration...${NC}"

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo -e "   ${GREEN}✅ .env.local exists${NC}"
    
    # Check for critical environment variables
    if grep -q "OPENAI_API_KEY" .env.local; then
        echo -e "   ${GREEN}✅ OPENAI_API_KEY configured${NC}"
    else
        echo -e "   ${YELLOW}⚠️  OPENAI_API_KEY not found${NC}"
    fi
    
    if grep -q "AWS_ACCESS_KEY_ID" .env.local; then
        echo -e "   ${GREEN}✅ AWS credentials configured${NC}"
    else
        echo -e "   ${YELLOW}⚠️  AWS credentials not found${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  .env.local not found (copy from env.template)${NC}"
fi

echo ""
echo -e "${BLUE}📦 Checking Package Dependencies...${NC}"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo -e "   ${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "   ${RED}❌ Dependencies not installed (run: pnpm install)${NC}"
fi

# Check if packages are built
if [ -d "packages/shared/dist" ]; then
    echo -e "   ${GREEN}✅ Shared package built${NC}"
else
    echo -e "   ${YELLOW}⚠️  Shared package not built${NC}"
fi

if [ -d "packages/ui/dist" ]; then
    echo -e "   ${GREEN}✅ UI package built${NC}"
else
    echo -e "   ${YELLOW}⚠️  UI package not built${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Testing Development Server...${NC}"

# Check if development server is running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "   ${GREEN}✅ Development server running on port 3000${NC}"
    
    # Test endpoints
    test_url "http://localhost:3000" "Frontend"
    test_url "http://localhost:3000/api/upload" "API"
    
    # Test API response
    API_RESPONSE=$(curl -s http://localhost:3000/api/upload 2>/dev/null)
    if echo "$API_RESPONSE" | grep -q "PIP AI Unified API"; then
        echo -e "   ${GREEN}✅ API response valid${NC}"
    else
        echo -e "   ${RED}❌ API response invalid${NC}"
    fi
    
else
    echo -e "   ${YELLOW}⚠️  Development server not running${NC}"
    echo -e "   ${BLUE}   Start with: ./dev-start.sh${NC}"
fi

echo ""
echo -e "${BLUE}🔗 Checking Git Repository...${NC}"

# Check git status
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Git repository initialized${NC}"
    
    # Check remote
    if git remote get-url origin > /dev/null 2>&1; then
        REMOTE_URL=$(git remote get-url origin)
        echo -e "   ${GREEN}✅ Remote: $REMOTE_URL${NC}"
    else
        echo -e "   ${YELLOW}⚠️  No git remote configured${NC}"
    fi
else
    echo -e "   ${RED}❌ Not a git repository${NC}"
fi

echo ""
echo -e "${GREEN}🎯 Setup Verification Complete!${NC}"
echo ""
echo -e "${BLUE}📚 Quick Commands:${NC}"
echo "   Start development: ./dev-start.sh"
echo "   Stop development:  ./dev-stop.sh"
echo "   Build packages:    pnpm run build"
echo "   Install deps:      pnpm install"
echo ""
echo -e "${BLUE}📖 Documentation:${NC}"
echo "   Development setup: DEVELOPMENT_SETUP.md"
echo "   Deployment guide:  DEPLOYMENT_GUIDE.md"
echo "   Environment vars:  env.template" 