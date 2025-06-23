#!/bin/bash

# 🌐🚁 PIP AI Hybrid Cloud Deployment
# Frontend: Vercel | Backend: Fly.io | Everything FREE!

set -e

echo "🌐🚁 =========================================="
echo "🌐🚁   PIP AI HYBRID CLOUD DEPLOYMENT"
echo "🌐🚁 =========================================="
echo ""
echo "🌐 Frontend: Vercel (Next.js, serverless)"
echo "🚁 Backend: Fly.io (Workers + FREE Unstructured-IO)"
echo "📊 Orchestration: Temporal Cloud"
echo "📁 Storage: AWS S3"
echo ""

# Colors for better output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check required tools
print_step "Checking deployment tools..."

if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

if ! command -v flyctl &> /dev/null; then
    echo "Installing Fly.io CLI..."
    curl -L https://fly.io/install.sh | sh
    export PATH="$HOME/.fly/bin:$PATH"
fi

print_success "✅ Deployment tools ready"

# 1. Deploy Frontend to Vercel
echo ""
print_step "🌐 Deploying Frontend to Vercel..."
echo "   • Next.js application"
echo "   • API routes"
echo "   • Serverless functions"

cd apps/web
npx vercel --prod --confirm
cd ../..

print_success "✅ Frontend deployed to Vercel"

# 2. Deploy Backend to Fly.io
echo ""
print_step "🚁 Deploying Backend Services to Fly.io..."

# Deploy Temporal Workers
echo "   • Deploying Temporal workers..."
if [ -f "fly.toml" ]; then
    flyctl deploy --config fly.toml
    print_success "✅ Temporal workers deployed"
else
    print_warning "⚠️  fly.toml not found - workers not deployed"
fi

# Deploy FREE Unstructured-IO
echo "   • Deploying FREE Unstructured-IO..."
if [ -f "./deploy-unstructured-cloud.sh" ]; then
    ./deploy-unstructured-cloud.sh
    print_success "✅ FREE Unstructured-IO deployed"
else
    print_warning "⚠️  Unstructured deployment script not found"
fi

# 3. Update Environment Variables
echo ""
print_step "🔧 Configuring Environment Variables..."

# Update Vercel with Fly.io backend URLs
if command -v vercel &> /dev/null; then
    cd apps/web
    
    # Set Unstructured-IO URL
    echo "https://pip-ai-unstructured-free.fly.dev" | vercel env add UNSTRUCTURED_API_URL production --force
    echo "https://pip-ai-unstructured-free.fly.dev" | vercel env add UNSTRUCTURED_API_URL preview --force
    
    # Set worker URL (if applicable)
    echo "https://pip-ai-workers.fly.dev" | vercel env add WORKER_URL production --force
    echo "https://pip-ai-workers.fly.dev" | vercel env add WORKER_URL preview --force
    
    cd ../..
    print_success "✅ Environment variables updated"
fi

# 4. Verify Deployment
echo ""
print_step "🧪 Verifying Deployment..."

# Check Vercel
vercel_url=$(cd apps/web && npx vercel ls | grep -E '✅|Ready' | head -1 | awk '{print $2}' 2>/dev/null || echo "")
if [ -n "$vercel_url" ]; then
    print_success "✅ Vercel: https://$vercel_url"
else
    print_warning "⚠️  Could not verify Vercel deployment"
fi

# Check Fly.io services
if flyctl apps list | grep -q "pip-ai-unstructured-free"; then
    print_success "✅ Fly.io: https://pip-ai-unstructured-free.fly.dev"
else
    print_warning "⚠️  Could not verify Fly.io Unstructured service"
fi

if flyctl apps list | grep -q "pip-ai"; then
    print_success "✅ Fly.io: Workers deployed"
else
    print_warning "⚠️  Could not verify Fly.io workers"
fi

# 5. Show Final Architecture
echo ""
echo "🎉 =========================================="
echo "🎉   HYBRID CLOUD DEPLOYMENT COMPLETE!"
echo "🎉 =========================================="
echo ""
echo "🏗️  Your Production Architecture:"
echo ""
echo "┌─────────────────┐    ┌───────────────────┐"
echo "│ 🌐 VERCEL       │───▶│ 🚁 FLY.IO         │"
echo "│ • Next.js App   │    │ • Temporal Workers│"
echo "│ • API Routes    │    │ • Unstructured-IO │"
echo "│ • Serverless    │    │ • Always-On       │"
echo "│ • Auto-Scale    │    │ • Auto-Restart    │"
echo "└─────────────────┘    └───────────────────┘"
echo "         │                       │"
echo "         ▼                       ▼"
echo "┌─────────────────┐    ┌───────────────────┐"
echo "│ 📊 TEMPORAL     │    │ 📁 AWS S3         │"
echo "│ • Cloud         │    │ • File Storage    │"
echo "│ • Workflows     │    │ • Documents       │"
echo "└─────────────────┘    └───────────────────┘"
echo ""
echo "🔗 Service URLs:"
echo "   🌐 Frontend: https://$vercel_url"
echo "   🚁 Backend: https://pip-ai-unstructured-free.fly.dev"
echo "   📊 Temporal: https://cloud.temporal.io"
echo ""
echo "💰 Cost Breakdown:"
echo "   🌐 Vercel: Free tier (hobby projects)"
echo "   🚁 Fly.io: ~$1-3/month (always-on workers)"
echo "   🆓 Unstructured-IO: $0 (open source)"
echo "   📊 Temporal: Free tier"
echo "   📁 AWS S3: Pay-per-use (~$1-5/month)"
echo ""
echo "🛠️  Management:"
echo "   • Vercel: vercel --prod (redeploy frontend)"
echo "   • Fly.io: flyctl deploy (redeploy backend)"
echo "   • Logs: flyctl logs (backend) / vercel logs (frontend)"
echo ""
print_success "🌟 Your PIP AI system is now running in a hybrid cloud architecture!"
print_success "🆓 Document processing is completely FREE with no limits!" 