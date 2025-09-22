import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain } from 'lucide-react';
import { Agent, ChatState } from '../../types';
import { getAgentIcon, getAgentColorStyle } from '../../utils/agentHelpers';

interface AgentAnimationsProps {
  chatState: ChatState;
  selectedAgent: Agent | null;
}

const AgentAnimations: React.FC<AgentAnimationsProps> = ({ chatState, selectedAgent }) => {
  const IconComponent = selectedAgent ? getAgentIcon(selectedAgent.name) : Brain;

  return (
    <>
      {/* Agent Selection Animation */}
      <AnimatePresence>
        {chatState === 'selecting' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex justify-center"
          >
            <div className="agent-selection-animation">
              <Brain className="w-5 h-5 animate-pulse text-cyan-400" />
              <span className="text-sm font-light">Analyzing request...</span>
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Response Animation */}
      <AnimatePresence>
        {chatState === 'responding' && selectedAgent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex justify-start"
          >
            <div
              className="agent-selection-animation"
              style={{
                backgroundColor: getAgentColorStyle(selectedAgent.name).bg,
                borderColor: getAgentColorStyle(selectedAgent.name).border
              }}
            >
              <div style={{ color: getAgentColorStyle(selectedAgent.name).text }}>
                <IconComponent className="w-5 h-5" />
              </div>
              <span className="text-sm font-light text-white/80">
                {selectedAgent.name} is typing
              </span>
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AgentAnimations;