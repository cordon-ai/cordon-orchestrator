import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Agent } from '../../types';
import { getAgentIcon, getAgentColorStyle } from '../../utils/agentHelpers';

interface ApiKeyModalProps {
  agent: Agent | null;
  apiKeyValue: string;
  onApiKeyChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  agent,
  apiKeyValue,
  onApiKeyChange,
  onConfirm,
  onCancel
}) => {
  if (!agent) return null;

  const IconComponent = getAgentIcon(agent.name);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onCancel();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="card modal-content max-w-md w-full mx-4"
        >
          <div className="flex items-start gap-3 mb-4">
            <div
              className="p-2.5 rounded-xl"
              style={{
                backgroundColor: getAgentColorStyle(agent.name).bg,
                color: getAgentColorStyle(agent.name).text
              }}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-normal text-white/90">
                Configure {agent.name}
              </h3>
              <p className="text-sm text-white/60 mt-1 font-light">
                This agent requires authentication
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-light text-white/70 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKeyValue}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={agent.api_key_placeholder || 'Enter your API key...'}
              className="input-field w-full"
              autoFocus
            />
            <p className="text-xs text-white/40 mt-2 font-light">
              Your API key will be securely stored and used only for this agent
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCancel}
              className="btn btn-secondary px-4"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onConfirm}
              disabled={!apiKeyValue}
              className="btn btn-primary px-6"
              style={{ opacity: apiKeyValue ? 1 : 0.5 }}
            >
              Add Agent
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ApiKeyModal;