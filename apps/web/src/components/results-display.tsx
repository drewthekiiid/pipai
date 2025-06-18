"use client";

import React, { useState } from "react";

interface AnalysisResult {
  analysisId: string;
  status: 'success' | 'failed' | 'canceled';
  extractedText?: string;
  summary?: string;
  insights?: string[];
  embeddings?: number[];
  metadata?: Record<string, unknown>;
  error?: string;
}

interface ResultsDisplayProps {
  result: AnalysisResult;
  file: File | null;
  onReset: () => void;
}

type TabType = 'overview' | 'content' | 'insights' | 'embeddings' | 'metadata';

export function ResultsDisplay({ result, file, onReset }: ResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'content', label: 'Extracted Text', icon: '📄' },
    { id: 'insights', label: 'Insights', icon: '💡' },
    { id: 'embeddings', label: 'Embeddings', icon: '🔢' },
    { id: 'metadata', label: 'Metadata', icon: '🏷️' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-green-900 flex items-center gap-2">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Analysis Complete
          </h2>
          <p className="text-green-700">
            Successfully analyzed {file?.name || 'document'}
          </p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Analyze Another
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-900">{result.insights?.length || 0}</div>
                <div className="text-blue-700 text-sm">Key Insights</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-900">
                  {result.extractedText?.split(' ').length || 0}
                </div>
                <div className="text-green-700 text-sm">Words Extracted</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-900">
                  {result.embeddings?.length || 0}
                </div>
                <div className="text-purple-700 text-sm">Embedding Dimensions</div>
              </div>
            </div>

            {result.summary && (
              <div className="bg-slate-50 rounded-lg p-6">
                <h3 className="font-semibold text-slate-900 mb-3">AI Summary</h3>
                <p className="text-slate-700 leading-relaxed">{result.summary}</p>
              </div>
            )}

            {result.insights && result.insights.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Top Insights</h3>
                <div className="space-y-2">
                  {result.insights.slice(0, 3).map((insight, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                        {index + 1}
                      </div>
                      <p className="text-slate-700 flex-1">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Extracted Text Content</h3>
            <div className="bg-slate-50 rounded-lg p-6 border">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono leading-relaxed max-h-96 overflow-y-auto">
                {result.extractedText || 'No text content extracted.'}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Detailed Insights</h3>
            {result.insights && result.insights.length > 0 ? (
              <div className="space-y-3">
                {result.insights.map((insight, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {index + 1}
                      </div>
                      <p className="text-slate-700 flex-1">{insight}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic">No insights generated.</p>
            )}
          </div>
        )}

        {activeTab === 'embeddings' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Vector Embeddings</h3>
            {result.embeddings && result.embeddings.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-lg font-semibold text-blue-900">
                    {result.embeddings.length} dimensions
                  </div>
                  <div className="text-blue-700 text-sm">
                    High-dimensional vector representation of document content
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Sample Values</h4>
                  <div className="grid grid-cols-8 gap-2 text-xs font-mono">
                    {result.embeddings.slice(0, 32).map((value, index) => (
                      <div key={index} className="bg-white p-2 rounded text-center border">
                        {value.toFixed(3)}
                      </div>
                    ))}
                  </div>
                  {result.embeddings.length > 32 && (
                    <p className="text-slate-500 text-xs mt-2">
                      Showing first 32 of {result.embeddings.length} dimensions
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 italic">No embeddings generated.</p>
            )}
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Document Metadata</h3>
            <div className="bg-slate-50 rounded-lg p-6">
              <pre className="text-sm text-slate-700 font-mono whitespace-pre-wrap">
                {JSON.stringify(result.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Download/Export Options */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Download Report
        </button>
        <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
          Export JSON
        </button>
        <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
          Share Results
        </button>
      </div>
    </div>
  );
}
