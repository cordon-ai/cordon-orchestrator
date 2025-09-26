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
    <div className={`orchestrator-node w-[420px] h-[300px] px-6 pt-6 pb-10 transition-all duration-300 flex flex-col ${
      isActivelyThinking ? 'ring-1 ring-blue-400/20 shadow-lg shadow-blue-400/10' : ''
    }`} data-type="supervisor">
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-white/10 !border-white/20"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <Settings className={`w-5 h-5 transition-all duration-300 ${
          isActivelyThinking ? 'text-blue-300 animate-pulse' : 'text-blue-400'
        }`} />
        <div className="flex-1 min-w-0">
          <h3 className="text-white/95 font-medium text-lg tracking-tight">Supervisor</h3>
          <p className="text-white/50 text-sm">
            {progress ? `${progress.phase} (${progress.current}/${progress.total})` : 'Task Orchestrator'}
          </p>
        </div>
        {isActivelyThinking && onStopThinking && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onStopThinking();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent hover:bg-blue-500/10 border border-blue-400/60 hover:border-blue-400 rounded-full transition-all duration-200 text-blue-400 hover:text-blue-300 text-xs font-medium"
            title="Stop thinking"
          >
            <Square className="w-3 h-3" />
            Stop
          </button>
        )}
      </div>

      {/* Request Section - Centered */}
      <div className="mb-4 flex-shrink-0">
        <div className="p-3 bg-white/5 rounded-lg max-h-20 overflow-y-auto text-center">
          <div className="text-sm text-white/100 mb-1 font-medium">Request:</div>
          <div className="text-sm text-white/80 leading-relaxed break-words">
            {prompt || 'No request'}
          </div>
        </div>
      </div>

      {/* Current Status Section - Main Display Area */}
      <div className="flex-1 flex flex-col items-center justify-center" style={{ 
        minHeight: '80px'
      }}>
        {isActivelyThinking ? (
          <div className="flex flex-col items-center gap-2" style={{ 
            width: '100%', 
            maxWidth: '100%'
          }}>
            {/* Animated Brain Icon with Connection */}
            <div className="relative" style={{ 
              width: '48px', 
              height: '48px', 
              flexShrink: 0
            }}>
              <div className={`brain-container ${isActivelyThinking ? 'brain-thinking' : ''} rounded-full`} style={{ 
                width: '100%', 
                height: '100%'
              }}>
                <Brain className="w-12 h-12 text-blue-400 brain-icon-glow" />
              </div>
              {isActivelyThinking && (
                <>
                  <div className="absolute inset-0 brain-glow"></div>
                  <div className="absolute inset-0 brain-pulse"></div>
                </>
              )}
            </div>
            
            {/* Connection Line */}
            <div className="brain-connection-line"></div>
            
            {/* Status Text with Processing Indicator */}
            <div className="text-center" style={{ 
              width: '100%', 
              maxWidth: '100%'
            }}>
              <div className="text-base text-blue-400 font-medium mb-2 flex items-center justify-center gap-2">
                <span>{hasRunningTasks ? 'Processing Tasks' : 'Thinking'}</span>
                <div className="processing-dots">
                  <span className="processing-dot">.</span>
                  <span className="processing-dot">.</span>
                  <span className="processing-dot">.</span>
                </div>
              </div>
              <div className="text-sm text-white/60" style={{ 
                maxWidth: '100%', 
                wordWrap: 'break-word', 
                overflowWrap: 'break-word',
                lineHeight: '1.4'
              }}>
                {currentStep || functionOutput || 'Analyzing request and planning task execution...'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center" style={{ 
            width: '100%', 
            maxWidth: '100%'
          }}>
            <div className="w-12 h-12 flex items-center justify-center" style={{ 
              flexShrink: 0
            }}>
              <Brain className="w-8 h-8 text-blue-400" />
            </div>
            <div style={{ 
              width: '100%', 
              maxWidth: '100%'
            }}>
              <div className="text-base text-white/90 font-medium mb-1">Ready</div>
              <div className="text-sm text-white/60">Waiting for requests</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorCard;
