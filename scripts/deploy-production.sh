#!/bin/bash

# PIP AI Production Deployment Script
# Deploys both Vercel (API) and Fly.io (Workers) for 24/7 operation

set -e

echo "🚀 Starting PIP AI Production Deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Must be run from the project root directory"
    exit 1
fi

# Set production environment
export NODE_ENV=production
export ENVIRONMENT=production

print_status "Building and deploying to production..."

# 1. Deploy Vercel (Next.js App + API Routes)
print_status "Deploying Next.js app to Vercel..."
npx vercel --prod --confirm

# 2. Restore environment variables to Vercel
print_status "Restoring environment variables to Vercel..."
if [ -f "./restore-vercel-env.sh" ]; then
    ./restore-vercel-env.sh
else
    print_error "restore-vercel-env.sh not found. Environment variables need to be set manually."
fi

# 3. Deploy Fly.io Workers
print_status "Deploying Temporal workers to Fly.io..."
if [ -f "fly.toml" ]; then
    fly deploy --config fly.toml
else
    print_error "fly.toml not found. Cannot deploy workers."
    exit 1
fi

# 4. Verify deployments
print_status "Verifying deployments..."

# Check Vercel deployment
vercel_url=$(npx vercel ls | grep -E '✅|Ready' | head -1 | awk '{print $2}' || echo "")
if [ -n "$vercel_url" ]; then
    print_success "Vercel deployed to: https://$vercel_url"
else
    print_error "Vercel deployment verification failed"
fi

# Check Fly.io deployment
fly_status=$(fly status 2>/dev/null || echo "error")
if [[ "$fly_status" != "error" ]]; then
    print_success "Fly.io workers deployed successfully"
    fly status
else
    print_error "Fly.io deployment verification failed"
fi

print_success "🎉 Production deployment complete!"
print_status "Your 24/7 backend is now running:"
print_status "• Frontend/API: Vercel (serverless, auto-scaling)"
print_status "• Workers: Fly.io (always-on, auto-restart)"
print_status "• Database: Neon (serverless Postgres)"
print_status "• File Storage: AWS S3"
print_status "• Workflows: Temporal Cloud"

echo ""
print_status "📊 To monitor your production systems:"
echo "  - Vercel Dashboard: https://vercel.com/dashboard"
echo "  - Fly.io Dashboard: https://fly.io/dashboard"
echo "  - Temporal Dashboard: https://cloud.temporal.io"
echo ""
print_status "🔧 To check production logs:"
echo "  - Vercel: npx vercel logs"
echo "  - Fly.io: fly logs"
echo "" 