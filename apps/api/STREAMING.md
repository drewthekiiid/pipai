# PIP AI Stream API Documentation

Real-time streaming API for workflow and analysis progress using Server-Sent Events (SSE) and Upstash Redis streams.

## Overview

The Stream API provides real-time updates for:
- **Workflow Progress**: Temporal workflow execution status
- **File Analysis**: Document processing and AI analysis progress  
- **User Events**: Global notifications and updates for users
- **System Health**: Service connectivity and performance metrics

## Architecture

```
Browser ←→ SSE Stream ←→ FastAPI ←→ Redis Streams ←→ Temporal Worker
                                 ↑
                            Upstash Cloud
```

## Endpoints

### Core Streaming Endpoints

#### Stream Workflow Progress
```http
GET /stream/workflow/{workflow_id}
Content-Type: text/event-stream
```

Real-time updates for a specific Temporal workflow.

**Events:**
- `connected` - Stream connection established
- `workflow_progress` - Workflow step progress
- `temporal_status` - Direct Temporal status query
- `error` - Error occurred
- `disconnected` - Stream disconnected

#### Stream File Analysis Progress
```http
GET /stream/file/{file_id}
Content-Type: text/event-stream
```

Real-time updates for file analysis operations.

**Events:**
- `connected` - Stream connection established
- `analysis_progress` - Analysis step progress
- `error` - Error occurred  
- `disconnected` - Stream disconnected

#### Stream User Events
```http
GET /stream/user/{user_id}
Content-Type: text/event-stream
```

Global event stream for a specific user.

**Events:**
- `connected` - Stream connection established
- `notification` - User notifications
- `workflow_progress` - User's workflow updates
- `analysis_progress` - User's file analysis updates
- `error` - Error occurred
- `disconnected` - Stream disconnected

### Publisher Endpoints

#### Publish Workflow Event
```http
POST /stream/publish/workflow/{workflow_id}
Content-Type: application/json

{
  "step": "processing",
  "progress": 50,
  "message": "Analyzing document content",
  "metadata": {}
}
```

#### Publish Analysis Event
```http
POST /stream/publish/analysis/{file_id}
Content-Type: application/json

{
  "step": "text_extraction",
  "progress": 25,
  "message": "Extracting text from PDF",
  "result": {}
}
```

### Health Check
```http
GET /stream/health
```

Returns streaming service health status.

## Event Format

All SSE events follow this format:

```
event: event_type
data: {"key": "value", "timestamp": "2025-01-01T00:00:00Z"}

```

### Common Event Data Structure

```typescript
interface StreamEvent {
  type: string;           // Event type
  data: {
    timestamp: string;    // ISO timestamp
    [key: string]: any;   // Event-specific data
  };
}

interface WorkflowProgressEvent {
  type: "workflow_progress";
  data: {
    workflow_id: string;
    step: string;         // Current step name
    progress: number;     // 0-100 progress percentage
    message?: string;     // Human-readable message
    error?: string;       // Error message if failed
    canceled?: boolean;   // Whether workflow was canceled
    result?: any;         // Final result if completed
    timestamp: string;
  };
}

interface AnalysisProgressEvent {
  type: "analysis_progress";
  data: {
    file_id: string;
    step: string;         // Analysis step
    progress: number;     // 0-100 progress percentage
    message?: string;     // Step description
    error?: string;       // Error message
    result?: any;         // Partial or final results
    timestamp: string;
  };
}
```

## Frontend Integration

### React Hooks

Use the provided React hooks for easy integration:

```typescript
import { useWorkflowProgress, useFileAnalysisProgress } from '@pipai/ui';

function MyComponent() {
  // Stream workflow progress
  const {
    progress,
    currentStep,
    isComplete,
    hasError,
    status,
    isConnected
  } = useWorkflowProgress(
    workflowId,
    'http://localhost:8000',
    {
      onError: (err) => console.error(err),
      onComplete: (status) => console.log('Done!', status)
    }
  );

  // Stream file analysis
  const {
    analysisStep,
    progress: fileProgress,
    result,
    isComplete: analysisComplete
  } = useFileAnalysisProgress(fileId, 'http://localhost:8000');

  return (
    <div>
      <div>Workflow: {currentStep} ({progress}%)</div>
      <div>Analysis: {analysisStep} ({fileProgress}%)</div>
      <div>Connected: {isConnected ? '✅' : '❌'}</div>
    </div>
  );
}
```

### Vanilla JavaScript

```javascript
// Connect to workflow stream
const eventSource = new EventSource('/stream/workflow/my-workflow-id');

eventSource.addEventListener('workflow_progress', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Progress: ${data.progress}% - ${data.step}`);
  
  // Update UI
  document.getElementById('progress').textContent = `${data.progress}%`;
  document.getElementById('step').textContent = data.step;
});

eventSource.addEventListener('error', (event) => {
  console.error('Stream error:', event);
});

