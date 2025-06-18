#!/bin/bash

# PIP AI Unified Development Server Script
# Starts the unified Next.js app (frontend + API) on port 3000

set -e

echo "🏗️ Starting PIP AI Unified Development Environment..."

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development server..."
    
    # Kill background processes
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo "   ✅ Next.js stopped"
    fi
    
    # Kill any remaining processes on port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    echo "🏁 Development environment stopped"
    exit 0
}

# Setup cleanup trap
trap cleanup SIGINT SIGTERM EXIT

# Check if port is available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port $1 is already in use. Please free it and try again."
        exit 1
    fi
}

echo "🔍 Checking port 3000..."
check_port 3000

# Start Next.js (unified frontend + API)
echo "🚀 Starting unified Next.js app on port 3000..."
cd apps/web
npm run dev -- --port 3000 &
FRONTEND_PID=$!
cd ../..

# Wait for frontend to start
echo "⏳ Waiting for Next.js to start..."
sleep 8

# Test frontend/API
if curl -s http://localhost:3000 > /dev/null; then
    echo "   ✅ Frontend running on http://localhost:3000"
else
    echo "   ⚠️  Frontend may still be starting..."
fi

# Test API health
if curl -s http://localhost:3000/api/upload > /dev/null; then
    echo "   ✅ Unified API running on http://localhost:3000/api"
else
    echo "   ⚠️  API may still be starting..."
fi

echo ""
echo "🎉 Unified development environment ready!"
echo ""
echo "📊 Services:"
echo "   🌐 Frontend: http://localhost:3000"
echo "   🔧 API:      http://localhost:3000/api/upload"
echo "   📊 Health:   http://localhost:3000/api/upload (GET)"
echo ""
echo "💡 Press Ctrl+C to stop the development server"
echo ""

# Keep script running and show logs
echo "📝 Monitoring Next.js... (Ctrl+C to stop)"
while true; do
    sleep 5
    
    # Check if process is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Next.js process died"
        break
    fi
done 