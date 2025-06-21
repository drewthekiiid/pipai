#!/bin/bash

# PIP AI Temporal Worker - Logs Viewer
set -e

echo "📋 Viewing PIP AI Temporal Worker logs..."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it first:"
    echo "   https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Follow logs in real-time
flyctl logs --app pip-ai-temporal-workers -f 