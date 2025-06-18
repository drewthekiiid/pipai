# 🔐 GitHub Secrets Setup Guide

This guide will help you configure all the necessary secrets for your CI/CD pipeline to work with **Vercel auto-deployments** and **Pulumi infrastructure management**.

## 📋 Required Secrets

### 🔑 AWS Secrets (for Pulumi Infrastructure)
```
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key  
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-construction-docs-bucket
```

### 🌐 Vercel Secrets (for Frontend Deployment)
```
VERCEL_API_TOKEN=your_vercel_api_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

### 🏗️ Pulumi Secrets (for Infrastructure as Code)
```
PULUMI_ACCESS_TOKEN=your_pulumi_access_token
```

### 🤖 OpenAI Secrets (for Construction AI)
```
OPENAI_API_KEY=your_openai_api_key
```

### 🗄️ Upstash Redis Secrets (for Caching)
```
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

### ⏰ Temporal Secrets (for Workflow Management)
```
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_API_KEY=your_temporal_api_key
TEMPORAL_TASK_QUEUE=pip-ai-task-queue
```

---

## 📖 How to Set Up Each Secret

### 1. 🔑 AWS Secrets

**Get your AWS credentials:**
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Create a new user with programmatic access
3. Attach policies: `S3FullAccess`, `CloudFormationFullAccess`
4. Copy your Access Key ID and Secret Access Key
5. Create an S3 bucket for document storage

### 2. 🌐 Vercel Secrets

**Get your Vercel credentials:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Go to Settings → Tokens → Create new token
3. Copy your API token
4. Get your Org ID from Settings → General
5. Get your Project ID from your project settings

### 3. 🏗️ Pulumi Secrets

**Get your Pulumi token:**
1. Go to [Pulumi Console](https://app.pulumi.com/)
2. Go to Settings → Access Tokens
3. Create new access token
4. Copy the token

### 4. 🤖 OpenAI Secrets

**Get your OpenAI API key:**
1. Go to [OpenAI API Dashboard](https://platform.openai.com/api-keys)
2. Create new secret key
3. Copy the key (starts with `sk-`)

### 5. 🗄️ Upstash Redis Secrets

**Get your Upstash credentials:**
1. Go to [Upstash Console](https://console.upstash.com/)
2. Create new Redis database
3. Copy the REST URL and token

### 6. ⏰ Temporal Secrets

**For local development:**
- Use `localhost:7233` for address
- Use `default` for namespace
- API key only needed for Temporal Cloud

---

## 🚀 Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the exact name and value

### Repository Secrets to Create:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET_NAME`
- `VERCEL_API_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `PULUMI_ACCESS_TOKEN`
- `OPENAI_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `TEMPORAL_ADDRESS`
- `TEMPORAL_NAMESPACE`
- `TEMPORAL_API_KEY`
- `TEMPORAL_TASK_QUEUE`

---

## 🔄 Workflow Triggers

### Automatic Triggers:
- **🔍 CI Checks**: Run on every push and PR
- **🚀 Preview Deployments**: Auto-deploy preview URLs for PRs
- **🏗️ Infrastructure**: Deploy to preview stacks for PRs

### Manual Triggers:
- **🌐 Production Release**: Create a git tag (`v1.0.0`) to deploy to production
- **⚙️ Manual Deploy**: Use GitHub Actions "Run workflow" button

---

## 🎯 What You Get

### For Every Push:
✅ **Automated linting** with `pnpm run lint`  
✅ **Type checking** with `pnpm run type-check`  
✅ **Testing** with `pnpm run test`  
✅ **Build verification** with `pnpm run build`

### For Every PR:
✅ **Preview deployment** with unique URL  
✅ **Infrastructure preview** with isolated resources  
✅ **Automatic PR comments** with deployment links  
✅ **Construction demo** ready for testing

### For Production Releases:
✅ **Production deployment** to Vercel  
✅ **Infrastructure deployment** with Pulumi  
✅ **GitHub releases** with changelog  
✅ **Shareable production links**

---

## 🚧 Test Your Setup

1. **Create a test PR** to trigger preview deployment
2. **Push a git tag** like `v1.0.0` to trigger production release
3. **Check GitHub Actions** tab for workflow status
4. **Test your construction demo** at the deployed URLs

---

## 🛟 Troubleshooting

### Common Issues:
- **Missing secrets**: Check that all required secrets are set in GitHub
- **AWS permissions**: Ensure your AWS user has S3 and CloudFormation access
- **Vercel project**: Make sure your Vercel project exists and IDs are correct
- **OpenAI quota**: Verify your OpenAI account has sufficient credits

### Debug Steps:
1. Check GitHub Actions logs for detailed error messages
2. Verify all secrets are set correctly (no extra spaces)
3. Test credentials locally first
4. Check service quotas and limits

---

**🎉 Ready to deploy your construction analysis demo to the world!** 