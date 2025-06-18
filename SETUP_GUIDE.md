# PIP AI - Complete Setup Guide

## Overview
This guide sets up a modern "PIP AI" application with the absolute-latest tech stack as of June 2025.

## Prerequisites Checklist
- [ ] Node.js 20+ installed
- [ ] pnpm installed
- [ ] Git installed and configured
- [ ] GitHub CLI installed and authenticated
- [ ] Pulumi CLI installed
- [ ] Fly CLI installed
- [ ] V0.dev CLI installed

## Step 0: Clean Slate & Prerequisites

### 0.1 Verify Environment
```bash
node --version    # Should be 20+
pnpm --version    # Should be latest
git --version     # Any recent version
gh --version      # GitHub CLI
pulumi version    # Should be 3.177.0+
flyctl version    # Should be latest
v0 --version      # V0.dev CLI
```

### 0.2 Authentication Setup
```bash
# GitHub CLI
gh auth login

# Pulumi (local backend for now)
pulumi login --local

# Fly.io
fly auth login
```

## Step 1: Monorepo Foundation

### 1.1 Create Base Structure
```bash
# If starting fresh, remove existing and recreate
rm -rf /Users/thekiiid/pipai
mkdir -p /Users/thekiiid/pipai
cd /Users/thekiiid/pipai

# Initialize git
git init
```

### 1.2 Setup Turborepo + pnpm
```bash
# Create package.json for monorepo root
# Create pnpm-workspace.yaml
# Create turbo.json
# Create tsconfig.json base
```

### 1.3 Create Workspace Structure
```
pipai/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   └── api/          # Backend API (separate from Next.js)
├── packages/
│   ├── ui/           # shadcn/ui + V0.dev components
│   ├── shared/       # Types, constants, utilities
│   ├── db/           # Prisma schema + migrations
│   └── worker/       # Temporal worker
├── infra/            # Pulumi infrastructure
├── docs/             # Documentation
└── scripts/          # Build/deploy scripts
```

## Step 2: Next.js Frontend (apps/web)

### 2.1 Create Next.js App
```bash
cd apps
npx create-next-app@latest web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

### 2.2 Configure Next.js
- Update next.config.ts for monorepo
- Configure Tailwind for design system
- Set up shadcn/ui integration
- Configure environment variables

## Step 3: UI System (packages/ui)

### 3.1 Setup shadcn/ui
```bash
cd packages/ui
pnpm create @shadcn/ui@latest
```

### 3.2 Design System Integration
- Create design tokens
- Set up V0.dev CLI workflow
- Create component library structure
- Document Figma → V0.dev → shadcn/ui workflow

## Step 4: Database (packages/db)

### 4.1 Setup Prisma
```bash
cd packages/db
pnpm add prisma @prisma/client
pnpm prisma init
```

### 4.2 Schema Design
- User management (integrate with Clerk)
- File storage metadata
- AI workflow tracking
- Vector embeddings references

## Step 5: Shared Packages

### 5.1 Types Package (packages/shared)
- API types
- Database types from Prisma
- Zod schemas for validation
- Constants and enums

### 5.2 Worker Package (packages/worker)
- Temporal workflow definitions
- Activity implementations
- Worker configuration

## Step 6: Infrastructure (infra/)

### 6.1 Pulumi Setup
```bash
cd infra
pulumi new typescript
```

### 6.2 Core Infrastructure
- Vercel project for web app
- AWS S3 for file storage
- Upstash Redis for caching
- Neon Postgres database

### 6.3 Production Infrastructure
- Fly.io for worker deployment
- Cloudflare for CDN
- Monitoring and observability

## Step 7: Environment Configuration

### 7.1 Service Accounts
Manual setup required for:
- Clerk (Authentication)
- Temporal Cloud (Workflows)
- Neon (Database)
- Qdrant Cloud (Vector DB)
- Upstash (Redis/Kafka)
- Helicone (AI Observability)

### 7.2 Environment Variables
Comprehensive .env management for:
- Development
- Staging  
- Production

## Step 8: Development Workflow

### 8.1 Scripts and Automation
- Development server startup
- Database migrations
- Build and deployment
- Testing workflows

### 8.2 CI/CD Pipeline
- GitHub Actions
- Automated testing
- Deployment automation

## Current Status
- ✅ Basic monorepo structure exists
- ✅ Some environment variables configured
- ⚠️  Infrastructure partially set up but needs cleanup
- ❌ Clean, systematic setup needed

## Next Action
Choose approach:
1. **Clean Slate**: Remove everything and start fresh following this guide
2. **Incremental**: Fix and improve existing setup step by step
3. **Hybrid**: Keep good parts, rebuild problematic areas

## Quick Start Command
```bash
# For clean slate approach:
cd /Users/thekiiid && rm -rf pipai && mkdir pipai && cd pipai
# Then follow Step 1.1
```
