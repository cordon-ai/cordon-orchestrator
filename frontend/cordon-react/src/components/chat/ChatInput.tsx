import React from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Square, ChevronDown } from 'lucide-react';
import { ChatState } from '../../types';

interface ChatInputProps {
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onStopStreaming?: () => void;
  onScrollToBottom?: () => void;
  isUserScrolling?: boolean;
  chatState: ChatState;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  onInputChange,
  onSendMessage,
  onStopStreaming,
  onScrollToBottom,
  isUserScrolling,
  chatState,
  inputRef
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && chatState === 'idle') {
      onSendMessage();
    }
  };

  const isStreaming = chatState === 'responding';
  const canSend = chatState === 'idle' && inputMessage.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-surface border-t border-white/10 px-6 py-4 relative z-10"
    >
      <div className="flex gap-3 w-full">
        <input
          ref={inputRef}
          type="text"
          value={inputMessage}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask anything... I'll find the right agent for you"
          className="input-field flex-1"
          disabled={chatState !== 'idle'}
        />
        
        {/* Scroll to Bottom Button */}
        {isUserScrolling && onScrollToBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onScrollToBottom}
            className="btn btn-secondary px-3 flex items-center gap-2"
            style={{
              backgroundColor: 'var(--cordon-secondary)',
              boxShadow: '0 2px 4px rgba(139, 92, 246, 0.2)'
            }}
          >
            <ChevronDown className="w-4 h-4" />
            <span className="hidden sm:inline">Scroll</span>
          </motion.button>
        )}
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={isStreaming ? onStopStreaming : onSendMessage}
          disabled={!canSend && !isStreaming}
          className={`btn px-6 flex items-center gap-2 ${
            isStreaming 
              ? 'btn-secondary' 
              : 'btn-primary'
          }`}
          style={{ 
            opacity: (canSend || isStreaming) ? 1 : 0.5 
          }}
        >
          {isStreaming ? (
            <>
              <Square className="w-4 h-4" />
              <span className="hidden sm:inline">Stop</span>
            </>
          ) : chatState === 'idle' ? (
            <>
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </>
          ) : (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ChatInput;