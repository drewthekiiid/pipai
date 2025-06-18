"use client";

import React from "react";
import { StreamEvent } from "./use-workflow-stream";

interface ProgressIndicatorProps {
  state: 'uploading' | 'processing';
  progress: number;
  file: File | null;
  workflowId: string | null;
  events: StreamEvent[];
  isConnected: boolean;
  onReset: () => void;
}

const CONSTRUCTION_AGENTS = [
  { 
    key: 'manager', 
    name: 'Manager Agent', 
    role: 'Project Coordination',
    icon: '🏗️',
    description: 'Orchestrating document analysis workflow'
  },
  { 
    key: 'file-reader', 
    name: 'File Reader Agent', 
    role: 'Document Processing',
    icon: '📄',
    description: 'Extracting text and structure from construction documents'
  },
  { 
    key: 'trade-mapper', 
    name: 'Trade Mapper Agent', 
    role: 'Trade Detection',
    icon: '🔧',
    description: 'Identifying CSI divisions and construction trades'
  },
  { 
    key: 'estimator', 
    name: 'Estimator Agent', 
    role: 'Cost Analysis',
    icon: '📊',
    description: 'Running GPT-4o analysis for scope and material takeoffs'
  },
  { 
    key: 'exporter', 
    name: 'Exporter Agent', 
    role: 'Results Processing',
    icon: '📋',
    description: 'Structuring analysis results and deliverables'
  }
];

export function ProgressIndicator({
  state,
  progress,
  file,
  workflowId,
  events,
  isConnected,
  onReset
}: ProgressIndicatorProps) {
  // Get current construction analysis progress
  const currentAnalysis = React.useMemo(() => {
    const progressEvents = events.filter(e => e.type === 'progress');
    if (progressEvents.length === 0) return null;
    
    const latest = progressEvents[progressEvents.length - 1];
    return {
      step: latest.data.step || '',
      progress: latest.data.progress || 0,
      agent: latest.data.agent || 'System'
    };
  }, [events]);

  // Get workflow status
  const workflowStatus = React.useMemo(() => {
    const statusEvents = events.filter(e => e.type === 'status');
    if (statusEvents.length === 0) return null;
    
    const latest = statusEvents[statusEvents.length - 1];
    return latest.data.status;
  }, [events]);

  // Calculate overall progress
  const workflowProgress = React.useMemo(() => {
    if (state === 'uploading') return progress;
    if (workflowStatus === 'COMPLETED') return 100;
    if (currentAnalysis) return currentAnalysis.progress;
    
    // Default processing progress
    return 25;
  }, [state, progress, workflowStatus, currentAnalysis]);

  // Determine which agent is currently active
  const activeAgent = React.useMemo(() => {
    if (!currentAnalysis) return null;
    
    const agentMap: { [key: string]: string } = {
      'Manager': 'manager',
      'File Reader': 'file-reader', 
      'Trade Mapper': 'trade-mapper',
      'Estimator': 'estimator',
      'Exporter': 'exporter'
    };
    
    return agentMap[currentAnalysis.agent] || null;
  }, [currentAnalysis]);

  return (
    <div className="space-y-6">
      {/* File Info */}
      {file && (
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-slate-900">{file.name}</h3>
            <p className="text-sm text-slate-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown type'}
            </p>
          </div>
          <button
            onClick={onReset}
            className="px-3 py-1 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-slate-900">
            {state === 'uploading' ? 'Uploading File' : 'Processing Document'}
          </h3>
          <span className="text-sm text-slate-500">{Math.round(workflowProgress)}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${workflowProgress}%` }}
          />
        </div>
      </div>

      {/* Construction Agents */}
      {state === 'processing' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-slate-900">Construction Analysis Agents</h4>
            <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
              Live Analysis
            </div>
          </div>
          
          {/* Current Step Display */}
          {currentAnalysis && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                {currentAnalysis.step}
              </div>
              <div className="text-xs text-blue-700 mt-1">
                Progress: {currentAnalysis.progress}% • Agent: {currentAnalysis.agent}
              </div>
            </div>
          )}
          
          {/* Agent Status Grid */}
          <div className="space-y-3">
            {CONSTRUCTION_AGENTS.map((agent, index) => {
              const isActive = activeAgent === agent.key;
              const agentProgress = currentAnalysis?.progress || 0;
              
              // Determine if agent is completed based on progress ranges
              const progressRanges = {
                'manager': [0, 15],
                'file-reader': [15, 35],
                'trade-mapper': [35, 60],
                'estimator': [60, 85],
                'exporter': [85, 100]
              };
              
              const [startProgress, endProgress] = progressRanges[agent.key as keyof typeof progressRanges] || [0, 0];
              const isCompleted = agentProgress > endProgress;
              const isInProgress = agentProgress >= startProgress && agentProgress <= endProgress;
              
              return (
                <div key={agent.key} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isActive ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg scale-110' 
                      : isCompleted 
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      agent.icon
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-slate-600'
                    }`}>
                      {agent.name}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">{agent.role}</div>
                    <div className="text-xs text-slate-500">{agent.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <div className="w-4 h-4">
                        <svg className="animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                    {isCompleted && (
                      <div className="text-xs text-green-600 font-medium">Completed</div>
                    )}
                    {isInProgress && !isActive && (
                      <div className="text-xs text-blue-600 font-medium">In Progress</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connection Status */}
      {workflowId && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>
              {isConnected ? 'Connected to workflow' : 'Connecting...'}
            </span>
            <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
              {workflowId.slice(-8)}
            </code>
          </div>
          
          {/* Recent Events */}
          {events.length > 0 && (
            <div className="max-h-32 overflow-y-auto">
              <div className="text-xs text-slate-500 mb-2">Recent Events:</div>
              <div className="space-y-1">
                {events.slice(-3).map((event, index) => (
                  <div key={index} className="text-xs bg-slate-50 p-2 rounded border-l-2 border-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">{event.type}</span>
                      <span className="text-slate-500">
                        {new Date(event.timestamp || '').toLocaleTimeString()}
                      </span>
                    </div>
                    {event.data.message && (
                      <div className="text-slate-600 mt-1">{event.data.message}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
