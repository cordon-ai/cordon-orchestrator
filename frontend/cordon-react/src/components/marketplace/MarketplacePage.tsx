import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Agent } from '../../types';
import MarketplaceCard from './MarketplaceCard';
import ApiKeyModal from './ApiKeyModal';

interface MarketplacePageProps {
  marketplaceAgents: Agent[];
  onAddAgent: (agent: Agent) => void;
  showApiKeyModal: Agent | null;
  apiKeyInput: string;
  onApiKeyChange: (value: string) => void;
  onApiKeyConfirm: () => void;
  onApiKeyCancel: () => void;
}

const MarketplacePage: React.FC<MarketplacePageProps> = ({
  marketplaceAgents,
  onAddAgent,
  showApiKeyModal,
  apiKeyInput,
  onApiKeyChange,
  onApiKeyConfirm,
  onApiKeyCancel
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 bg-black min-h-full"
    >
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-light text-white/95 mb-2 tracking-tight">
          Agent Marketplace
        </h2>
        <p className="text-base text-white/60 font-light">
          Discover and integrate specialized AI agents
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        <AnimatePresence>
          {marketplaceAgents.map((agent, index) => (
            <MarketplaceCard
              key={agent.id}
              agent={agent}
              index={index}
              onAddAgent={onAddAgent}
            />
          ))}
        </AnimatePresence>
      </div>

      <ApiKeyModal
        agent={showApiKeyModal}
        apiKeyValue={apiKeyInput}
        onApiKeyChange={onApiKeyChange}
        onConfirm={onApiKeyConfirm}
        onCancel={onApiKeyCancel}
      />
    </motion.div>
  );
};

export default MarketplacePage;