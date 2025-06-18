# TypeScript Streaming API Documentation

## Overview

The TypeScript Streaming API provides Server-Sent Events (SSE) endpoints for real-time progress updates in the PIP AI application. It consumes events from Upstash Redis streams and delivers them to web browsers via HTTP streaming.

## Architecture

- **Framework**: Next.js 15.3.3 API Routes
- **Redis Client**: @upstash/redis v1.35.0
- **Temporal Client**: @temporalio/client v1.11.8
- **Protocol**: Server-Sent Events (SSE)
- **Data Format**: JSON over SSE

## Endpoints

### Stream Consumer: `/api/stream/[id]`

**Method**: `GET`

**Description**: Consumes Redis streams and pipes events to browser via SSE.

**URL Parameters**:
- `id`: Stream identifier in format `type:identifier`
  - `workflow:workflow-id` - Workflow progress and status
  - `file:file-id` - File upload and analysis progress  
  - `user:user-id` - User activity and notifications

**Query Parameters**:
- `lastId` (optional): Resume from specific event ID (default: '0')

**Example Usage**:
```javascript
const eventSource = new EventSource('/api/stream/workflow:my-workflow-123');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

**Response Format**:
```json
{
  "id": "1703027400000",
  "timestamp": "2023-12-19T20:30:00.000Z",
  "type": "workflow.progress",
  "data": {
    "workflowId": "my-workflow-123",
    "progress": 45,
    "message": "Processing file..."
  }
}
```

### Health Check: `/api/stream/health`

**Method**: `GET`

**Description**: Check the health of Redis and Temporal connections.

**Response**:
```json
{
  "status": "healthy",
  "services": {
    "redis": true,
    "temporal": true
  }
}
```

### Test Publisher: `/api/stream/test-publish`

**Method**: `POST`

**Description**: Publish test events to Redis streams (for development/testing).

**Request Body**:
```json
{
  "streamKey": "workflow:test-123",
  "event": {
    "type": "test.event",
    "data": {
      "message": "Test event",
      "timestamp": "2023-12-19T20:30:00.000Z"
    }
  }
}
```

## Event Types

### Workflow Events

- `workflow.started` - Workflow has been initiated
- `workflow.progress` - Progress update with percentage and message
- `workflow.completed` - Workflow finished successfully
- `workflow.failed` - Workflow encountered an error

### File Events

- `file.uploaded` - File successfully uploaded to S3
- `file.analysis.started` - Analysis process began
- `file.analysis.progress` - Analysis progress update
- `file.analysis.completed` - Analysis finished with results

### User Events

- `user.activity` - General user activity tracking

### Connection Events

- `connection.established` - SSE connection opened
- `stream.error` - Stream encountered an error

## Publisher Functions

The API exports several publisher functions for use by other parts of the application:

```typescript
// Workflow events
publishWorkflowStarted(workflowId: string, data?: Record<string, any>)
publishWorkflowProgress(workflowId: string, progress: number, message?: string)
publishWorkflowCompleted(workflowId: string, result?: Record<string, any>)
publishWorkflowFailed(workflowId: string, error: string)

// File events
publishFileUploaded(fileId: string, filename: string, size: number)
publishFileAnalysisStarted(fileId: string, analysisType: string)
publishFileAnalysisProgress(fileId: string, progress: number, message?: string)
publishFileAnalysisCompleted(fileId: string, results: Record<string, any>)

// User events
publishUserActivity(userId: string, activity: string, metadata?: Record<string, any>)
```

## Environment Variables

Required environment variables:

```bash
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Temporal Cloud
TEMPORAL_ADDRESS=temporal.pipai-namespace.tmprl.cloud:7233
TEMPORAL_NAMESPACE=pipai-namespace
TEMPORAL_TLS_CERT_PATH=/path/to/cert.pem
TEMPORAL_TLS_KEY_PATH=/path/to/key.pem
```

## Client Integration

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface StreamEvent {
  id: string;
  timestamp: string;
  type: string;
  data: Record<string, any>;
}

export function useStreamEvents(streamId: string) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(`/api/stream/${streamId}`);
    
    eventSource.onopen = () => setIsConnected(true);
    eventSource.onmessage = (event) => {
      const data: StreamEvent = JSON.parse(event.data);
      setEvents(prev => [...prev, data]);
    };
    eventSource.onerror = () => setIsConnected(false);

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [streamId]);

  return { events, isConnected };
}
```

### Usage in Component

```tsx
function WorkflowProgress({ workflowId }: { workflowId: string }) {
  const { events, isConnected } = useStreamEvents(`workflow:${workflowId}`);
  
  const latestProgress = events
    .filter(e => e.type === 'workflow.progress')
    .slice(-1)[0];

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {latestProgress && (
        <div>
          Progress: {latestProgress.data.progress}%
          <br />
          Message: {latestProgress.data.message}
        </div>
      )}
    </div>
  );
}
```

## Error Handling

The API includes comprehensive error handling:

- **Network Errors**: Automatic reconnection attempts
- **Redis Errors**: Graceful degradation with retry logic
- **Temporal Errors**: Proper error reporting without connection termination
- **Invalid Requests**: Clear HTTP error responses

## Security Considerations

- **CORS**: Configured for cross-origin requests
- **Rate Limiting**: Should be implemented at the infrastructure level
- **Authentication**: Can be added via middleware
- **Input Validation**: Stream IDs are validated for proper format

## Performance

- **Connection Pooling**: Redis connections are reused
- **Streaming**: Events are streamed in real-time, not batched
- **Memory Usage**: Events are not stored in memory, only streamed
- **Scalability**: Stateless design allows horizontal scaling

## Demo

A simple demo page is available at `/demo/simple-streaming` that demonstrates:

- Connecting to different stream types
- Real-time event display
- Publishing test events
- Connection status monitoring

## Integration with Python API

This TypeScript streaming API works alongside the Python FastAPI streaming endpoints. Both consume from the same Upstash Redis streams, so events published by the Python API will be consumed by this TypeScript endpoint and vice versa.

The Python API should be used for:
- File upload workflows
- Long-running Temporal workflows  
- Backend event publishing

The TypeScript API should be used for:
- Frontend SSE connections
- Web UI integration
- Development testing

## Deployment

The API is deployed as part of the Next.js application:

1. **Vercel**: Automatic deployment via Git integration
2. **Environment Variables**: Set in Vercel dashboard or via CLI
3. **Edge Runtime**: Uses Node.js runtime for Redis/Temporal compatibility
4. **Monitoring**: Built-in Vercel analytics and logging

## Troubleshooting

### Common Issues

1. **Connection Failures**: Check environment variables and network connectivity
2. **Missing Events**: Verify Redis stream keys match expected format
3. **TypeScript Errors**: Ensure all dependencies are installed via `pnpm install`
4. **SSE Not Working**: Check browser console for CORS or connection errors

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in environment variables.

### Health Checks

Use the `/api/stream/health` endpoint to verify service connectivity before establishing SSE connections.
