import { useState, useRef } from 'react';
import { Message, Agent, ChatState } from '../types';
import { api } from '../services/api';

export const useChat = (sessionId: string, availableAgents: Agent[]) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const streamResponse = async (messageId: string, fullResponse: string) => {
    const words = fullResponse.split(' ');
    let currentContent = '';

    const updateMessage = (content: string, isStreaming: boolean = true) => {
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, content, isStreaming }
          : msg
      ));
    };

    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      currentContent += (i > 0 ? ' ' : '') + words[i];
      updateMessage(currentContent);
    }

    updateMessage(currentContent, false);
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
    inputRef
  };
};