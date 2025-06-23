# 🌐🚁 PIP AI Hybrid Cloud Architecture

## Overview

Your PIP AI system uses a **hybrid cloud architecture** that combines the best of both platforms:

- **🌐 Vercel**: Frontend (Next.js app)
- **🚁 Fly.io**: Backend (Workers + FREE Unstructured-IO)

## 🏗️ Architecture Diagram

```
┌─────────────────┐    ┌───────────────────┐
│ 🌐 VERCEL       │───▶│ 🚁 FLY.IO         │
│ • Next.js App   │    │ • Temporal Workers│
│ • API Routes    │    │ • Unstructured-IO │
│ • Serverless    │    │ • Always-On       │
│ • Auto-Scale    │    │ • Auto-Restart    │
└─────────────────┘    └───────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌───────────────────┐
│ 📊 TEMPORAL     │    │ 📁 AWS S3         │
│ • Cloud         │    │ • File Storage    │
│ • Workflows     │    │ • Documents       │
└─────────────────┘    └───────────────────┘
```

## 🎯 Why This Architecture?

### Vercel (Frontend) ✅

- **Perfect for**: Next.js, React, serverless functions
- **Benefits**: Instant global deployment, auto-scaling, CDN
- **Cost**: Free tier for most projects
- **Best at**: Frontend hosting and edge functions

### Fly.io (Backend) ✅

- **Perfect for**: Always-on services, background workers
- **Benefits**: 24/7 availability, persistent storage, low latency
- **Cost**: ~$1-3/month for small always-on services
- **Best at**: Backend services that need to stay running

## 📦 What Runs Where

### 🌐 Vercel

- `apps/web/` - Next.js frontend application
- API routes (`/api/*`)
- Static asset hosting
- Edge functions

### 🚁 Fly.io

- `packages/worker/` - Temporal workers
- Unstructured-IO document processing (FREE!)
- Background job processing
- Always-on services

### ☁️ External Services

- **Temporal Cloud**: Workflow orchestration
- **AWS S3**: File storage
- **GitHub**: Code repository and CI/CD

## 🚀 Deployment

### Single Command Deploy

```bash
./deploy-hybrid-cloud.sh
```

### Step-by-Step Deploy

```bash
# 1. Deploy frontend to Vercel
cd apps/web
vercel --prod

# 2. Deploy backend to Fly.io
cd ../..
flyctl deploy                    # Workers
./deploy-unstructured-cloud.sh   # FREE Unstructured-IO
```

## 💰 Cost Breakdown

| Service                 | Provider       | Cost            | Purpose                       |
| ----------------------- | -------------- | --------------- | ----------------------------- |
| **Frontend**            | Vercel         | Free            | Next.js app, API routes       |
| **Workers**             | Fly.io         | ~$1-3/mo        | Temporal workers              |
| **Document Processing** | Fly.io         | **FREE**        | Unstructured-IO (open source) |
| **Workflows**           | Temporal Cloud | Free tier       | Orchestration                 |
| **Storage**             | AWS S3         | ~$1-5/mo        | File storage                  |
| **Total**               |                | **~$2-8/month** | Full production system        |

## 🔧 Management

### Frontend (Vercel)

```bash
# Deploy
vercel --prod

# Logs
vercel logs

# Environment variables
vercel env add KEY value production
```

### Backend (Fly.io)

```bash
# Deploy workers
flyctl deploy

# Deploy document processing
./deploy-unstructured-cloud.sh

# Logs
flyctl logs

# Scale
flyctl scale count 2
```

## 🌍 Service URLs

- **Frontend**: `https://your-app.vercel.app`
- **Backend Workers**: `https://pip-ai-workers.fly.dev`
- **Document Processing**: `https://pip-ai-unstructured-free.fly.dev`
- **Workflows**: `https://cloud.temporal.io`

## ✅ Benefits of This Setup

1. **🚀 Performance**: Frontend on edge, backend close to users
2. **💰 Cost-Effective**: Each service runs on the optimal platform
3. **🔄 Reliability**: Auto-scaling frontend + always-on backend
4. **🛠️ Developer Experience**: Easy deploys, great tooling
5. **📈 Scalable**: Can handle growth without architecture changes
6. **🆓 Document Processing**: Completely free with no limits

## 🧪 Testing Your Setup

### Test Frontend

```bash
curl https://your-app.vercel.app/api/health
```

### Test Backend Workers

```bash
curl https://pip-ai-workers.fly.dev/health
```

### Test Document Processing

```bash
curl https://pip-ai-unstructured-free.fly.dev/general/docs
```

## 🔄 Development Workflow

1. **Local Development**: Everything runs locally
2. **Testing**: Deploy to preview environments
3. **Production**: Single command hybrid deploy
4. **Monitoring**: Separate dashboards for each platform

---

**🎉 You now have the best of both worlds: Vercel's excellent frontend hosting + Fly.io's reliable backend services + FREE document processing!**
