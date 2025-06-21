#!/bin/bash

# PIP AI Temporal Worker - Status Checker
set -e

echo "📊 Checking PIP AI Temporal Worker status..."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it first:"
    echo "   https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Show app status
echo "🔧 App Status:"
flyctl status --app pip-ai-temporal-workers

echo ""
echo "📈 Machine Status:"
flyctl machine list --app pip-ai-temporal-workers

echo ""
echo "🔍 Recent Logs (last 50 lines):"
flyctl logs --app pip-ai-temporal-workers -n 50 