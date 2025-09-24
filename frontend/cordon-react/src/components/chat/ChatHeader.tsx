import React from 'react';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

interface ChatHeaderProps {
  backendConnected: boolean;
  sessionId: string;
  onShowTaskVisualization?: () => void;
  hasTasks?: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  backendConnected, 
  sessionId, 
  onShowTaskVisualization, 
  hasTasks 
}) => {
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
          {hasTasks && onShowTaskVisualization && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onShowTaskVisualization}
              className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-colors"
            >
              <Brain className="w-4 h-4" />
              <span className="text-sm font-medium">View Tasks</span>
            </motion.button>
          )}
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