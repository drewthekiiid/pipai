#!/bin/bash

# PIP AI Development Environment Script
# Starts local development while production runs independently

set -e

echo "🛠️ Starting PIP AI Development Environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[DEV]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Set development environment
export NODE_ENV=development
export ENVIRONMENT=development

print_status "Setting up development environment..."

# Check if production is running
print_status "Checking production status..."
vercel_prod=$(npx vercel ls 2>/dev/null | grep "✅" | head -1 || echo "")
if [ -n "$vercel_prod" ]; then
    print_success "✅ Production is running independently on Vercel"
    echo "   Production URL: https://$(echo $vercel_prod | awk '{print $2}')"
else
    print_warning "⚠️  Production status unknown - deploy with ./scripts/deploy-production.sh"
fi

fly_prod=$(fly status 2>/dev/null | grep "started" || echo "")
if [ -n "$fly_prod" ]; then
    print_success "✅ Production workers are running on Fly.io"
    echo "   Worker instances: $(echo "$fly_prod" | wc -l) running"
else
    print_warning "⚠️  Production workers status unknown"
fi

echo ""
print_status "🔧 Starting local development servers..."

# Kill any existing development processes
print_status "Cleaning up existing development processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "pnpm dev" 2>/dev/null || true

# Start development environment
print_status "Installing dependencies..."
pnpm install

print_status "Starting Next.js development server..."
print_status "📱 Frontend will be available at: http://localhost:3000"
print_status "🔗 API endpoints will be available at: http://localhost:3000/api/*"

echo ""
print_success "🎯 Development vs Production Setup:"
echo "   📱 DEVELOPMENT (Local):"
echo "      - Frontend: http://localhost:3000"
echo "      - API: http://localhost:3000/api/*"
echo "      - Database: Local PostgreSQL or Neon"
echo "      - Workers: Local or Temporal Cloud"
echo ""
echo "   🚀 PRODUCTION (24/7 Cloud):"
echo "      - Frontend: Vercel (auto-scaling serverless)"
echo "      - API: Vercel (auto-scaling serverless)"
echo "      - Database: Neon Serverless PostgreSQL"
echo "      - Workers: Fly.io (always-on, auto-restart)"
echo ""

print_status "Starting development server now..."
print_status "Press Ctrl+C to stop development (production will keep running)"

# Start the development server
cd apps/web && pnpm dev 