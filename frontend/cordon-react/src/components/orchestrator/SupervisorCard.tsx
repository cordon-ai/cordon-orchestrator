import React from 'react';
import { Handle, Position } from 'reactflow';
import { Settings, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

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
  };
}

const SupervisorCard: React.FC<SupervisorCardProps> = ({ data }) => {
  const { tasks, isStreaming = false, prompt, functionOutput, currentStep, progress } = data;
  
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
    <div className={`orchestrator-node w-[420px] h-[280px] p-6 transition-all duration-300 overflow-hidden flex flex-col ${
      isActivelyThinking ? 'ring-1 ring-blue-400/20 shadow-lg shadow-blue-400/10' : ''
    }`} data-type="supervisor" style={{ width: '420px', height: '280px', minWidth: '420px', maxWidth: '420px', minHeight: '280px', maxHeight: '280px' }}>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-white/10 !border-white/20"
      />

      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
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
        {isActivelyThinking && (
          <div className="flex items-center gap-1.5 bg-blue-400/15 px-2 py-1 rounded-full border border-blue-400/20">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-blue-400/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1 h-1 bg-blue-400/40 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span className="text-xs text-blue-400 font-medium">
              {hasRunningTasks ? 'Processing' : 'Thinking'}
            </span>
          </div>
        )}
      </div>

      {/* Scrollable content area */}
      <div className="scrollable-content">
        <div className="space-y-3">
          <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
            <div className="text-xs text-white/40 mb-1">Request:</div>
            <div className="text-xs text-white/80 leading-relaxed break-words">
              {prompt || 'No request'}
            </div>
          </div>

          {/* Current Status/Function Output */}
          <div className={`p-3 border rounded-lg transition-all duration-300 ${
            isActivelyThinking
              ? 'bg-gradient-to-r from-blue-400/15 to-purple-400/15 border-blue-400/30 shadow-lg shadow-blue-400/10'
              : 'bg-gradient-to-r from-blue-400/10 to-purple-400/10 border-blue-400/20'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 bg-blue-400 rounded-full ${
                isActivelyThinking ? 'animate-pulse' : ''
              }`}></div>
              <span className="text-xs text-blue-400 font-medium">
                {isActivelyThinking ? 'Processing' : 'Status'}
              </span>
            </div>
            <div className="text-sm text-white/90 leading-relaxed break-words">
              {currentStep || functionOutput || 'Ready to process requests'}
            </div>
          </div>

          {/* Task Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/40 font-medium">Active Tasks ({tasks.length}):</div>
              <div className="text-xs text-white/50">
                {tasks.filter(t => t.status === 'done').length}/{tasks.length} completed
              </div>
            </div>
            
            {tasks.length > 0 ? (
              <div className="space-y-1.5">
                {tasks.map((task, index) => (
                  <div key={task.id} className="flex items-center gap-2.5 p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: getStatusColor(task.status),
                        boxShadow: task.status === 'running' ? `0 0 6px ${getStatusColor(task.status)}` : 'none'
                      }}
                    />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="text-xs text-white/80 font-medium truncate">
                        {task.agent}
                      </div>
                      {task.summary && (
                        <div className="text-xs text-white/50 mt-0.5 leading-relaxed">
                          <div className="break-words">{task.summary}</div>
                        </div>
                      )}
                    </div>
                    <div className={`flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                      task.status === 'running' ? 'bg-blue-400/20 text-blue-400' :
                      task.status === 'done' ? 'bg-emerald-400/20 text-emerald-400' :
                      task.status === 'error' ? 'bg-red-400/20 text-red-400' :
                      'bg-white/10 text-white/50'
                    }`}>
                      {getStatusText(task.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-white/50 py-4 text-center border border-dashed border-white/20 rounded-lg">
                <Settings className="w-6 h-6 text-white/30 mx-auto mb-2" />
                <div>Ready to orchestrate tasks</div>
                <div className="text-white/40 mt-1">Send a request to begin</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorCard;
