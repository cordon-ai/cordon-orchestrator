import React from 'react';
import { Handle, Position } from 'reactflow';
import { Settings, CheckCircle, AlertTriangle, Clock, Brain, Square } from 'lucide-react';

export interface Task {
  id: string;
  name: string;
  agent: string;
  status: 'queued' | 'running' | 'done' | 'error';
  summary?: string;
}

interface SupervisorCardProps {
  data: {
    tasks: Task[];
    isStreaming?: boolean;
    prompt?: string;
    functionOutput?: string;
    currentStep?: string;
    progress?: {
      current: number;
      total: number;
      phase: string;
    };
    onStopThinking?: () => void;
  };
}

const SupervisorCard: React.FC<SupervisorCardProps> = ({ data }) => {
  const { tasks, isStreaming = false, prompt, functionOutput, currentStep, progress, onStopThinking } = data;
  
  // Determine if supervisor is actively thinking (has running tasks or is streaming)
  const hasRunningTasks = tasks.some(task => task.status === 'running');
  const isActivelyThinking = isStreaming || hasRunningTasks;


  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'queued': return 'rgba(255, 255, 255, 0.3)';
      case 'running': return '#60a5fa';
      case 'done': return '#34d399';
      case 'error': return '#f87171';
      default: return 'rgba(255, 255, 255, 0.3)';
    }
  };

  const getStatusText = (status: Task['status']) => {
    switch (status) {
      case 'queued': return 'queued';
      case 'running': return 'running';
      case 'done': return 'done';
      case 'error': return 'error';
      default: return 'queued';
    }
  };

  return (
    <div className={`orchestrator-node w-[420px] h-[280px] px-6 pt-6 pb-8 transition-all duration-300 overflow-hidden flex flex-col ${
      isActivelyThinking ? 'ring-1 ring-blue-400/20 shadow-lg shadow-blue-400/10' : ''
    }`} data-type="supervisor" style={{ 
      width: '420px', 
      height: '280px', 
      minWidth: '420px', 
      maxWidth: '420px', 
      minHeight: '280px', 
      maxHeight: '280px',
      contain: 'layout style size'
    }}>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-white/10 !border-white/20"
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center relative transition-all duration-300 ${
          isActivelyThinking 
            ? 'bg-blue-400/20 border border-blue-400/40 shadow-lg shadow-blue-400/20' 
            : 'bg-blue-400/10 border border-blue-400/20'
        }`}>
          <Settings className={`w-4 h-4 transition-all duration-300 ${
            isActivelyThinking ? 'text-blue-300 animate-pulse' : 'text-blue-400'
          }`} />
          {isActivelyThinking && (
            <>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 rounded-lg bg-blue-400/10 animate-ping"></div>
            </>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white/95 font-medium text-sm tracking-tight">Supervisor</h3>
          <p className="text-white/50 text-xs">
            {progress ? `${progress.phase} (${progress.current}/${progress.total})` : 'Task Orchestrator'}
          </p>
        </div>
        {isActivelyThinking && onStopThinking && (
          <button
            onClick={onStopThinking}
            className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 hover:border-red-500/60 rounded-lg transition-all duration-200 text-red-400 hover:text-red-300"
            title="Stop thinking"
          >
            <Square className="w-3 h-3" />
            <span className="text-xs font-medium">Stop</span>
          </button>
        )}
      </div>

      {/* Request Section - Scrollable */}
      <div className="mb-4 flex-shrink-0">
        <div className="p-3 bg-white/5 rounded-lg max-h-20 overflow-y-auto">
          <div className="text-xs text-white/80 mb-1">Request:</div>
          <div className="text-xs text-white/40 leading-relaxed break-words">
            {prompt || 'No request'}
          </div>
        </div>
      </div>

      {/* Current Status Section - Main Display Area */}
      <div className="flex-1 flex flex-col items-center justify-center" style={{ 
        minHeight: '120px', 
        contain: 'layout style size',
        willChange: 'auto',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}>
        {isActivelyThinking ? (
          <div className="flex flex-col items-center gap-3" style={{ 
            width: '100%', 
            maxWidth: '100%',
            contain: 'layout style size',
            willChange: 'auto'
          }}>
            {/* Animated Brain Icon with Connection */}
            <div className="relative" style={{ 
              width: '48px', 
              height: '48px', 
              flexShrink: 0,
              contain: 'layout style size',
              willChange: 'auto',
              transform: 'translateZ(0)'
            }}>
              <div className={`brain-container ${isActivelyThinking ? 'brain-thinking' : ''}`} style={{ 
                width: '100%', 
                height: '100%',
                contain: 'layout style size',
                willChange: 'transform, opacity'
              }}>
                <Brain className="w-12 h-12 text-blue-400 brain-icon-glow" style={{ 
                  width: '48px', 
                  height: '48px',
                  contain: 'layout style size',
                  willChange: 'auto'
                }} />
              </div>
              {isActivelyThinking && (
                <>
                  <div className="absolute inset-0 brain-glow" style={{ 
                    width: '48px', 
                    height: '48px',
                    contain: 'layout style size',
                    willChange: 'transform, opacity'
                  }}></div>
                  <div className="absolute inset-0 brain-pulse" style={{ 
                    width: '48px', 
                    height: '48px',
                    contain: 'layout style size',
                    willChange: 'transform, opacity'
                  }}></div>
                </>
              )}
            </div>
            
            {/* Connection Line */}
            <div className="brain-connection-line" style={{
              contain: 'layout style size',
              willChange: 'transform, opacity'
            }}></div>
            
            {/* Status Text with Processing Indicator */}
            <div className="text-center" style={{ 
              width: '100%', 
              maxWidth: '100%',
              contain: 'layout style size'
            }}>
              <div className="text-sm text-blue-400 font-medium mb-2 flex items-center justify-center gap-2">
                <span>{hasRunningTasks ? 'Processing Tasks' : 'Thinking'}</span>
                <div className="processing-dots" style={{
                  contain: 'layout style size',
                  willChange: 'auto'
                }}>
                  <span className="processing-dot" style={{
                    contain: 'layout style size',
                    willChange: 'transform, opacity'
                  }}>.</span>
                  <span className="processing-dot" style={{
                    contain: 'layout style size',
                    willChange: 'transform, opacity'
                  }}>.</span>
                  <span className="processing-dot" style={{
                    contain: 'layout style size',
                    willChange: 'transform, opacity'
                  }}>.</span>
                </div>
              </div>
              <div className="text-xs text-white/60" style={{ 
                maxWidth: '100%', 
                wordWrap: 'break-word', 
                overflowWrap: 'break-word',
                lineHeight: '1.4',
                contain: 'layout style size'
              }}>
                {currentStep || functionOutput || 'Analyzing request and planning task execution...'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center" style={{ 
            width: '100%', 
            maxWidth: '100%',
            contain: 'layout style size'
          }}>
            <div className="w-12 h-12 flex items-center justify-center" style={{ 
              flexShrink: 0,
              contain: 'layout style size'
            }}>
              <Brain className="w-8 h-8 text-blue-400" />
            </div>
            <div style={{ 
              width: '100%', 
              maxWidth: '100%',
              contain: 'layout style size'
            }}>
              <div className="text-sm text-white/90 font-medium mb-1">Ready</div>
              <div className="text-xs text-white/60">Waiting for requests</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorCard;
