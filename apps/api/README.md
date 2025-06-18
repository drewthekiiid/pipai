# PIP AI Upload API

Edge API for file uploads and workflow orchestration using FastAPI, AWS S3, and Temporal.

## Features

- **File Upload**: Upload files to AWS S3 with automatic organization
- **Workflow Orchestration**: Automatically start Temporal workflows for document analysis
- **Real-time Status**: Query workflow progress and cancel if needed
- **Health Monitoring**: Health check endpoints for monitoring
- **CORS Support**: Cross-origin resource sharing for web integration

## API Endpoints

### Core Endpoints

- `GET /` - API information and health
- `GET /health` - Detailed health check (S3, Temporal connectivity)
- `POST /upload` - Upload file and start analysis workflow
- `GET /workflow/{workflow_id}/status` - Get workflow status
- `POST /workflow/{workflow_id}/cancel` - Cancel workflow

### Upload Endpoint

```bash
POST /upload
Content-Type: multipart/form-data

Parameters:
- file: The file to upload (required)
- user_id: User identifier (default: "default-user")
- extract_images: Extract images from document (default: false)
- generate_summary: Generate document summary (default: true)
- detect_language: Detect document language (default: true)
- analysis_type: Type of analysis (auto, document, code, data, image)
```

Response:
```json
{
  "file_id": "uuid",
  "filename": "document.pdf",
  "s3_key": "uploads/user/2025/01/01/uuid_document.pdf",
  "size": 1024,
  "content_type": "application/pdf",
  "workflow_id": "analyze-uuid",
  "upload_url": "https://bucket.s3.region.amazonaws.com/key",
  "status": "uploaded",
  "created_at": "2025-01-01T00:00:00Z"
}
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name
AWS_REGION=us-east-1

# Temporal Configuration
TEMPORAL_HOST=us-east-1.aws.api.temporal.io:7233
TEMPORAL_NAMESPACE=pip-ai.ts7wf
TEMPORAL_API_KEY=your_temporal_api_key
TEMPORAL_TASK_QUEUE=pip-ai-task-queue
```

## Development

### Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your values
```

3. Run the development server:
```bash
npm run dev
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Using Turbo

From the workspace root:

```bash
# Development
pnpm turbo api:dev

# Build
pnpm turbo api:build

# Test
pnpm turbo api:test
```

## Deployment

### Fly.io Deployment

1. Install Fly CLI and authenticate
2. Deploy:
```bash
fly deploy
```

3. Set environment variables:
```bash
fly secrets set AWS_ACCESS_KEY_ID=your_key
fly secrets set AWS_SECRET_ACCESS_KEY=your_secret
fly secrets set AWS_S3_BUCKET_NAME=your_bucket
fly secrets set TEMPORAL_API_KEY=your_temporal_key
```

### Docker

```bash
# Build
docker build -t pip-ai-upload-api .

# Run
docker run -p 8000:8000 --env-file .env pip-ai-upload-api
```

## Testing

```bash
# Run tests
pytest test_upload.py -v

# Test with coverage
pytest --cov=upload test_upload.py
```

## Integration

### Frontend Integration

```typescript
// Upload file and start analysis
const formData = new FormData();
formData.append('file', file);
formData.append('user_id', userId);
formData.append('generate_summary', 'true');

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Workflow started:', result.workflow_id);

// Poll for status
const statusResponse = await fetch(`/api/workflow/${result.workflow_id}/status`);
const status = await statusResponse.json();
console.log('Analysis progress:', status.status.progress);
```

### Workflow Integration

The API automatically starts the `analyzeDocumentWorkflow` in Temporal with this input:

```typescript
{
  fileUrl: "s3_url",
  userId: "user_id", 
  fileName: "filename",
  s3Key: "s3_key",
  analysisType: "document|code|data|image",
  options: {
    extractImages: boolean,
    generateSummary: boolean,
    detectLanguage: boolean
  }
}
```

## Architecture

```
Frontend → Upload API → S3 Storage
                    ↓
                Temporal Cloud → Worker
                    ↓
              Analysis Results → Database
```

## File Processing

1. **Upload**: File uploaded to S3 with organized key structure
2. **Workflow**: Temporal workflow started for analysis
3. **Processing**: Worker processes file (extract text, analyze, etc.)
4. **Results**: Analysis results stored and user notified

## Security

- File size limits (100MB default)
- Content type validation
- S3 bucket security
- API rate limiting (configure as needed)
- CORS configuration for production

## Monitoring

- Health check endpoint `/health`
- Workflow status tracking
- S3 connectivity monitoring
- Temporal connection status
