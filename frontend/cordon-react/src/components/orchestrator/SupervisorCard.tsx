import React from 'react';
import { Handle, Position } from 'reactflow';

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
  };
}

const SupervisorCard: React.FC<SupervisorCardProps> = ({ data }) => {
  const { tasks, isStreaming = false, prompt } = data;

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'queued': return 'rgba(255, 255, 255, 0.4)';
      case 'running': return '#60a5fa';
      case 'done': return '#34d399';
      case 'error': return '#f87171';
      default: return 'rgba(255, 255, 255, 0.4)';
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
    <div className="orchestrator-node min-w-[320px] p-6">
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-white/20 !border-white/30"
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
          <span className="text-blue-400 text-sm font-medium">S</span>
        </div>
        <div>
          <h3 className="text-white font-medium tracking-tight">Supervisor</h3>
          <p className="text-white/60 text-sm">Task Orchestrator</p>
        </div>
        {isStreaming && (
          <div className="ml-auto">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {prompt && (
          <div className="p-3 bg-gray-700 rounded-lg mb-3">
            <div className="text-xs text-gray-400 mb-1">User Request:</div>
            <div className="text-sm text-white">{prompt}</div>
          </div>
        )}
        
        {tasks.length === 0 ? (
          <div className="text-sm text-white/60 py-4 text-center">
            No tasks assigned yet...
          </div>
        ) : (
          <>
            {tasks.slice(-5).map((task, index) => (
              <div key={task.id} className="flex items-center gap-3 py-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: getStatusColor(task.status),
                    boxShadow: task.status === 'running' ? `0 0 8px ${getStatusColor(task.status)}` : 'none'
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/90 truncate font-medium">
                    {task.agent}
                  </div>
                </div>
                <div className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                  {getStatusText(task.status)}
                </div>
              </div>
            ))}
            {tasks.length > 5 && (
              <div className="text-xs text-white/50 text-center pt-2">
                +{tasks.length - 5} more tasks
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SupervisorCard;
