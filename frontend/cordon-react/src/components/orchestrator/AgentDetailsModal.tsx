import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, CheckCircle, AlertCircle, Clock, Play, Square } from 'lucide-react';
import { AgentData } from './AgentCard';

interface AgentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentData | null;
}

const AgentDetailsModal: React.FC<AgentDetailsModalProps> = ({ isOpen, onClose, agent }) => {
  const [activeTab, setActiveTab] = useState<'transcript' | 'json' | 'meta'>('transcript');
  const [copied, setCopied] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [isOpen, agent?.fullTranscript]);

  const handleCopy = async () => {
    if (!agent?.fullTranscript) return;
    
    try {
      await navigator.clipboard.writeText(agent.fullTranscript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const getStatusIcon = (status: AgentData['status']) => {
    switch (status) {
      case 'queued': return <Clock className="w-4 h-4 text-slate-500" />;
      case 'running': return <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />;
      case 'done': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusText = (status: AgentData['status']) => {
    switch (status) {
      case 'queued': return 'Queued';
      case 'running': return 'Running';
      case 'done': return 'Completed';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-[--card] border border-[--border] rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[--border]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 border border-blue-400/30 rounded-xl flex items-center justify-center">
                <span className="text-blue-400 text-lg font-medium">{agent.name.charAt(0)}</span>
              </div>
              <div>
                <h2 className="text-lg font-medium text-white tracking-tight">{agent.name}</h2>
                <div className="flex items-center gap-2">
                  {getStatusIcon(agent.status)}
                  <span className="text-sm text-white/70">{getStatusText(agent.status)}</span>
                  {agent.startTime && (
                    <span className="text-sm text-white/50">
                      • {agent.startTime.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium text-white/80 hover:text-white transition-all"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[--border]">
            <button
              onClick={() => setActiveTab('transcript')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'transcript'
                  ? 'text-blue-400'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Transcript
              {activeTab === 'transcript' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'json'
                  ? 'text-blue-400'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              JSON
              {activeTab === 'json' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('meta')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'meta'
                  ? 'text-blue-400'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Meta
              {activeTab === 'meta' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'transcript' && (
              <div
                ref={transcriptRef}
                className="h-full overflow-y-auto p-6"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", monospace' }}
              >
                {agent.fullTranscript ? (
                  <div className="bg-black/20 border border-white/10 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm text-white/90 leading-relaxed">
                      {agent.fullTranscript}
                    </pre>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-white/60">
                    <Play className="w-12 h-12 mb-4" />
                    <p>No transcript available yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'json' && (
              <div className="h-full overflow-y-auto p-6">
                {agent.structuredOutput ? (
                  <div className="bg-black/20 border border-white/10 rounded-lg p-4">
                    <pre className="text-sm text-white/90 font-mono overflow-x-auto">
                      {JSON.stringify(agent.structuredOutput, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-white/60">
                    <Square className="w-12 h-12 mb-4" />
                    <p>No structured output available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'meta' && (
              <div className="h-full overflow-y-auto p-6">
                <div className="space-y-4">
                  <div className="bg-black/20 border border-white/10 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-white mb-3">Agent Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Name:</span>
                        <span className="text-white/90">{agent.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Status:</span>
                        <span className="text-white/90 capitalize">{agent.status}</span>
                      </div>
                      {agent.startTime && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Started:</span>
                          <span className="text-white/90">{agent.startTime.toLocaleString()}</span>
                        </div>
                      )}
                      {agent.endTime && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Completed:</span>
                          <span className="text-white/90">{agent.endTime.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDetailsModal;
