#!/bin/bash

echo "🛑 Stopping PIP AI Unified Development Environment..."

# Kill processes on port 3000
echo "   🔍 Killing processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "   ✅ Port 3000 already free"

# Kill any Next.js processes
echo "   🔍 Killing Next.js processes..."
pkill -f "next" 2>/dev/null || echo "   ✅ No Next.js processes found"

echo "🏁 Unified development environment stopped" 