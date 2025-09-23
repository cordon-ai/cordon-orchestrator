import { useState, useRef } from 'react';
import { Message, Agent, ChatState } from '../types';
import { api } from '../services/api';

export const useChat = (sessionId: string, availableAgents: Agent[]) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const streamingRef = useRef<boolean>(false);

  const streamResponse = async (messageId: string, fullResponse: string) => {
    const words = fullResponse.split(' ');
    let currentContent = '';
    streamingRef.current = true;

    const updateMessage = (content: string, isStreaming: boolean = true) => {
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, content, isStreaming }
          : msg
      ));
    };

    // Check if this is a complete response that should be shown immediately
    const isCompleteResponse = fullResponse.length > 0 && !fullResponse.includes('...');
    const isShortMessage = words.length <= 15;
    
    // If it's a complete short response, show it immediately
    if (isCompleteResponse && isShortMessage) {
      updateMessage(fullResponse, false);
      streamingRef.current = false;
      setChatState('idle');
      inputRef.current?.focus();
      return;
    }

    // For longer messages, use adaptive streaming
    const baseDelay = isShortMessage ? 15 : 25;
    
    for (let i = 0; i < words.length; i++) {
      // Check if streaming was stopped
      if (!streamingRef.current) {
        break;
      }
      
      // Adaptive delay based on position in message
      const progress = i / words.length;
      let delay = baseDelay;
      
      // Speed up as we approach the end
      if (progress > 0.8) {
        delay = Math.max(5, baseDelay * 0.3); // Much faster near the end
      } else if (progress > 0.6) {
        delay = Math.max(8, baseDelay * 0.6); // Moderately faster
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      currentContent += (i > 0 ? ' ' : '') + words[i];
      updateMessage(currentContent);
    }

    updateMessage(currentContent, false);
    streamingRef.current = false;
    setChatState('idle');
    inputRef.current?.focus();
  };

  const stopStreaming = () => {
    streamingRef.current = false;
    setChatState('idle');
    inputRef.current?.focus();
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || chatState !== 'idle') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      agentName: null
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setChatState('selecting');
    setSelectedAgent(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const response = await api.sendMessage(currentInput, sessionId, 'user123');

      const agent = availableAgents.find(a => a.name === response.agent_name);
      setSelectedAgent(agent || null);
      setChatState('responding');

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        agentName: response.agent_name,
        isStreaming: false
      };

      setMessages(prev => [...prev, agentMessage]);

      await streamResponse(agentMessage.id, response.response);

    } catch (error) {
      console.error('Error sending message:', error);
      setChatState('idle');
    }
  };

  return {
    messages,
    inputMessage,
    setInputMessage,
    chatState,
    selectedAgent,
    sendMessage,
    stopStreaming,
    inputRef
  };
};