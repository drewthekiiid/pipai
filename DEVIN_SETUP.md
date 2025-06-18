# Devin Environment Setup Instructions

## 🤖 Setting Up PIP AI for Devin

### Quick Setup Commands:

1. **First, pull the latest code:**
   ```bash
   cd ~/repos/pipai && git pull origin main && pnpm install
   ```

2. **Create the environment file:**
   ```bash
   cp env.template .env.local
   ```

3. **Edit the environment variables:**
   You need to populate `.env.local` with the actual API keys. Here are the key variables needed:

   ```bash
   # Core API Keys
   OPENAI_API_KEY=sk-proj-[your-key-here]
   
   # AWS Configuration
   AWS_ACCESS_KEY_ID=[your-aws-key]
   AWS_SECRET_ACCESS_KEY=[your-aws-secret]
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=pip-ai-storage-qo56jg9l
   
   # Temporal Cloud
   TEMPORAL_API_KEY=[your-temporal-key]
   TEMPORAL_ADDRESS=us-east-1.aws.api.temporal.io:7233
   TEMPORAL_NAMESPACE=pip-ai.ts7wf
   TEMPORAL_TASK_QUEUE=pip-ai-task-queue
   
   # Upstash Redis
   UPSTASH_REDIS_REST_URL=https://assured-mantis-44046.upstash.io
   UPSTASH_REDIS_REST_TOKEN=[your-redis-token]
   
   # Database
   DATABASE_URL=postgresql://[your-database-url]
   ```

4. **Copy to web directory:**
   ```bash
   cp .env.local apps/web/.env.local
   ```

5. **Reload direnv:**
   ```bash
   direnv allow && direnv reload
   ```

6. **Start development:**
   ```bash
   pnpm dev
   ```

### 🔗 Important URLs:
- **Local Dev**: http://localhost:3000
- **Live App**: https://pipai.vercel.app
- **GitHub**: https://github.com/drewthekiiid/pipai
- **Vercel Dashboard**: https://vercel.com/drewthekiiid/pipai

### 📁 Project Structure:
```
~/repos/pipai/
├── apps/web/          # Next.js frontend
├── packages/worker/   # Temporal worker
├── packages/shared/   # Shared utilities
├── packages/ui/       # UI components
├── infra/            # Pulumi infrastructure
└── scripts/          # Automation scripts
```

### 🎯 Available Commands:
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm test` - Run tests
- `vercel --prod` - Deploy to production

The project is already fully deployed and working - you just need to set up the local environment!
