import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Bot, Loader2, Sparkles, Brain, Code, Search, 
  MessageSquare, Store, Users, Plus, Trash2, Settings,
  Zap, Shield, Cpu, GitBranch, Database, Globe,
  ChevronRight, Activity, PenTool, Languages
} from 'lucide-react';
import './App.css';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentName: string | null;
  isStreaming?: boolean;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  requestCount: number;
  capabilities: string[];
  requires_api_key?: boolean;
  api_key_placeholder?: string;
  agent_type?: string;
}

type ChatState = 'idle' | 'selecting' | 'responding';
type Page = 'chat' | 'marketplace' | 'agents';

const App: React.FC = () => {
  // State
  const [currentPage, setCurrentPage] = useState<Page>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [marketplaceAgents, setMarketplaceAgents] = useState<Agent[]>([]);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [sessionId] = useState(() => `session_${Math.random().toString(36).substr(2, 9)}`);
  const [apiKeyInput, setApiKeyInput] = useState<{[key: string]: string}>({});
  const [showApiKeyModal, setShowApiKeyModal] = useState<Agent | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize agents and check backend connection
  useEffect(() => {
    loadAgentsFromBackend();
    loadMarketplaceAgents();
    checkBackendConnection();
    
    // Check connection every 10 seconds
    const interval = setInterval(checkBackendConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkBackendConnection = async () => {
    try {
      const baseURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${baseURL}/api/health`);
      setBackendConnected(response.ok);
    } catch (error) {
      setBackendConnected(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Backend API integration
  const callBackendAPI = async (endpoint: string, data: any = {}, method: string = 'POST') => {
    try {
      const baseURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
      const options: RequestInit = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (method !== 'GET' && method !== 'DELETE') {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${baseURL}${endpoint}`, options);

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Backend API error:', error);
      throw error;
    }
  };

  // Load agents from backend
  const loadAgentsFromBackend = async () => {
    try {
      const baseURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${baseURL}/api/agents`);
      if (response.ok) {
        const agents = await response.json();
        setAvailableAgents(agents);
      }
    } catch (error) {
      console.error('Failed to load agents from backend:', error);
    }
  };

  // Load marketplace agents
  const loadMarketplaceAgents = async () => {
    try {
      const baseURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${baseURL}/api/marketplace`);
      if (response.ok) {
        const agents = await response.json();
        setMarketplaceAgents(agents);
      }
    } catch (error) {
      console.error('Failed to load marketplace agents:', error);
    }
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
      // Start agent selection animation
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Send message to backend
      const response = await callBackendAPI('/api/chat', {
        message: currentInput,
        session_id: sessionId,
        user_id: 'user123'
      });

      // Find the selected agent
      const agent = availableAgents.find(a => a.name === response.agent_name);
      setSelectedAgent(agent || null);
      setChatState('responding');

      // Create agent message
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        agentName: response.agent_name,
        isStreaming: false
      };

      setMessages(prev => [...prev, agentMessage]);

      // Update agent request count
      if (agent) {
        setAvailableAgents(prev => prev.map(a => 
          a.id === agent.id ? { ...a, requestCount: a.requestCount + 1 } : a
        ));
      }

      // Simulate streaming effect
      await streamResponse(agentMessage.id, response.response);

    } catch (error) {
      console.error('Error sending message:', error);
      setChatState('idle');
    }
  };

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

  const addAgentFromMarketplace = async (agent: Agent) => {
    try {
      if (agent.requires_api_key) {
        setShowApiKeyModal(agent);
        return;
      }

      await callBackendAPI('/api/agents', {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        category: agent.category,
        icon: "🤖",
        rating: 4.5,
        downloads: 0,
        capabilities: agent.capabilities,
        agent_type: agent.agent_type || "GenericLLMAgent"
      });
      
      await loadAgentsFromBackend();
      setMarketplaceAgents(prev => prev.filter(a => a.id !== agent.id));
    } catch (error) {
      console.error('Failed to add agent:', error);
    }
  };

  const addAgentWithApiKey = async (agent: Agent, apiKey: string) => {
    try {
      const agentData = {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        category: agent.category,
        icon: "🤖",
        rating: 4.5,
        downloads: 0,
        capabilities: agent.capabilities,
        agent_type: agent.agent_type || "GenericLLMAgent",
        api_key: apiKey
      };
      
      await callBackendAPI('/api/agents', agentData);
      await loadAgentsFromBackend();
      setMarketplaceAgents(prev => prev.filter(a => a.id !== agent.id));
      setShowApiKeyModal(null);
      setApiKeyInput(prev => ({ ...prev, [agent.id]: '' }));
    } catch (error) {
      console.error('Failed to add agent:', error);
    }
  };

  const removeAgent = async (agentId: string) => {
    try {
      const agent = availableAgents.find(a => a.id === agentId);
      if (agent && agent.name !== 'Supervisor') {
        await callBackendAPI(`/api/agents/${agentId}`, {}, 'DELETE');
        await loadAgentsFromBackend();
        setMarketplaceAgents(prev => [...prev, { ...agent, status: 'available' as const }]);
      }
    } catch (error) {
      console.error('Failed to remove agent:', error);
    }
  };

  const getAgentIcon = (agentName: string) => {
    switch (agentName?.toLowerCase()) {
      case 'coder':
        return <Code className="w-5 h-5" />;
      case 'researcher':
        return <Search className="w-5 h-5" />;
      case 'supervisor':
        return <Brain className="w-5 h-5" />;
      case 'writer':
        return <PenTool className="w-5 h-5" />;
      case 'data analyst':
        return <Database className="w-5 h-5" />;
      case 'designer':
        return <Sparkles className="w-5 h-5" />;
      case 'translator':
        return <Languages className="w-5 h-5" />;
      case 'openai agent':
        return <Zap className="w-5 h-5" />;
      case 'anthropic assistant':
        return <Shield className="w-5 h-5" />;
      default:
        return <Bot className="w-5 h-5" />;
    }
  };

  const getAgentColorStyle = (agentName: string) => {
    const colors: {[key: string]: {bg: string, text: string, border: string}} = {
      'coder': {
        bg: 'rgba(0, 212, 212, 0.1)',
        text: '#00d4d4',
        border: 'rgba(0, 212, 212, 0.3)'
      },
      'researcher': {
        bg: 'rgba(139, 92, 246, 0.1)',
        text: '#8b5cf6',
        border: 'rgba(139, 92, 246, 0.3)'
      },
      'supervisor': {
        bg: 'rgba(245, 158, 11, 0.1)',
        text: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.3)'
      },
      'writer': {
        bg: 'rgba(239, 68, 68, 0.1)',
        text: '#ef4444',
        border: 'rgba(239, 68, 68, 0.3)'
      },
      'data analyst': {
        bg: 'rgba(249, 115, 22, 0.1)',
        text: '#f97316',
        border: 'rgba(249, 115, 22, 0.3)'
      },
      'designer': {
        bg: 'rgba(236, 72, 153, 0.1)',
        text: '#ec4899',
        border: 'rgba(236, 72, 153, 0.3)'
      },
      'translator': {
        bg: 'rgba(34, 197, 94, 0.1)',
        text: '#22c55e',
        border: 'rgba(34, 197, 94, 0.3)'
      }
    };

    const defaultColor = {
      bg: 'rgba(100, 100, 100, 0.1)',
      text: '#9ca3af',
      border: 'rgba(100, 100, 100, 0.3)'
    };

    return colors[agentName?.toLowerCase()] || defaultColor;
  };

  const renderChatPage = () => {
    const colorStyle = getAgentColorStyle(selectedAgent?.name || '');
    
    return (
      <div className="flex-1 flex flex-col h-screen relative">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

      {/* Chat Header */}
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

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 relative z-10">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <div className="gradient-primary w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/20">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-light text-white/80 mb-2">
                Welcome to Cordon AI
              </h3>
              <p className="text-sm text-white/50 max-w-md font-light">
                Start a conversation and I'll route you to the perfect agent for your needs
              </p>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((message, index) => (
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
                    {getAgentIcon(message.agentName)}
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
          ))}
        </AnimatePresence>

        {/* Agent Selection Animation */}
        <AnimatePresence>
          {chatState === 'selecting' && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-center"
              >
                <div className="agent-selection-animation">
                  <Brain className="w-5 h-5 animate-pulse text-cyan-400" />
                  <span className="text-sm font-light">Analyzing request...</span>
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agent Response Animation */}
        <AnimatePresence>
          {chatState === 'responding' && selectedAgent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
                className="flex justify-start"
              >
                <div 
                  className="agent-selection-animation"
                  style={{
                    backgroundColor: getAgentColorStyle(selectedAgent.name).bg,
                    borderColor: getAgentColorStyle(selectedAgent.name).border
                  }}
                >
                  <div style={{ color: getAgentColorStyle(selectedAgent.name).text }}>
                {getAgentIcon(selectedAgent.name)}
                  </div>
                  <span className="text-sm font-light text-white/80">
                    {selectedAgent.name} is typing
                  </span>
                <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

        {/* Input Area */}
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
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask anything... I'll find the right agent for you"
              className="input-field flex-1"
              disabled={chatState !== 'idle'}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            onClick={sendMessage}
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
    </div>
  );
  };

  const renderMarketplacePage = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8"
    >
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-light text-white/95 mb-2 tracking-tight">
        Agent Marketplace
      </h2>
        <p className="text-base text-white/60 font-light">
          Discover and integrate specialized AI agents
      </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {marketplaceAgents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              className="card group"
            >
              <div className="flex items-start gap-3 mb-4">
                <div 
                  className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: getAgentColorStyle(agent.name).bg,
                    color: getAgentColorStyle(agent.name).text
                  }}
                >
                {getAgentIcon(agent.name)}
              </div>
                <div className="flex-1">
                  <h3 className="text-base font-normal text-white/90">
                  {agent.name}
                </h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    {agent.category}
                  </p>
                  {agent.requires_api_key && (
                    <div className="flex items-center gap-1 mt-2">
                      <Shield className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-amber-500">API Key Required</span>
                    </div>
                  )}
              </div>
            </div>
            
              <p className="text-sm text-white/60 mb-4 line-clamp-2 font-light">
              {agent.description}
            </p>
            
              <div className="mb-4">
                <div className="flex flex-wrap gap-1.5">
                  {agent.capabilities.slice(0, 3).map((capability) => (
                  <span
                    key={capability}
                      className="text-xs px-2 py-1 rounded-md bg-white/5 text-white/50 font-light"
                  >
                    {capability}
                  </span>
                ))}
                  {agent.capabilities.length > 3 && (
                    <span className="text-xs px-2 py-1 text-white/40">
                      +{agent.capabilities.length - 3} more
                    </span>
                  )}
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addAgentFromMarketplace(agent)}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Agent
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
            </div>
            
      {/* API Key Modal */}
      <AnimatePresence>
        {showApiKeyModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowApiKeyModal(null);
                setApiKeyInput(prev => ({ ...prev, [showApiKeyModal.id]: '' }));
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card modal-content max-w-md w-full mx-4"
            >
              <div className="flex items-start gap-3 mb-4">
                <div 
                  className="p-2.5 rounded-xl"
                  style={{
                    backgroundColor: getAgentColorStyle(showApiKeyModal.name).bg,
                    color: getAgentColorStyle(showApiKeyModal.name).text
                  }}
                >
                  {getAgentIcon(showApiKeyModal.name)}
                </div>
                <div>
                  <h3 className="text-lg font-normal text-white/90">
                    Configure {showApiKeyModal.name}
                  </h3>
                  <p className="text-sm text-white/60 mt-1 font-light">
                    This agent requires authentication
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-light text-white/70 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput[showApiKeyModal.id] || ''}
                  onChange={(e) => setApiKeyInput(prev => ({ ...prev, [showApiKeyModal.id]: e.target.value }))}
                  placeholder={showApiKeyModal.api_key_placeholder || 'Enter your API key...'}
                  className="input-field w-full"
                  autoFocus
                />
                <p className="text-xs text-white/40 mt-2 font-light">
                  Your API key will be securely stored and used only for this agent
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowApiKeyModal(null);
                    setApiKeyInput(prev => ({ ...prev, [showApiKeyModal.id]: '' }));
                  }}
                  className="btn btn-secondary px-4"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addAgentWithApiKey(showApiKeyModal, apiKeyInput[showApiKeyModal.id] || '')}
                  disabled={!apiKeyInput[showApiKeyModal.id]}
                  className="btn btn-primary px-6"
                  style={{ opacity: apiKeyInput[showApiKeyModal.id] ? 1 : 0.5 }}
                >
              Add Agent
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderAgentsPage = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8"
    >
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-light text-white/95 mb-2 tracking-tight">
          Active Agents
      </h2>
        <p className="text-base text-white/60 font-light">
          Manage your integrated AI agents
      </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {availableAgents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              className="card group relative"
            >
              {agent.name === 'Supervisor' && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                  <span className="text-xs text-amber-500 font-medium">Core</span>
                </div>
              )}
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div 
                    className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110"
                    style={{
                      backgroundColor: getAgentColorStyle(agent.name).bg,
                      color: getAgentColorStyle(agent.name).text
                    }}
                  >
                  {getAgentIcon(agent.name)}
                </div>
                <div>
                    <h3 className="text-base font-normal text-white/90">
                    {agent.name}
                  </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="status-indicator">
                        <div className={`status-dot ${backendConnected ? 'online' : 'offline'}`} />
                        <span className="text-xs">Active</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {agent.name !== 'Supervisor' && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  onClick={() => removeAgent(agent.id)}
                    className="btn-ghost text-red-400 hover:bg-red-400/10"
                >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
              )}
            </div>
            
              <p className="text-sm text-white/60 mb-4 line-clamp-2 font-light">
              {agent.description}
            </p>
            
              <div className="flex items-center justify-between text-xs text-white/40 mb-4">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {agent.requestCount} requests
                </span>
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  {agent.capabilities.length} capabilities
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {agent.capabilities.slice(0, 2).map((capability) => (
                  <span
                    key={capability}
                    className="text-xs px-2 py-1 rounded-md bg-white/5 text-white/50 font-light"
                  >
                    {capability}
                  </span>
                ))}
                {agent.capabilities.length > 2 && (
                  <span className="text-xs px-2 py-1 text-white/40">
                    +{agent.capabilities.length - 2} more
                  </span>
                )}
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 flex">
      {/* Sidebar */}
      <motion.div 
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        className="sidebar w-72 flex flex-col fixed h-screen z-20"
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="gradient-primary w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-light text-white/95 tracking-tight">
                Cordon AI
              </h1>
              <p className="text-xs text-white/50 font-light">
                Multi-Agent Orchestrator
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
            <button
              onClick={() => setCurrentPage('chat')}
            className={`nav-item w-full ${currentPage === 'chat' ? 'active' : ''}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat Interface</span>
            {currentPage === 'chat' && (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
            </button>
            
            <button
              onClick={() => setCurrentPage('marketplace')}
            className={`nav-item w-full ${currentPage === 'marketplace' ? 'active' : ''}`}
          >
            <Store className="w-4 h-4" />
            <span>Marketplace</span>
            {currentPage === 'marketplace' && (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
            </button>
            
            <button
              onClick={() => setCurrentPage('agents')}
            className={`nav-item w-full ${currentPage === 'agents' ? 'active' : ''}`}
          >
            <Users className="w-4 h-4" />
            <span>Active Agents</span>
            {currentPage === 'agents' && (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
            </button>
          </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <div className={`status-dot ${backendConnected ? 'online' : 'offline'}`} />
            <span>System {backendConnected ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 main-content">
        {currentPage === 'chat' && renderChatPage()}
        {currentPage === 'marketplace' && renderMarketplacePage()}
        {currentPage === 'agents' && renderAgentsPage()}
      </div>
    </div>
  );
};

export default App;