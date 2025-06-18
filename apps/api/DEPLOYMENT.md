# PIP AI Upload API Deployment Guide

## Overview

The PIP AI Upload API is a FastAPI application that handles file uploads to S3 and triggers Temporal workflows for document analysis. This guide covers deployment to Fly.io.

## Prerequisites

1. **Fly.io Account**: Sign up at [fly.io](https://fly.io)
2. **Fly CLI**: Install the Fly CLI tool
3. **Pulumi Stack**: Ensure your infrastructure is deployed
4. **Temporal Cloud**: Worker should be running and connected

## Quick Deploy

1. **Setup API locally**:
```bash
./setup-api.sh
```

2. **Test locally**:
```bash
cd apps/api
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

3. **Create Fly app**:
```bash
cd apps/api
fly apps create pip-ai-upload-api
```

4. **Set environment variables**:
```bash
# Get values from your Pulumi stack or .env file
fly secrets set AWS_ACCESS_KEY_ID="your_access_key"
fly secrets set AWS_SECRET_ACCESS_KEY="your_secret_key"
fly secrets set AWS_S3_BUCKET_NAME="your_bucket_name"
fly secrets set AWS_REGION="us-east-1"
fly secrets set TEMPORAL_API_KEY="your_temporal_api_key"
fly secrets set TEMPORAL_HOST="us-east-1.aws.api.temporal.io:7233"
fly secrets set TEMPORAL_NAMESPACE="pip-ai.ts7wf"
fly secrets set TEMPORAL_TASK_QUEUE="pip-ai-task-queue"
```

5. **Deploy**:
```bash
fly deploy
```

## Environment Variables

The API requires these environment variables:

### Required
- `AWS_ACCESS_KEY_ID` - AWS access key for S3
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for S3
- `AWS_S3_BUCKET_NAME` - S3 bucket name for file storage
- `TEMPORAL_API_KEY` - Temporal Cloud API key

### Optional (with defaults)
- `AWS_REGION` - AWS region (default: us-east-1)
- `TEMPORAL_HOST` - Temporal host (default: us-east-1.aws.api.temporal.io:7233)
- `TEMPORAL_NAMESPACE` - Temporal namespace (default: pip-ai.ts7wf)
- `TEMPORAL_TASK_QUEUE` - Task queue name (default: pip-ai-task-queue)
- `PORT` - API port (default: 8000)

## Getting Values from Pulumi

If you have Pulumi CLI installed and configured:

```bash
# From the infra directory
cd infra
pulumi stack output awsAccessKeyId
pulumi stack output awsSecretAccessKey
pulumi stack output awsS3BucketName
pulumi stack output awsRegion
```

## Deployment Steps

### 1. Prepare Application

```bash
# Navigate to API directory
cd apps/api

# Ensure requirements are up to date
pip freeze > requirements.txt
```

### 2. Configure Fly.io

The `fly.toml` file is already configured with:
- Health checks on `/health`
- Proper machine sizing (512MB RAM)
- Auto-scaling configuration
- Volume mounts for temporary data

### 3. Set Secrets

```bash
# Set all required secrets
fly secrets set \
  AWS_ACCESS_KEY_ID="your_value" \
  AWS_SECRET_ACCESS_KEY="your_value" \
  AWS_S3_BUCKET_NAME="your_value" \
  TEMPORAL_API_KEY="your_value"

# Verify secrets are set
fly secrets list
```

### 4. Deploy

```bash
# Deploy to Fly.io
fly deploy

# Check deployment status
fly status

# View logs
fly logs
```

### 5. Test Deployment

```bash
# Get the app URL
APP_URL=$(fly info --json | jq -r '.hostname')

# Test health endpoint
curl https://$APP_URL/health

# Test file upload (with a test file)
curl -X POST https://$APP_URL/upload \
  -F "file=@test.txt" \
  -F "user_id=test-user" \
  -F "generate_summary=true"
```

## Monitoring

### Health Checks

The API includes built-in health monitoring:

- `GET /health` - Comprehensive health check
- Checks S3 connectivity
- Checks Temporal connectivity
- Returns detailed status for each service

### Logs

View application logs:

```bash
# Live logs
fly logs

# Recent logs
fly logs --region ord

# Specific time range
fly logs --since 1h
```

### Metrics

Fly.io provides basic metrics in the dashboard. For advanced monitoring, consider integrating:

- **Grafana Cloud** (configured in infrastructure)
- **Custom metrics** via OpenTelemetry
- **Application Performance Monitoring** (APM)

## Scaling

### Vertical Scaling

Adjust machine resources in `fly.toml`:

```toml
[machine]
  memory = "1gb"    # Increase for larger files
  cpus = 2          # Increase for better performance
```

### Horizontal Scaling

```bash
# Scale to multiple machines
fly scale count 2

# Scale to zero when not needed
fly scale count 0
```

### Auto-scaling

The current configuration includes:
- `auto_stop_machines = true` - Stop when idle
- `auto_start_machines = true` - Start on demand
- `min_machines_running = 0` - Allow scaling to zero

## Troubleshooting

### Common Issues

1. **S3 Connection Failed**:
   - Verify AWS credentials are correct
   - Check bucket name and region
   - Ensure IAM permissions include S3 access

2. **Temporal Connection Failed**:
   - Verify API key is correct
   - Check namespace name
   - Ensure worker is running and connected

3. **File Upload Timeout**:
   - Check file size limits (100MB default)
   - Verify network connectivity
   - Consider increasing timeout values

### Debug Commands

```bash
# SSH into the machine
fly ssh console

# Check environment variables
fly ssh console -C "env | grep -E '(AWS|TEMPORAL)'"

# Test connectivity
fly ssh console -C "python -c 'import boto3; print(boto3.__version__)'"
```

### Logs Analysis

```bash
# Filter for errors
fly logs | grep ERROR

# Filter for specific workflow
fly logs | grep "workflow-id"

# Export logs for analysis
fly logs --since 24h > api-logs.txt
```

## Security Considerations

1. **Environment Variables**: Use Fly secrets, never commit credentials
2. **CORS**: Configure proper origins for production
3. **File Validation**: Implement file type and size limits
4. **Rate Limiting**: Consider adding rate limiting middleware
5. **Authentication**: Integrate with your auth system (Clerk, Auth0, etc.)

## Performance Optimization

1. **File Processing**: 
   - Stream large files instead of loading into memory
   - Implement chunked uploads for very large files
   - Use background tasks for heavy processing

2. **Caching**:
   - Cache workflow status responses
   - Use Redis for session storage
   - Implement CDN for static assets

3. **Database**:
   - Use connection pooling
   - Implement proper indexing
   - Consider read replicas for high load

## Next Steps

After deployment:

1. **Frontend Integration**: Update frontend to use the deployed API URL
2. **Monitoring Setup**: Configure alerts and dashboards
3. **Backup Strategy**: Implement S3 backup and retention policies
4. **Security Hardening**: Review and implement security best practices
5. **Performance Testing**: Load test the API with realistic workloads

## Support

For issues:
1. Check the logs first: `fly logs`
2. Verify health status: `curl https://your-app.fly.dev/health`
3. Review environment variables: `fly secrets list`
4. Check Temporal worker status in the worker logs
