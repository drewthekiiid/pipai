# PIP AI Temporal Workers - Fly.io Deployment Guide

This guide explains how to deploy and manage the PIP AI Temporal workers on Fly.io for 24/7 operation.

## Prerequisites

1. **Install Fly.io CLI**:

   ```bash
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh

   # Windows
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Create Fly.io Account & Login**:

   ```bash
   flyctl auth signup  # Create account
   # OR
   flyctl auth login   # Login to existing account
   ```

3. **Environment Variables**: Ensure your `.env` file contains all required variables:
   - `TEMPORAL_API_KEY`
   - `OPENAI_API_KEY`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `AWS_S3_BUCKET_NAME`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## Deployment Commands

### Initial Deployment

```bash
./fly-deploy.sh
```

This script will:

- Create the Fly.io app if it doesn't exist
- Set environment secrets
- Build and deploy the Docker container
- Scale to 1 running instance
- Show deployment status and logs

### Monitoring & Management

#### View Real-time Logs

```bash
./fly-logs.sh
```

#### Check Status

```bash
./fly-status.sh
```

#### Manual Commands

```bash
# Scale workers up/down
flyctl scale count 2 --app pip-ai-temporal-workers

# Restart all machines
flyctl machine restart --app pip-ai-temporal-workers

# SSH into a running machine
flyctl ssh console --app pip-ai-temporal-workers

# View machine metrics
flyctl machine list --app pip-ai-temporal-workers
```

## Configuration Details

### Fly.toml Configuration

- **App Name**: `pip-ai-temporal-workers`
- **Region**: `iad` (Ashburn, VA - close to Temporal Cloud)
- **Auto-scaling**: 1-3 machines based on load
- **Auto-stop**: Disabled (runs 24/7)
- **Memory**: 512MB per machine
- **CPU**: Shared CPU (cost-effective)

### Docker Configuration

- **Base Image**: Node.js 20 slim
- **Multi-stage build**: Optimized for production
- **Security**: Non-root user execution
- **Health checks**: Built-in monitoring
- **Signal handling**: Proper shutdown handling

## Troubleshooting

### Common Issues

1. **Build Failures**:

   ```bash
   # Check build logs
   flyctl logs --app pip-ai-temporal-workers -n 200

   # Force rebuild
   flyctl deploy --no-cache --config fly.toml
   ```

2. **Environment Variables**:

   ```bash
   # List current secrets
   flyctl secrets list --app pip-ai-temporal-workers

   # Update a specific secret
   flyctl secrets set TEMPORAL_API_KEY="new-key" --app pip-ai-temporal-workers
   ```

3. **Machine Not Starting**:

   ```bash
   # Check machine status
   flyctl machine list --app pip-ai-temporal-workers

   # View detailed machine info
   flyctl machine status <machine-id> --app pip-ai-temporal-workers
   ```

4. **High Memory Usage**:
   ```bash
   # Scale to larger machine size
   flyctl scale memory 1024 --app pip-ai-temporal-workers
   ```

### Performance Monitoring

Monitor your workers through:

- **Fly.io Dashboard**: https://web.fly.io/apps/pip-ai-temporal-workers
- **Temporal Cloud Dashboard**: Your Temporal namespace dashboard
- **Application Logs**: `./fly-logs.sh`

## Cost Optimization

- **Shared CPU**: ~$2-4/month per machine
- **Auto-scaling**: Scales down during low activity
- **Memory**: Start with 512MB, scale up if needed
- **Regions**: Single region deployment to minimize costs

## Security Features

- **Non-root execution**: Container runs as unprivileged user
- **Secrets management**: Environment variables stored securely
- **Network isolation**: Private networking between machines
- **TLS encryption**: All traffic encrypted in transit

## Next Steps

After deployment:

1. Monitor logs for successful Temporal connection
2. Test workflow execution from your main application
3. Set up monitoring alerts in Fly.io dashboard
4. Configure backup strategies for critical data

## Support

- **Fly.io Docs**: https://fly.io/docs/
- **Temporal Docs**: https://docs.temporal.io/
- **PIP AI Issues**: Create an issue in the repository
