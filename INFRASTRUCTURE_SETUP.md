# Infrastructure Setup - Step 3

## Current Status
- Pulumi project initialized in `infra/` directory
- Passphrase: `triiiple3`
- Configuration partially set up
- Infrastructure code written but deployment paused

## Next Steps

### 1. Fix Pulumi Configuration
The current issue is with the Vercel provider version. Need to:
```bash
cd infra
export PULUMI_CONFIG_PASSPHRASE="triiiple3"
npm uninstall @pulumiverse/vercel
npm install @pulumi/vercel
```

### 2. Clean Up Infrastructure Code
The current `infra/index.ts` has some duplicate declarations that need to be cleaned up. The file should provision:
- Vercel project for Next.js app
- AWS S3 bucket for file storage
- IAM user and policies for S3 access
- Random secrets for internal use
- Outputs for environment variable integration

### 3. Deploy Infrastructure
Once the provider issues are resolved:
```bash
cd infra
pulumi up
```

### 4. Integrate Outputs
After successful deployment, integrate the Pulumi outputs into the main `.env` file:
- S3 bucket name and region
- AWS access keys for S3
- Vercel project ID
- Any generated secrets

### 5. Manual Service Setup
Still need to manually set up accounts and get credentials for:
- **Clerk** (Authentication)
- **Temporal Cloud** (Workflows)
- **Neon** (Database)
- **Qdrant Cloud** (Vector DB)
- **Upstash** (Redis/Kafka)

### 6. Add Additional Providers
Once credentials are available, extend Pulumi to provision:
- Upstash Redis and Kafka instances
- Neon database (if API available)
- Other managed services

## Files Modified
- `infra/index.ts` - Infrastructure definition
- `infra/package.json` - Dependencies
- `infra/Pulumi.yaml` - Project config
- `infra/Pulumi.dev.yaml` - Stack config

## Environment Variables Needed
The infrastructure will output values for these env vars:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_NAME`
- `AWS_REGION`
- `VERCEL_PROJECT_ID`
- `INTERNAL_SECRET`

## Resume Command
To resume this step later:
```bash
cd /Users/thekiiid/pipai/infra
export PULUMI_CONFIG_PASSPHRASE="triiiple3"
# Fix provider issues first, then:
pulumi up
```
