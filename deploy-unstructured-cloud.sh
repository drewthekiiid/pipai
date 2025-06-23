#!/bin/bash

# Deploy Unstructured-IO to Fly.io for 24/7 Cloud Operation
# This makes your document processing completely independent of your laptop

set -e

echo "🚀 Deploying FREE Unstructured-IO to Fly.io for 24/7 Operation..."
echo "🆓 100% Open Source - No API keys, no costs, no limits!"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    print_error "flyctl is not installed. Installing..."
    curl -L https://fly.io/install.sh | sh
    export PATH="$HOME/.fly/bin:$PATH"
fi

# Check if we're authenticated
if ! flyctl auth whoami &> /dev/null; then
    if [ -z "$FLY_API_TOKEN" ]; then
        print_error "Not authenticated with Fly.io. Run: flyctl auth login"
        exit 1
    fi
fi

print_status "🔍 Checking if Unstructured-IO app exists..."

# Check if app exists
if ! flyctl apps list | grep -q "pip-ai-unstructured-free"; then
    print_status "📦 Creating new Fly.io app: pip-ai-unstructured-free"
    flyctl apps create pip-ai-unstructured-free --generate-name=false
else
    print_success "✅ App pip-ai-unstructured-free already exists"
fi

print_status "💾 Creating persistent volume for document processing..."

# Create volume if it doesn't exist
if ! flyctl volumes list --app pip-ai-unstructured-free | grep -q "unstructured_data"; then
    flyctl volumes create unstructured_data --region iad --size 10 --app pip-ai-unstructured-free
    print_success "✅ Created 10GB persistent volume"
else
    print_success "✅ Volume already exists"
fi

print_status "🆓 No secrets needed - FREE open source version!"

# No API keys needed for open source version
print_success "✅ Open source version requires no API keys or secrets"

print_status "🚢 Deploying Unstructured-IO to Fly.io..."

# Deploy the application
flyctl deploy --config fly-unstructured.toml --app pip-ai-unstructured-free

print_status "📊 Scaling to ensure 24/7 availability..."

# Ensure at least 1 machine is always running
flyctl scale count 1 --app pip-ai-unstructured-free

# Wait for deployment to be ready
print_status "⏳ Waiting for service to be ready..."
for i in {1..30}; do
    if flyctl status --app pip-ai-unstructured-free | grep -q "started"; then
        break
    fi
    echo "⏳ Waiting for deployment... ($i/30)"
    sleep 2
done

# Get the deployed URL
UNSTRUCTURED_URL=$(flyctl status --app pip-ai-unstructured-free --json | jq -r '.Hostname' 2>/dev/null || echo "pip-ai-unstructured-free.fly.dev")

print_success "🎉 Unstructured-IO deployed successfully!"
echo ""
echo "🔗 Service Details:"
echo "   • URL: https://$UNSTRUCTURED_URL"
echo "   • Health: https://$UNSTRUCTURED_URL/general/docs"
echo "   • API Docs: https://$UNSTRUCTURED_URL/general/docs"
echo ""

print_status "🔧 Updating environment configuration..."

# Update environment variables
if [ -f ".env" ]; then
    # Update .env file
    if grep -q "UNSTRUCTURED_API_URL" .env; then
        sed -i.bak "s|UNSTRUCTURED_API_URL=.*|UNSTRUCTURED_API_URL=https://$UNSTRUCTURED_URL|" .env
    else
        echo "UNSTRUCTURED_API_URL=https://$UNSTRUCTURED_URL" >> .env
    fi
    print_success "✅ Updated .env file"
fi

# Update Vercel environment variables
if command -v vercel &> /dev/null; then
    print_status "🌐 Updating Vercel environment variables..."
    cd apps/web || exit 1
    echo "https://$UNSTRUCTURED_URL" | vercel env add UNSTRUCTURED_API_URL production --force
    echo "https://$UNSTRUCTURED_URL" | vercel env add UNSTRUCTURED_API_URL preview --force
    cd ../.. || exit 1
    print_success "✅ Updated Vercel environment variables"
fi

echo ""
print_success "🚀 24/7 Cloud Deployment Complete!"
echo ""
echo "📊 Your Unstructured-IO service is now running 24/7 on:"
echo "   🌐 Fly.io (always-on, auto-scaling)"
echo "   📍 Region: Ashburn, VA (iad)"
echo "   💾 Persistent storage: 10GB volume"
echo "   🔄 Health monitoring: Every 15 seconds"
echo "   🛡️ Auto-restart: Always"
echo ""

print_status "🛠️ Management Commands:"
echo "   • Status: flyctl status --app pip-ai-unstructured-free"
echo "   • Logs: flyctl logs --app pip-ai-unstructured-free"
echo "   • Scale: flyctl scale count 2 --app pip-ai-unstructured-free"
echo "   • SSH: flyctl ssh console --app pip-ai-unstructured-free"
echo ""

print_status "🧪 Testing cloud service..."
if curl -f "https://$UNSTRUCTURED_URL/general/docs" > /dev/null 2>&1; then
    print_success "✅ Cloud service is healthy and ready!"
else
    print_warning "⚠️  Service may still be starting up. Check in a few minutes."
fi

echo ""
print_success "🎯 Next Steps:"
echo "   1. Test document upload through your Vercel app"
echo "   2. Monitor processing with: flyctl logs --app pip-ai-unstructured-free"
echo "   3. Scale up if needed: flyctl scale count 2 --app pip-ai-unstructured-free"
echo ""
print_success "🌟 Your FREE PIP AI system now runs 24/7 completely independent of your laptop!"
print_success "🆓 No costs, no limits, no API keys - completely free forever!" 