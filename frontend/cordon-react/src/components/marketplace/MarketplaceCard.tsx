import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Shield } from 'lucide-react';
import { Agent } from '../../types';
import { getAgentIcon, getAgentColorStyle } from '../../utils/agentHelpers';

interface MarketplaceCardProps {
  agent: Agent;
  index: number;
  onAddAgent: (agent: Agent) => void;
}

const MarketplaceCard: React.FC<MarketplaceCardProps> = ({ agent, index, onAddAgent }) => {
  const IconComponent = getAgentIcon(agent.name);

  return (
    <motion.div
      key={agent.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="card group flex flex-col h-full"
    >
      <div className="flex-1 flex flex-col">
        <div className="flex items-start gap-3 mb-6">
          <div
            className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110"
            style={{
              backgroundColor: getAgentColorStyle(agent.name).bg,
              color: getAgentColorStyle(agent.name).text
            }}
          >
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-normal text-white/90 mb-1">
              {agent.name}
            </h3>
            <p className="text-xs text-white/50 mb-2">
              {agent.category}
            </p>
            {agent.requires_api_key && (
              <div className="flex items-center gap-1 mb-3">
                <Shield className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-amber-500">API Key Required</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-white/60 mb-6 line-clamp-3 font-light leading-relaxed">
          {agent.description}
        </p>

        <div className="mb-6">
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
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onAddAgent(agent)}
        className="btn btn-primary w-full flex items-center justify-center gap-2 mt-auto"
      >
        <Plus className="w-4 h-4" />
        Add Agent
      </motion.button>
    </motion.div>
  );
};

export default MarketplaceCard;