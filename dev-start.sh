#!/bin/bash

# =============================================================================
# PIP AI Unified Development Environment Starter
# =============================================================================
# This script starts the unified Next.js development environment
# =============================================================================

echo "🏗️ Starting PIP AI Unified Development Environment..."

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development server..."
    if [ ! -z "$NEXT_PID" ] && ps -p $NEXT_PID > /dev/null; then
        kill $NEXT_PID 2>/dev/null || true
        echo "   ✅ Next.js stopped"
    fi
    # Kill any remaining processes on port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    echo "🏁 Development environment stopped"
    exit 0
}

# Setup cleanup trap
trap cleanup SIGINT SIGTERM EXIT

# Check if port 3000 is in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "🔍 Checking port 3000..."
    echo "⚠️  Port 3000 is in use. Stopping existing processes..."
    # Kill any processes using port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "🚀 Starting unified Next.js app on port 3000..."

# Change to web app directory
cd apps/web || {
    echo "❌ Failed to change to apps/web directory"
    exit 1
}

# Build shared packages first
echo "📦 Building shared packages..."
cd ../../packages/shared && pnpm run build
cd ../ui && pnpm run build
cd ../../apps/web

echo "⏳ Waiting for Next.js to start..."

# Start Next.js with regular compiler (not Turbopack) for stability
npx next dev --port 3000 &
NEXT_PID=$!

# Wait for Next.js to start
sleep 8

# Check if Next.js is running and test endpoints
if ps -p $NEXT_PID > /dev/null; then
    # Test frontend
    if curl -s -I http://localhost:3000 | grep -q "200 OK"; then
        echo "   ✅ Frontend running on http://localhost:3000"
    else
        echo "   ⚠️  Frontend may still be starting..."
    fi
    
    # Test the API endpoint
    if curl -s http://localhost:3000/api/upload/presigned-url > /dev/null; then
        echo "   ✅ Unified API running on http://localhost:3000/api/upload/presigned-url"
    else
        echo "   ⚠️  API may still be starting..."
    fi
    
    echo ""
    echo "🎉 Unified development environment ready!"
    echo "📊 Services:"
    echo "   🌐 Frontend: http://localhost:3000"
    echo "   🔧 API:      http://localhost:3000/api/upload/presigned-url"
    echo "   📊 Chat:     http://localhost:3000/api/chat"
    echo ""
    echo "💡 Press Ctrl+C to stop the development server"
    echo "📝 Monitoring Next.js... (Ctrl+C to stop)"
    
    # Keep the script running and monitor the Next.js process
    while true; do
        if ! ps -p $NEXT_PID > /dev/null; then
            echo "❌ Next.js process died unexpectedly"
            break
        fi
        sleep 5
    done
else
    echo "❌ Failed to start Next.js"
    exit 1
fi 