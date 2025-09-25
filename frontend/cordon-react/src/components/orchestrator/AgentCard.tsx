import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Expand, Copy, CheckCircle, AlertCircle, Clock, Zap, Brain } from 'lucide-react';

export interface AgentData {
  id: string;
  name: string;
  status: 'queued' | 'running' | 'done' | 'error';
  preview: string;
  fullTranscript?: string;
  structuredOutput?: any;
  startTime?: Date;
  endTime?: Date;
  onExpand?: (agentId: string) => void;
  isNewSpawn?: boolean;
  processing_started?: string;
  duration?: number;
  taskDescription?: string;
  progress?: {
    current: number;
    total: number;
    phase: string;
  };
}

interface AgentCardProps {
  data: AgentData;
}

const AgentCard: React.FC<AgentCardProps> = ({ data }) => {
  const {
    id,
    name,
    status,
    preview,
    onExpand,
    isNewSpawn = false,
    processing_started,
    duration,
    taskDescription,
    progress
  } = data;

  const [isSpawning, setIsSpawning] = useState(isNewSpawn);
  const [processingTime, setProcessingTime] = useState(0);

  // Handle spawn animation
  useEffect(() => {
    if (isNewSpawn) {
      setIsSpawning(true);
      setTimeout(() => setIsSpawning(false), 500);
    }
  }, [isNewSpawn]);

  // Track processing time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'running' && processing_started) {
      interval = setInterval(() => {
        const elapsed = Math.floor((new Date().getTime() - new Date(processing_started).getTime()) / 1000);
        setProcessingTime(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, processing_started]);

  const getStatusIcon = (status: AgentData['status']) => {
    switch (status) {
      case 'queued': return <Clock className="w-3.5 h-3.5 text-white/40" />;
      case 'running': return <Brain className="w-3.5 h-3.5 text-blue-400 animate-pulse" />;
      case 'done': return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'error': return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-white/40" />;
    }
  };

  const getStatusGlow = (status: AgentData['status']) => {
    switch (status) {
      case 'running': return 'shadow-blue-400/30';
      case 'done': return 'shadow-emerald-400/30';
      case 'error': return 'shadow-red-400/30';
      default: return '';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getAgentColors = (agentName: string) => {
    const colors = [
      { bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', text: 'text-emerald-400' },
      { bg: 'bg-blue-400/10', border: 'border-blue-400/20', text: 'text-blue-400' },
      { bg: 'bg-purple-400/10', border: 'border-purple-400/20', text: 'text-purple-400' },
      { bg: 'bg-orange-400/10', border: 'border-orange-400/20', text: 'text-orange-400' },
      { bg: 'bg-pink-400/10', border: 'border-pink-400/20', text: 'text-pink-400' },
    ];
    const colorIndex = agentName.length % colors.length;
    return colors[colorIndex];
  };

  const agentColors = getAgentColors(name);
  const firstLetter = name.charAt(0).toUpperCase();

  return (
    <div className={`orchestrator-node w-[280px] h-[200px] p-4 transition-all duration-500 overflow-hidden ${
      isSpawning ? 'scale-95 opacity-70' : 'scale-100 opacity-100'
    } ${status === 'running' ? `shadow-lg ${getStatusGlow(status)}` : ''}`} data-type="agent">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-white/10 !border-white/20"
      />

      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 flex items-start gap-3 mb-3">
          <div className={`w-8 h-8 rounded-lg ${agentColors.bg} border ${agentColors.border} flex items-center justify-center flex-shrink-0 relative ${
            status === 'running' ? 'animate-pulse' : ''
          }`}>
            <span className={`text-xs font-medium ${agentColors.text}`}>{firstLetter}</span>
            {status === 'running' && (
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white/95 font-medium text-sm tracking-tight truncate">{name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              {getStatusIcon(status)}
              <span className="text-xs text-white/50 capitalize font-medium">{status}</span>
              {status === 'running' && processingTime > 0 && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="text-xs text-blue-400 font-mono">{formatTime(processingTime)}</span>
                </>
              )}
              {status === 'done' && duration && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="text-xs text-emerald-400 font-mono">{formatTime(duration)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col space-y-2">
          {taskDescription && (
            <div className="flex-shrink-0 p-2 bg-white/5 border border-white/10 rounded-md">
              <div className="text-xs text-white/40 mb-1">Task:</div>
              <div className="text-xs text-white/70 leading-relaxed">
                <div className="max-h-8 overflow-y-auto break-words">{taskDescription}</div>
              </div>
            </div>
          )}

          {progress && status === 'running' && (
            <div className="flex-shrink-0 p-2 bg-blue-400/10 border border-blue-400/20 rounded-md">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-blue-400 font-medium">{progress.phase}</div>
                <div className="text-xs text-blue-400">{progress.current}/{progress.total}</div>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className={`flex-1 min-h-0 p-2.5 rounded-md border ${
            status === 'running' ? 'bg-blue-400/5 border-blue-400/20' :
            status === 'done' ? 'bg-emerald-400/5 border-emerald-400/20' :
            status === 'error' ? 'bg-red-400/5 border-red-400/20' :
            'bg-white/5 border-white/10'
          }`}>
            <div className="text-xs text-white/40 mb-1">
              {status === 'running' ? 'Processing:' :
               status === 'done' ? 'Result:' :
               status === 'error' ? 'Error:' : 'Status:'}
            </div>
            <div className="text-xs text-white/70 leading-relaxed h-full overflow-y-auto break-words">{preview}</div>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-1.5 mt-2">
        <button
          onClick={() => onExpand?.(id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md text-xs font-medium transition-all duration-200 ${
            status === 'running'
              ? 'bg-blue-400/10 hover:bg-blue-400/20 border-blue-400/30 text-blue-400 hover:text-blue-300'
              : status === 'done'
              ? 'bg-emerald-400/10 hover:bg-emerald-400/20 border-emerald-400/30 text-emerald-400 hover:text-emerald-300'
              : status === 'error'
              ? 'bg-red-400/10 hover:bg-red-400/20 border-red-400/30 text-red-400 hover:text-red-300'
              : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-white/70 hover:text-white/90'
          }`}
        >
          <Expand className="w-3 h-3" />
          View Details
        </button>

        {status === 'done' && (
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 hover:border-emerald-400/40 rounded-md text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-all duration-200">
            <Copy className="w-3 h-3" />
            Copy
          </button>
        )}

        {status === 'running' && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-400/10 rounded-md">
            <Zap className="w-3 h-3 text-blue-400 animate-pulse" />
            <span className="text-xs text-blue-400 font-medium">Active</span>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default AgentCard;
