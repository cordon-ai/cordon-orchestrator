import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Trash2 } from 'lucide-react';
import { Agent } from '../../types';
import { getAgentIcon, getAgentColorStyle } from '../../utils/agentHelpers';

interface AgentCardProps {
  agent: Agent;
  index: number;
  backendConnected: boolean;
  onRemoveAgent: (agentId: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, index, backendConnected, onRemoveAgent }) => {
  const IconComponent = getAgentIcon(agent.name);

  return (
    <motion.div
      key={agent.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="card group relative"
    >
      {agent.name === 'Supervisor' && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
          <span className="text-xs text-amber-500 font-medium">Core</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <div
            className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110"
            style={{
              backgroundColor: getAgentColorStyle(agent.name).bg,
              color: getAgentColorStyle(agent.name).text
            }}
          >
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-normal text-white/90">
              {agent.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="status-indicator">
                <div className={`status-dot ${backendConnected ? 'online' : 'offline'}`} />
                <span className="text-xs">Active</span>
              </div>
            </div>
          </div>
        </div>

        {agent.name !== 'Supervisor' && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onRemoveAgent(agent.id)}
            className="btn-ghost text-red-400 hover:bg-red-400/10"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      <p className="text-sm text-white/60 mb-6 line-clamp-3 font-light leading-relaxed">
        {agent.description}
      </p>

      <div className="flex items-center justify-between text-xs text-white/40 mb-6">
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          {agent.requestCount} requests
        </span>
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          {agent.capabilities.length} capabilities
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {agent.capabilities.slice(0, 2).map((capability) => (
          <span
            key={capability}
            className="text-xs px-2 py-1 rounded-md bg-white/5 text-white/50 font-light"
          >
            {capability}
          </span>
        ))}
        {agent.capabilities.length > 2 && (
          <span className="text-xs px-2 py-1 text-white/40">
            +{agent.capabilities.length - 2} more
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default AgentCard;