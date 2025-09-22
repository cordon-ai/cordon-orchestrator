import React, { useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Message, Agent, ChatState } from '../../types';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import AgentAnimations from './AgentAnimations';
import ChatWelcome from './ChatWelcome';

interface ChatPageProps {
  messages: Message[];
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  chatState: ChatState;
  selectedAgent: Agent | null;
  backendConnected: boolean;
  sessionId: string;
}

const ChatPage: React.FC<ChatPageProps> = ({
  messages,
  inputMessage,
  onInputChange,
  onSendMessage,
  chatState,
  selectedAgent,
  backendConnected,
  sessionId
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-screen relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <ChatHeader backendConnected={backendConnected} sessionId={sessionId} />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 relative z-10">
        {messages.length === 0 && <ChatWelcome />}

        <AnimatePresence>
          {messages.map((message, index) => (
            <MessageBubble key={message.id} message={message} index={index} />
          ))}
        </AnimatePresence>

        <AgentAnimations chatState={chatState} selectedAgent={selectedAgent} />

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        inputMessage={inputMessage}
        onInputChange={onInputChange}
        onSendMessage={onSendMessage}
        chatState={chatState}
        inputRef={inputRef}
      />
    </div>
  );
};

export default ChatPage;