// Close when done
eventSource.close();
```

### TypeScript Client

```typescript
import { createPipAIClient } from '@pipai/shared';

const client = createPipAIClient('http://localhost:8000');

// Upload file and monitor progress
const result = await client.upload(file);

// Stream progress
const eventSource = new EventSource(`/stream/workflow/${result.workflow_id}`);

eventSource.addEventListener('workflow_progress', (event) => {
  const data = JSON.parse(event.data);
  if (data.progress >= 100) {
    console.log('Analysis complete!', data.result);
    eventSource.close();
  }
});
```

## Redis Stream Configuration

The streaming API uses Redis Streams for reliable message delivery and persistence.

### Stream Keys
- `pip-ai:workflow:progress` - Workflow progress events
- `pip-ai:analysis:progress` - File analysis events
- `pip-ai:ai:progress` - AI processing events
- `pip-ai:notifications` - User notifications

### Stream Configuration
- **Max Length**: 1000 entries per stream
- **Retention**: Automatic cleanup of old entries
- **Consumer Groups**: Support for multiple consumers
- **Persistence**: Events survive Redis restarts

## Environment Variables

```bash
# Required for streaming
UPSTASH_REDIS_REST_URL=your_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_redis_rest_token

# Optional configuration
STREAM_MAX_ENTRIES=1000
STREAM_BLOCK_TIME=1000
RECONNECT_INTERVAL=3000
MAX_RECONNECT_ATTEMPTS=5
```

## Deployment

### Development
```bash
# Start API with streaming
cd apps/api
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Test streaming
curl -N http://localhost:8000/stream/workflow/test-id
```

### Production (Fly.io)
```bash
# Set Redis environment variables
fly secrets set UPSTASH_REDIS_REST_URL="your_url"
fly secrets set UPSTASH_REDIS_REST_TOKEN="your_token"

# Deploy
fly deploy
```

## Monitoring

### Health Checks
```bash
# Check streaming service health
curl http://localhost:8000/stream/health

# Response
{
  "status": "healthy",
  "services": {
    "redis": "healthy",
    "temporal": "healthy"
  },
  "active_streams": 5,
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### Metrics
- **Active Streams**: Number of concurrent SSE connections
- **Redis Connectivity**: Connection status to Upstash
- **Temporal Connectivity**: Connection status to Temporal Cloud
- **Event Throughput**: Events per second processed
- **Error Rate**: Failed stream connections or events

## Error Handling

### Client-Side
```typescript
const { error, isConnected, reconnect } = useWorkflowProgress(workflowId, apiUrl, {
  reconnect: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 3000,
  onError: (error) => {
    console.error('Stream error:', error);
    // Show user notification
    toast.error('Connection lost, reconnecting...');
  },
  onConnect: () => {
    console.log('Stream reconnected');
    toast.success('Connected');
  }
});
```

### Server-Side
- **Connection Drops**: Automatic cleanup of dead connections
- **Redis Failures**: Graceful degradation, local caching
- **Temporal Failures**: Fallback to polling mode
- **Rate Limiting**: Protection against connection spam

## Performance

### Optimizations
- **Connection Pooling**: Reuse Redis connections
- **Event Batching**: Group multiple events in single SSE message
- **Compression**: Gzip SSE streams for large payloads
- **Caching**: Cache frequently accessed data
- **Throttling**: Rate limit events to prevent overwhelming clients

### Scaling
- **Horizontal**: Multiple API instances share Redis streams
- **Load Balancing**: Sticky sessions not required
- **Redis Cluster**: Support for Redis clustering
- **CDN**: Cache static SSE metadata

## Security

### Authentication
```typescript
// Add auth headers to SSE connections
const eventSource = new EventSource('/stream/workflow/id', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Authorization
- **User Isolation**: Users only see their own events
- **Workflow Access**: Verify user owns workflow
- **Rate Limiting**: Prevent abuse of streaming endpoints
- **CORS**: Configure allowed origins properly

## Troubleshooting

### Common Issues

**1. Connection Fails**
```bash
# Check Redis connectivity
redis-cli -h your-host -p 6379 ping

# Check API logs
fly logs --app pip-ai-upload-api | grep stream
```

**2. Events Not Received**
```bash
# Test Redis streams directly
redis-cli XREAD STREAMS pip-ai:workflow:progress 0
```

**3. High Memory Usage**
```bash
# Check stream lengths
redis-cli XLEN pip-ai:workflow:progress

# Trim old entries
redis-cli XTRIM pip-ai:workflow:progress MAXLEN 100
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=true uvicorn main:app --reload

# Stream debug events
curl -N http://localhost:8000/stream/workflow/debug
```

## Examples

See the demo page at `/demo/streaming` for a complete working example with:
- File upload with progress
- Real-time workflow monitoring  
- Event log display
- Error handling
- Reconnection logic
