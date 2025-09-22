import React from 'react';
import { motion } from 'framer-motion';

interface ChatHeaderProps {
  backendConnected: boolean;
  sessionId: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ backendConnected, sessionId }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-surface border-b border-white/10 px-8 py-6 relative z-10"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-white/95 tracking-tight">
            AI Orchestrator
          </h2>
          <p className="text-sm text-white/60 mt-1 font-light">
            Intelligent routing to specialized agents
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="status-indicator">
            <div className={`status-dot ${backendConnected ? 'online' : 'offline'}`} />
            <span className="text-xs">
              {backendConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="text-xs text-white/40 font-mono">
            {sessionId}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatHeader;