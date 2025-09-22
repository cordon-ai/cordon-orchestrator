import React from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { ChatState } from '../../types';

interface ChatInputProps {
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  chatState: ChatState;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  onInputChange,
  onSendMessage,
  chatState,
  inputRef
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSendMessage();
    }
  };

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
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSendMessage}
          disabled={!inputMessage.trim() || chatState !== 'idle'}
          className="btn btn-primary px-6 flex items-center gap-2"
          style={{ opacity: chatState === 'idle' && inputMessage.trim() ? 1 : 0.5 }}
        >
          {chatState === 'idle' ? (
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