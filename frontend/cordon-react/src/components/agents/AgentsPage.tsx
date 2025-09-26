import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Agent } from '../../types';
import AgentCard from './AgentCard';

interface AgentsPageProps {
  availableAgents: Agent[];
  backendConnected: boolean;
  onRemoveAgent: (agentId: string) => void;
}

const AgentsPage: React.FC<AgentsPageProps> = ({
  availableAgents,
  backendConnected,
  onRemoveAgent
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 bg-black min-h-full"
    >
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-light text-white/95 mb-2 tracking-tight">
          Active Agents
        </h2>
        <p className="text-base text-white/60 font-light">
          Manage your integrated AI agents
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        <AnimatePresence>
          {availableAgents.map((agent, index) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              index={index}
              backendConnected={backendConnected}
              onRemoveAgent={onRemoveAgent}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default AgentsPage;