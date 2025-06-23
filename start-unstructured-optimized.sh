#!/bin/bash

# 🚀 PIP AI - Start Optimized Unstructured Server
# HIGH-PERFORMANCE document processing with maximum parallelization

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="$PROJECT_ROOT/apps/api/venv"

echo -e "${BLUE}🚀 Starting PIP AI Optimized Unstructured Server...${NC}"
echo -e "${BLUE}   Maximum Quality & Parallel Processing${NC}"
echo

# Check if virtual environment exists
if [ ! -d "$VENV_PATH" ]; then
    echo "❌ Virtual environment not found at $VENV_PATH"
    echo "   Please run the setup script first"
    exit 1
fi

# Activate virtual environment and start optimized server
cd "$PROJECT_ROOT"
source "$VENV_PATH/bin/activate"

echo -e "${GREEN}✅ Virtual environment activated${NC}"
echo -e "${GREEN}✅ Starting optimized server on port 8001...${NC}"
echo

# Start with maximum performance settings
python unstructured-api-server-optimized.py 