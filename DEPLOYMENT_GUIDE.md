# PIP AI Deployment Guide

This guide explains how to set up automatic deployment to Vercel with GitHub Actions.

## 🚀 **Automatic Deployment Overview**

Every push to the `main` branch will automatically:
1. ✅ Build and test the application
2. ✅ Deploy to Vercel production
3. ✅ Update the live application instantly
4. ✅ Provide deployment status in GitHub

## 📋 **Prerequisites**

- [x] GitHub repository: `https://github.com/drewthekiiid/pipai`
- [x] Vercel account: [vercel.com](https://vercel.com)
- [x] Environment variables configured in `.env.local`

## 🛠️ **Setup Instructions**

### **Step 1: Configure Local Environment**

```bash
# 1. Make sure you have .env.local with all required variables
cp env.template .env.local
# Edit .env.local with your actual API keys and credentials

# 2. Install Vercel CLI (if not already installed)
npm install -g vercel@latest

# 3. Login to Vercel
vercel login
```

### **Step 2: Run Automated Vercel Setup**

```bash
# Run the automated setup script
./scripts/setup-vercel.sh
```

This script will:
- ✅ Create Vercel project
- ✅ Configure all environment variables
- ✅ Provide GitHub secrets to add
- ✅ Display project information

### **Step 3: Configure GitHub Secrets**

Go to your repository secrets page:
https://github.com/drewthekiiid/pipai/settings/secrets/actions

Add these **Repository Secrets**:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `VERCEL_TOKEN` | `your-vercel-token` | From Vercel account settings |
| `VERCEL_PROJECT_ID` | `your-project-id` | From setup script output |
| `VERCEL_ORG_ID` | `your-org-id` | From setup script output |

### **Step 4: Configure Application Environment Variables**

The following variables should already be configured in Vercel (from the setup script):

#### **Core Services**
- `OPENAI_API_KEY` - GPT-4o API access
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - S3 storage
- `AWS_REGION` / `S3_BUCKET_NAME` - AWS configuration
- `TEMPORAL_NAMESPACE` / `TEMPORAL_API_KEY` - Workflow orchestration
- `REDIS_URL` / `REDIS_TOKEN` - Caching and sessions

#### **Application URLs**
- `NEXT_PUBLIC_APP_URL` - Frontend URL (https://pipai.vercel.app)
- `NEXT_PUBLIC_API_URL` - API URL (https://pipai.vercel.app/api)

### **Step 5: Test Deployment**

```bash
# Commit and push to trigger deployment
git add .
git commit -m "🚀 Setup Vercel auto-deployment"
git push origin main
```

## 📊 **Deployment Workflow**

### **Automatic Triggers**
- ✅ **Push to main** → Production deployment
- ✅ **Pull request** → Preview deployment with comment

### **Build Process**
1. **Install Dependencies** - `pnpm install --frozen-lockfile`
2. **Build Packages** - Build shared packages and UI components
3. **Vercel Build** - Build Next.js application with all environment variables
4. **Deploy** - Deploy to production with zero downtime

### **Monitoring**
- 📊 **GitHub Actions**: Monitor build status
- 🌐 **Vercel Dashboard**: Monitor deployments and analytics
- 📧 **Notifications**: Get notified on deployment success/failure

## 🌐 **Production URLs**

### **Primary Application**
- **Frontend**: https://pipai.vercel.app
- **API**: https://pipai.vercel.app/api/upload
- **Health Check**: https://pipai.vercel.app/api/upload

### **Development URLs**
- **Local Frontend**: http://localhost:3000
- **Local API**: http://localhost:3000/api/upload

## 🔧 **Advanced Configuration**

### **Custom Domain Setup**
1. Go to Vercel project settings
2. Add your custom domain
3. Configure DNS records
4. Update `NEXT_PUBLIC_APP_URL` environment variable

### **Preview Deployments**
- Every pull request gets a unique preview URL
- Test changes before merging to main
- Automatic cleanup after PR merge/close

### **Environment-Specific Variables**
- **Production**: Live application variables
- **Preview**: Branch-specific variables for testing
- **Development**: Local development variables

## 🚨 **Troubleshooting**

### **Deployment Failures**

**Issue**: Build fails with missing environment variables
```bash
# Solution: Check Vercel environment variables
vercel env ls
```

**Issue**: GitHub Actions deployment fails
```bash
# Solution: Verify GitHub secrets are set correctly
# Check: VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_ORG_ID
```

### **Runtime Issues**

**Issue**: API endpoints return 500 errors
```bash
# Solution: Check production logs
vercel logs --follow
```

**Issue**: Missing Temporal/Redis connectivity
```bash
# Solution: Verify all service credentials in Vercel environment
```

### **Performance Issues**

**Issue**: Slow API responses
```bash
# Solution: Check Vercel function logs and metrics
# Consider upgrading to Pro plan for better performance
```

## 📝 **Manual Deployment**

If needed, you can deploy manually:

```bash
# Navigate to web app
cd apps/web

# Deploy to production
vercel --prod

# Deploy preview
vercel
```

## 🎯 **Next Steps**

After successful deployment:

1. ✅ **Test Production**: Verify all features work at https://pipai.vercel.app
2. ✅ **Configure Monitoring**: Set up error tracking and analytics
3. ✅ **Set Up Alerts**: Configure deployment notifications
4. ✅ **Performance Optimization**: Monitor and optimize based on usage

## 🔗 **Useful Links**

- **Live Application**: https://pipai.vercel.app
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repository**: https://github.com/drewthekiiid/pipai
- **GitHub Actions**: https://github.com/drewthekiiid/pipai/actions
- **Deployment Logs**: Available in Vercel dashboard

---

## 🎉 **Congratulations!**

Your PIP AI application now has:
- 🚀 **Automatic deployment** on every push
- 🔄 **Zero-downtime updates**
- 📊 **Built-in monitoring and logs**
- 🌐 **Global CDN distribution**
- 🔒 **Production-ready security**

Simply push to main branch and your changes go live instantly! 🎯 