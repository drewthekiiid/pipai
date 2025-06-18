# 🚀 Automated GitHub Secrets Setup

Instead of manually setting 15+ GitHub secrets, use these scripts to **automatically upload all your environment variables** to GitHub in one command!

## 📋 Prerequisites

1. **Install GitHub CLI:**
   ```bash
   brew install gh
   ```

2. **Authenticate with GitHub:**
   ```bash
   gh auth login
   ```

3. **Create your environment file:**
   ```bash
   cp env.example .env
   # Then edit .env with your actual values
   ```

## 🔧 Usage

### Option 1: Bash Script (Recommended)
```bash
./scripts/setup-github-secrets.sh
```

### Option 2: Node.js Script  
```bash
node scripts/setup-github-secrets.js
```

### Use Custom Env File
```bash
./scripts/setup-github-secrets.sh .env.production
node scripts/setup-github-secrets.js .env.staging
```

## 📊 What It Does

The script will:

1. ✅ **Validate** GitHub CLI is installed and authenticated
2. ✅ **Read** your .env file automatically  
3. ✅ **Upload** all 15 required secrets to GitHub
4. ✅ **Mask** sensitive values in output (shows `sk-1***` format)
5. ✅ **Report** success/failure for each secret
6. ✅ **Provide** next steps and verification links

## 🔐 Secrets That Get Set

### AWS (Infrastructure)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET_NAME`

### Vercel (Frontend)
- `VERCEL_API_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Services
- `PULUMI_ACCESS_TOKEN`
- `OPENAI_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Temporal (Workflows)
- `TEMPORAL_ADDRESS`
- `TEMPORAL_NAMESPACE`
- `TEMPORAL_API_KEY`
- `TEMPORAL_TASK_QUEUE`

## 📝 Example Output

```bash
🚀 PIP AI - Automated GitHub Secrets Setup
==================================================
✅ Found environment file: .env
📖 Loading environment variables...
📂 Repository: username/pipai
🔐 Setting GitHub repository secrets...

  ✅ AWS_ACCESS_KEY_ID - SET (AKIA***)
  ✅ AWS_SECRET_ACCESS_KEY - SET (wJal***)
  ✅ AWS_REGION - SET (us-e***)
  ✅ VERCEL_API_TOKEN - SET (vZyX***)
  ✅ OPENAI_API_KEY - SET (sk-1***)
  ⏭️  TEMPORAL_API_KEY - SKIPPED (not found in env file)

==================================================
📊 Summary:
  ✅ Secrets set: 12
  ⏭️  Secrets skipped: 3  
  ❌ Secrets failed: 0

🎉 All available secrets have been set successfully!

📋 Next steps:
1. Verify secrets in GitHub: https://github.com/username/pipai/settings/secrets/actions
2. Create a test PR to trigger preview deployment
3. Push a git tag (v1.0.0) for production release

🚀 Your CI/CD pipeline is ready to go!
```

## 🛟 Troubleshooting

### "gh: command not found"
Install GitHub CLI:
```bash
brew install gh
```

### "Not authenticated with GitHub"
Login to GitHub:
```bash
gh auth login
```

### "Environment file not found"
Make sure you have a `.env` file:
```bash
cp env.example .env
# Edit .env with your actual values
```

### "Some secrets failed to set"
- Check your GitHub repository permissions
- Verify you're authenticated: `gh auth status`
- Try manually: `gh secret set TEST_SECRET --body "test"`

## 🔒 Security

- Values are **masked** in output (only first 4 characters shown)
- Original `.env` file remains **private** on your machine  
- Secrets are **encrypted** in GitHub's secret storage
- Only repository collaborators can **access** the secrets
- Secrets are **never logged** or stored elsewhere

## ⚡ Why This is Better

**Before:** 😩
- Manual copy/paste of 15+ secrets
- Risk of typos and formatting errors  
- Takes 10+ minutes of boring work
- Easy to miss a required secret

**After:** 🚀  
- One command uploads everything
- Automatic validation and error checking
- Takes 30 seconds with beautiful output
- Guaranteed all secrets are set correctly

Ready to deploy? Run the script and watch your CI/CD pipeline come to life! 🎉 