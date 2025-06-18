"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

export interface StreamEvent {
  type: string;
  data: unknown;
  timestamp?: string;
}

interface UseWorkflowStreamOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWorkflowStream(
  workflowId: string | null,
  options: UseWorkflowStreamOptions = {}
) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const {
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!workflowId) return;

    disconnect();

    try {
      const url = `/api/stream/${workflowId}`;
      console.log('Connecting to workflow stream:', url);
      
      eventSourceRef.current = new EventSource(url);
      
      eventSourceRef.current.onopen = () => {
        console.log('SSE connection opened');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSourceRef.current.onerror = (event) => {
        console.error('SSE connection error:', event);
        setIsConnected(false);
        
        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log(`Reconnecting... attempt ${reconnectAttemptsRef.current}`);
            connect();
          }, reconnectInterval);
        } else {
          setError(new Error('Failed to connect to workflow stream'));
        }
      };

      // Handle different event types (including construction-specific events)
      const eventTypes = [
        'connected',
        'status', 
        'progress',        // Construction analysis progress
        'analysis_complete', // Construction analysis completion
        'completed',
        'failed',
        'heartbeat',
        'timeout',
        'error'
      ];

      eventTypes.forEach(eventType => {
        eventSourceRef.current?.addEventListener(eventType, (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            const streamEvent: StreamEvent = {
              type: eventType,
              data,
              timestamp: new Date().toISOString()
            };
            
            // Enhanced logging for construction analysis events
            if (eventType === 'progress') {
              console.log(`🏗️ Construction Progress: ${data.progress}% - ${data.step} (Agent: ${data.agent})`);
            } else if (eventType === 'analysis_complete') {
              console.log(`✅ Construction Analysis Complete: ${data.step}`);
            } else if (eventType === 'completed') {
              console.log(`🎉 Workflow Completed:`, data);
            } else {
              console.log('Stream event received:', streamEvent);
            }
            
            setLastEvent(streamEvent);
            setEvents(prev => [...prev, streamEvent]);

            // Close connection on completion or failure
            if (eventType === 'completed' || eventType === 'failed' || eventType === 'timeout') {
              setTimeout(() => disconnect(), 2000); // Give a bit more time for final events
            }
          } catch (err) {
            console.error(`Failed to parse SSE event ${eventType}:`, err, event.data);
          }
        });
      });

    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setError(err instanceof Error ? err : new Error('Connection failed'));
    }
  }, [workflowId, disconnect, reconnect, reconnectInterval, maxReconnectAttempts]);

  // Connect when workflowId changes
  useEffect(() => {
    if (workflowId) {
      connect();
    } else {
      disconnect();
    }

    return disconnect;
  }, [workflowId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return disconnect;
  }, [disconnect]);

  return {
    events,
    isConnected,
    error,
    lastEvent,
    connect,
    disconnect
  };
}
