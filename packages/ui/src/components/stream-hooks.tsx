/**
 * React hooks for consuming PIP AI SSE streams
 * Real-time workflow and analysis progress updates
 */

import { useEffect, useState, useCallback, useRef } from 'react';

export interface StreamEvent {
  type: string;
  data: any;
  timestamp?: string;
}

export interface WorkflowStatus {
  step: string;
  progress: number;
  error?: string;
  result?: any;
  canceled?: boolean;
  workflow_status?: string;
}

export interface StreamHookOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * Hook for consuming Server-Sent Events
 */
export function useSSE(
  url: string | null,
  options: StreamHookOptions = {}
) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const {
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onError,
    onConnect,
    onDisconnect
  } = options;

  const connect = useCallback(() => {
    if (!url) return;

    try {
      eventSourceRef.current = new EventSource(url);
      
      eventSourceRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const streamEvent: StreamEvent = {
            type: event.type || 'message',
            data,
            timestamp: new Date().toISOString()
          };
          
          setLastEvent(streamEvent);
          setEvents(prev => {
            const newEvents = [...prev, streamEvent];
            return newEvents.length > 1000 ? newEvents.slice(-500) : newEvents;
          });
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      };

      // Handle different event types
      const eventTypes = [
        'connected',
        'disconnected', 
        'progress',
        'workflow_progress',
        'analysis_progress',
        'temporal_status',
        'error',
        'notification'
      ];

      eventTypes.forEach(eventType => {
        eventSourceRef.current?.addEventListener(eventType, (event: any) => {
          try {
            const data = JSON.parse(event.data);
            const streamEvent: StreamEvent = {
              type: eventType,
              data,
              timestamp: new Date().toISOString()
            };
            
            setLastEvent(streamEvent);
            setEvents(prev => {
              const newEvents = [...prev, streamEvent];
              return newEvents.length > 1000 ? newEvents.slice(-500) : newEvents;
            });
          } catch (err) {
            console.error(`Failed to parse ${eventType} event:`, err);
          }
        });
      });

      eventSourceRef.current.onerror = () => {
        setIsConnected(false);
        const error = new Error('SSE connection error');
        setError(error);
        onError?.(error);

        // Attempt reconnection
        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          onDisconnect?.();
        }
      };

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create EventSource');
      setError(error);
      onError?.(error);
    }
  }, [url, reconnect, reconnectInterval, maxReconnectAttempts, onError, onConnect, onDisconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsConnected(false);
    onDisconnect?.();
  }, [onDisconnect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  return {
    events,
    lastEvent,
    isConnected,
    error,
    connect,
    disconnect,
    clearEvents
  };
}

/**
 * Hook for workflow progress streaming
 */
export function useWorkflowProgress(
  workflowId: string | null,
  apiBaseUrl: string,
  options: StreamHookOptions = {}
) {
  const url = workflowId ? `${apiBaseUrl}/stream/workflow/${workflowId}` : null;
  const { events, lastEvent, isConnected, error, disconnect, clearEvents } = useSSE(url, options);
  
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (lastEvent) {
      switch (lastEvent.type) {
        case 'workflow_progress':
        case 'temporal_status':
          const newStatus = lastEvent.data.status || lastEvent.data;
          setStatus(newStatus);
          setProgress(newStatus.progress || 0);
          setCurrentStep(newStatus.step || '');
          setHasError(!!newStatus.error);
          setIsComplete(
            newStatus.progress >= 100 ||
            newStatus.workflow_status === 'COMPLETED' ||
            newStatus.workflow_status === 'FAILED' ||
            newStatus.canceled
          );
          break;
        case 'error':
          setHasError(true);
          setStatus(prev => prev ? { ...prev, error: lastEvent.data.message } : null);
          break;
      }
    }
  }, [lastEvent]);

  return {
    workflowId,
    status,
    progress,
    currentStep,
    isComplete,
    hasError,
    events,
    lastEvent,
    isConnected,
    error,
    disconnect,
    clearEvents
  };
}

/**
 * Hook for file analysis progress streaming
 */
export function useFileAnalysisProgress(
  fileId: string | null,
  apiBaseUrl: string,
  options: StreamHookOptions = {}
) {
  const url = fileId ? `${apiBaseUrl}/stream/file/${fileId}` : null;
  const { events, lastEvent, isConnected, error, disconnect, clearEvents } = useSSE(url, options);
  
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (lastEvent) {
      switch (lastEvent.type) {
        case 'analysis_progress':
          const data = lastEvent.data;
          setAnalysisStep(data.step || '');
          setProgress(data.progress || 0);
          setHasError(!!data.error);
          setIsComplete(data.progress >= 100);
          if (data.result) {
            setResult(data.result);
          }
          break;
        case 'error':
          setHasError(true);
          break;
      }
    }
  }, [lastEvent]);

  return {
    fileId,
    analysisStep,
    progress,
    result,
    isComplete,
    hasError,
    events,
    lastEvent,
    isConnected,
    error,
    disconnect,
    clearEvents
  };
}

/**
 * Hook for user-wide event streaming
 */
export function useUserEventStream(
  userId: string | null,
  apiBaseUrl: string,
  options: StreamHookOptions = {}
) {
  const url = userId ? `${apiBaseUrl}/stream/user/${userId}` : null;
  const { events, lastEvent, isConnected, error, disconnect, clearEvents } = useSSE(url, options);
  
  const [notifications, setNotifications] = useState<StreamEvent[]>([]);
  const [workflowUpdates, setWorkflowUpdates] = useState<StreamEvent[]>([]);
  const [analysisUpdates, setAnalysisUpdates] = useState<StreamEvent[]>([]);

  useEffect(() => {
    if (lastEvent) {
      switch (lastEvent.type) {
        case 'notification':
          setNotifications(prev => [...prev, lastEvent]);
          break;
        case 'workflow_progress':
          setWorkflowUpdates(prev => [...prev, lastEvent]);
          break;
        case 'analysis_progress':
          setAnalysisUpdates(prev => [...prev, lastEvent]);
          break;
      }
    }
  }, [lastEvent]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    userId,
    notifications,
    workflowUpdates,
    analysisUpdates,
    events,
    lastEvent,
    isConnected,
    error,
    disconnect,
    clearEvents,
    clearNotifications
  };
}

/**
 * Component for displaying workflow progress
 */
export interface WorkflowProgressProps {
  workflowId: string;
  apiBaseUrl: string;
  onComplete?: (status: WorkflowStatus) => void;
  onError?: (error: Error) => void;
}

export function WorkflowProgress({ 
  workflowId, 
  apiBaseUrl, 
  onComplete, 
  onError 
}: WorkflowProgressProps) {
  const {
    progress,
    currentStep,
    isComplete,
    hasError,
    status,
    isConnected
  } = useWorkflowProgress(workflowId, apiBaseUrl, {
    onError
  });

  useEffect(() => {
    if (isComplete && onComplete && status) {
      onComplete(status);
    }
  }, [isComplete, onComplete, status]);

  return (
    <div className="workflow-progress">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {currentStep || 'Initializing...'}
        </span>
        <span className="text-sm text-gray-500">
          {progress}%
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            hasError ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex items-center mt-2 text-xs">
        <div className={`w-2 h-2 rounded-full mr-2 ${
          isConnected ? 'bg-green-400' : 'bg-gray-400'
        }`} />
        <span className="text-gray-500">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {hasError && status?.error && (
        <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded">
          {status.error}
        </div>
      )}
    </div>
  );
}
