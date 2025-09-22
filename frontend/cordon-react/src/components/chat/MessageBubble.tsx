import React from 'react';
import { motion } from 'framer-motion';
import { Message } from '../../types';
import { getAgentIcon, getAgentColorStyle } from '../../utils/agentHelpers';

interface MessageBubbleProps {
  message: Message;
  index: number;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, index }) => {
  const IconComponent = getAgentIcon(message.agentName || '');

  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`chat-bubble ${message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-agent'} max-w-2xl`}>
        {message.role === 'assistant' && message.agentName && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="agent-badge mb-3"
            style={{
              backgroundColor: getAgentColorStyle(message.agentName).bg,
              borderColor: getAgentColorStyle(message.agentName).border,
              color: getAgentColorStyle(message.agentName).text
            }}
          >
            <IconComponent className="w-5 h-5" />
            <span className="font-medium">{message.agentName}</span>
          </motion.div>
        )}
        <div className="streaming-text">
          {message.content}
          {message.isStreaming && (
            <span className="cursor-blink" />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;