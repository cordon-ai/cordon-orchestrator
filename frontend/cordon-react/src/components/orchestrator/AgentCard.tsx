import React from 'react';
import { Handle, Position } from 'reactflow';
import { Expand, Copy, CheckCircle, AlertCircle, Clock } from 'lucide-react';

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
    onExpand
  } = data;

  const getStatusIcon = (status: AgentData['status']) => {
    switch (status) {
      case 'queued': return <Clock className="w-4 h-4 text-white/60" />;
      case 'running': return <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse" />;
      case 'done': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-white/60" />;
    }
  };

  const getAgentColors = (agentName: string) => {
    const colors = [
      { bg: 'bg-emerald-500/20', border: 'border-emerald-400/30', text: 'text-emerald-400' },
      { bg: 'bg-orange-500/20', border: 'border-orange-400/30', text: 'text-orange-400' },
      { bg: 'bg-purple-500/20', border: 'border-purple-400/30', text: 'text-purple-400' },
      { bg: 'bg-indigo-500/20', border: 'border-indigo-400/30', text: 'text-indigo-400' },
      { bg: 'bg-yellow-500/20', border: 'border-yellow-400/30', text: 'text-yellow-400' },
    ];
    const colorIndex = agentName.length % colors.length;
    return colors[colorIndex];
  };

  const agentColors = getAgentColors(name);
  const firstLetter = name.charAt(0).toUpperCase();

  return (
    <div className="orchestrator-node min-w-[280px] p-5">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-white/20 !border-white/30"
      />

      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl ${agentColors.bg} border ${agentColors.border} flex items-center justify-center flex-shrink-0`}>
          <span className={`text-sm font-medium ${agentColors.text}`}>{firstLetter}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium tracking-tight truncate">{name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {getStatusIcon(status)}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-white/80 line-clamp-3 leading-relaxed">{preview}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onExpand?.(id)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-xs font-medium text-white/80 hover:text-white transition-all"
        >
          <Expand className="w-3 h-3" />
          Expand
        </button>

        {status === 'done' && (
          <button className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/20 hover:border-emerald-400/30 rounded-lg text-xs font-medium text-emerald-400 transition-all">
            <Copy className="w-3 h-3" />
            Copy
          </button>
        )}
      </div>
    </div>
  );
};

export default AgentCard;
