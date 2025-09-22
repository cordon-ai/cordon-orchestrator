import React from 'react';
import { motion } from 'framer-motion';
import cordonLogo from '../../cordonlogo.png';

const ChatWelcome: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full text-center"
    >
      <div className="logo-container logo-medium mb-6 shadow-lg shadow-cyan-500/20">
        <img src={cordonLogo} alt="Cordon AI" className="cordon-logo" />
      </div>
      <h3 className="text-xl font-light text-white/80 mb-2">
        Welcome to Cordon AI
      </h3>
      <p className="text-sm text-white/50 max-w-md font-light">
        Start a conversation and I'll route you to the perfect agent for your needs
      </p>
    </motion.div>
  );
};

export default ChatWelcome;