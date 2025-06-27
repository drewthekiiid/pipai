"use client";

import { useState } from "react";

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

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type TabType = 'overview' | 'chat' | 'content' | 'insights' | 'embeddings' | 'metadata';

export function ResultsDisplay({ result, file, onReset }: ResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'chat', label: 'Chat & Analysis', icon: '💬' },
    { id: 'content', label: 'Extracted Text', icon: '📄' },
    { id: 'insights', label: 'Insights', icon: '💡' },
    { id: 'embeddings', label: 'Embeddings', icon: '🔢' },
    { id: 'metadata', label: 'Metadata', icon: '🏷️' },
  ] as const;

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput,
          analysisContext: {
            summary: result.summary || '',
            insights: result.insights || [],
            extractedText: result.extractedText || '',
            analysisId: result.analysisId
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
      }

      const chatResponse = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: chatResponse.response,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const quickPrompts = [
    "Show me all trades from this construction document in CSI order",
    "Generate electrical scope of work with material takeoffs",
    "Create HVAC scope of work and quantities", 
    "Show plumbing scope and material list",
    "Generate all scopes in CSI order",
    "What are the key construction trades identified?"
  ];

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
            Successfully analyzed {file?.name || 'document'} - Ready for construction analysis
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.227-4.612 2.001 2.001 0 010-3.776A8.001 8.001 0 0121 12z" />
                </svg>
                <h3 className="font-semibold text-blue-900">Ready for Construction Analysis</h3>
              </div>
              <p className="text-blue-800 text-sm mb-3">
                Document processed successfully! Switch to the <strong>Chat & Analysis</strong> tab to generate:
              </p>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Scope of work documents by trade</li>
                <li>• Material takeoffs and quantities</li>
                <li>• CSI division breakdowns</li>
                <li>• Contract-ready specifications</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Construction Document Analysis</h3>
              <div className="text-sm text-slate-500">
                Powered by EstimAItor GPT-4o
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">Quick Analysis Prompts:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {quickPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setChatInput(prompt)}
                    className="text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-25 hover:border-blue-300 transition-colors text-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="border border-slate-200 rounded-lg h-96 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-slate-500 mt-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.227-4.612 2.001 2.001 0 010-3.776A8.001 8.001 0 0121 12z" />
                      </svg>
                    </div>
                    <p>Start by asking about the construction document analysis</p>
                    <p className="text-sm mt-1">Try: &ldquo;Show me all trades in CSI order&rdquo; or use a quick prompt above</p>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.type === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <pre className="whitespace-pre-wrap font-sans text-sm">
                          {message.content}
                        </pre>
                        <div className={`text-xs mt-1 ${
                          message.type === 'user' ? 'text-blue-100' : 'text-slate-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse flex space-x-1">
                          <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                        </div>
                        <span className="text-slate-600 text-sm">Analyzing construction document...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="border-t border-slate-200 p-4">
                <div className="flex gap-2">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about trades, scope of work, material takeoffs, CSI divisions..."
                    className="flex-1 resize-none border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim() || chatLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
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
