import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  onStopStreaming?: () => void;
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
  onStopStreaming,
  chatState,
  selectedAgent,
  backendConnected,
  sessionId
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // State for intelligent scrolling
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Check if user is near the bottom of the chat
  const isNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    
    const container = messagesContainerRef.current;
    const threshold = 100; // pixels from bottom
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    
    return distanceFromBottom <= threshold;
  }, []);

  // Handle scroll events to detect user scrolling
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const nearBottom = isNearBottom();
    setIsUserScrolling(!nearBottom);
    setShouldAutoScroll(nearBottom);
  }, [isNearBottom]);

  // Auto-scroll to bottom only when appropriate
  const scrollToBottom = useCallback((smooth: boolean = true) => {
    if (messagesEndRef.current && shouldAutoScroll) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto' 
      });
    }
  }, [shouldAutoScroll]);

  // Auto-scroll when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom(true);
    }
  }, [messages, shouldAutoScroll, scrollToBottom]);

  // Reset scroll behavior when streaming starts
  useEffect(() => {
    if (chatState === 'responding') {
      setShouldAutoScroll(true);
      setIsUserScrolling(false);
    }
  }, [chatState]);

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className="flex-1 flex flex-col h-screen relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <ChatHeader backendConnected={backendConnected} sessionId={sessionId} />

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 relative z-10"
      >
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
        onStopStreaming={onStopStreaming}
        onScrollToBottom={() => {
          setShouldAutoScroll(true);
          setIsUserScrolling(false);
          scrollToBottom(true);
        }}
        isUserScrolling={isUserScrolling}
        chatState={chatState}
        inputRef={inputRef}
      />
    </div>
  );
};

export default ChatPage;