import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, Loader2, Sparkles, Brain, Code, Search, MessageSquare, Store, Users, Plus, Trash2, Settings } from 'lucide-react';
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
  type: string;
  status: string;
  requestCount: number;
  capabilities: string[];
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
  const [ollamaConnected, setOllamaConnected] = useState<boolean>(false);
  const [sessionId] = useState(() => `session_${Math.random().toString(36).substr(2, 9)}`);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize agents and check backend connection
  useEffect(() => {
    loadAgentsFromBackend();
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const baseURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${baseURL}/api/health`);
      setOllamaConnected(response.ok);
    } catch (error) {
      setOllamaConnected(false);
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
  };

  const addAgentFromMarketplace = async (agent: Agent) => {
    try {
      await callBackendAPI('/api/agents', {
        name: agent.name,
        description: agent.description,
        type: agent.type,
        capabilities: agent.capabilities
      });
      // Reload agents from backend
      await loadAgentsFromBackend();
      // Remove from marketplace
      setMarketplaceAgents(prev => prev.filter(a => a.id !== agent.id));
    } catch (error) {
      console.error('Failed to add agent:', error);
    }
  };

  const removeAgent = async (agentId: string) => {
    try {
      const agent = availableAgents.find(a => a.id === agentId);
      if (agent && agent.name !== 'Supervisor') {
        await callBackendAPI(`/api/agents/${agentId}`, {}, 'DELETE');
        // Reload agents from backend
        await loadAgentsFromBackend();
        // Add back to marketplace
        setMarketplaceAgents(prev => [...prev, { ...agent, status: 'available' as const }]);
      }
    } catch (error) {
      console.error('Failed to remove agent:', error);
    }
  };

  const getAgentIcon = (agentName: string) => {
    switch (agentName?.toLowerCase()) {
      case 'coder':
        return <Code style={{ width: '1.25rem', height: '1.25rem' }} />;
      case 'researcher':
        return <Search style={{ width: '1.25rem', height: '1.25rem' }} />;
      case 'supervisor':
        return <Brain style={{ width: '1.25rem', height: '1.25rem' }} />;
      case 'writer':
        return <MessageSquare style={{ width: '1.25rem', height: '1.25rem' }} />;
      case 'data analyst':
        return <Settings style={{ width: '1.25rem', height: '1.25rem' }} />;
      case 'designer':
        return <Sparkles style={{ width: '1.25rem', height: '1.25rem' }} />;
      case 'translator':
        return <MessageSquare style={{ width: '1.25rem', height: '1.25rem' }} />;
      default:
        return <Bot style={{ width: '1.25rem', height: '1.25rem' }} />;
    }
  };

  const getAgentColorStyle = (agentName: string) => {
    switch (agentName?.toLowerCase()) {
      case 'coder':
        return { color: '#059669', backgroundColor: '#dcfce7' };
      case 'researcher':
        return { color: '#2563eb', backgroundColor: '#dbeafe' };
      case 'supervisor':
        return { color: '#7c3aed', backgroundColor: '#ede9fe' };
      case 'writer':
        return { color: '#dc2626', backgroundColor: '#fee2e2' };
      case 'data analyst':
        return { color: '#ea580c', backgroundColor: '#fed7aa' };
      case 'designer':
        return { color: '#db2777', backgroundColor: '#fce7f3' };
      case 'translator':
        return { color: '#0891b2', backgroundColor: '#cffafe' };
      default:
        return { color: '#6b7280', backgroundColor: '#f3f4f6' };
    }
  };

  const renderChatPage = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Chat Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
          Chat with Orchestrator
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>
          Ask questions and get routed to the right agent
        </p>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
          Session: {sessionId}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}
            >
              <div className={`chat-bubble ${message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-agent'}`}>
                {message.role === 'assistant' && message.agentName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500', width: 'fit-content', ...getAgentColorStyle(message.agentName) }}>
                    {getAgentIcon(message.agentName)}
                    <span>{message.agentName}</span>
                  </div>
                )}
                <div className="streaming-text">
                  {message.content}
                  {message.isStreaming && (
                    <span style={{ display: 'inline-block', width: '0.125rem', height: '1.25rem', backgroundColor: '#3b82f6', marginLeft: '0.25rem' }} className="animate-blink"></span>
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
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{ display: 'flex', justifyContent: 'center' }}
            >
              <div className="agent-selection-animation" style={{ padding: '0.75rem 1rem', borderRadius: '1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <Brain style={{ width: '1.25rem', height: '1.25rem' }} className="animate-pulse" />
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Supervisor is selecting the best agent...</span>
                <Loader2 style={{ width: '1rem', height: '1rem' }} className="animate-spin" />
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
              style={{ display: 'flex', justifyContent: 'center' }}
            >
              <div className="agent-selection-animation" style={{ padding: '0.75rem 1rem', borderRadius: '1rem', border: '1px solid #e5e7eb', ...getAgentColorStyle(selectedAgent.name) }}>
                {getAgentIcon(selectedAgent.name)}
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{selectedAgent.name} is responding...</span>
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
                  <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid #e5e7eb', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me anything... (e.g., 'Help me write Python code' or 'Research AI trends')"
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.75rem', outline: 'none', fontSize: '1rem' }}
              disabled={chatState !== 'idle'}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || chatState !== 'idle'}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.75rem', border: 'none', cursor: chatState === 'idle' ? 'pointer' : 'not-allowed', opacity: chatState === 'idle' ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {chatState === 'idle' ? (
              <Send style={{ width: '1.25rem', height: '1.25rem' }} />
            ) : (
              <Loader2 style={{ width: '1.25rem', height: '1.25rem' }} className="animate-spin" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderMarketplacePage = () => (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
        Agent Marketplace
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Browse and add new agents to your orchestrator
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {marketplaceAgents.map((agent) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '0.5rem', ...getAgentColorStyle(agent.name) }}>
                {getAgentIcon(agent.name)}
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  {agent.name}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                  {agent.type}
                </p>
              </div>
            </div>
            
            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.75rem' }}>
              {agent.description}
            </p>
            
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Capabilities:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {agent.capabilities.map((capability) => (
                  <span
                    key={capability}
                    style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem', backgroundColor: '#f3f4f6', color: '#374151', borderRadius: '0.375rem' }}
                  >
                    {capability}
                  </span>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => addAgentFromMarketplace(agent)}
              style={{ width: '100%', padding: '0.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Plus style={{ width: '1rem', height: '1rem' }} />
              Add Agent
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderAgentsPage = () => (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
        Current Agents
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Manage your active agents
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {availableAgents.map((agent) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: '0.5rem', ...getAgentColorStyle(agent.name) }}>
                  {getAgentIcon(agent.name)}
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                    {agent.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <div style={{ width: '0.375rem', height: '0.375rem', backgroundColor: ollamaConnected ? '#10b981' : '#ef4444', borderRadius: '50%' }}></div>
                      <span>{ollamaConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                    <span>•</span>
                    <span>{agent.requestCount} requests</span>
                  </div>
                </div>
              </div>
              
              {agent.name !== 'Supervisor' && (
                <button
                  onClick={() => removeAgent(agent.id)}
                  style={{ padding: '0.25rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                >
                  <Trash2 style={{ width: '1rem', height: '1rem' }} />
                </button>
              )}
            </div>
            
            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.75rem' }}>
              {agent.description}
            </p>
            
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Capabilities:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {agent.capabilities.map((capability) => (
                  <span
                    key={capability}
                    style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem', backgroundColor: '#f3f4f6', color: '#374151', borderRadius: '0.375rem' }}
                  >
                    {capability}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="gradient-bg" style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles style={{ width: '1rem', height: '1rem', color: 'white' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Cordon AI</h1>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Multi-Agent Orchestrator</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, padding: '1rem' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <button
              onClick={() => setCurrentPage('chat')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: currentPage === 'chat' ? '#3b82f6' : 'transparent',
                color: currentPage === 'chat' ? 'white' : '#6b7280',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <MessageSquare style={{ width: '1rem', height: '1rem' }} />
              Chat Interface
            </button>
            
            <button
              onClick={() => setCurrentPage('marketplace')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: currentPage === 'marketplace' ? '#3b82f6' : 'transparent',
                color: currentPage === 'marketplace' ? 'white' : '#6b7280',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <Store style={{ width: '1rem', height: '1rem' }} />
              Agent Marketplace
            </button>
            
            <button
              onClick={() => setCurrentPage('agents')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: currentPage === 'agents' ? '#3b82f6' : 'transparent',
                color: currentPage === 'agents' ? 'white' : '#6b7280',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <Users style={{ width: '1rem', height: '1rem' }} />
              Current Agents
            </button>
          </nav>
        </div>

        {/* Status */}
        <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
            <div style={{ width: '0.5rem', height: '0.5rem', backgroundColor: '#10b981', borderRadius: '50%' }}></div>
            <span>React App Connected</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentPage === 'chat' && renderChatPage()}
        {currentPage === 'marketplace' && renderMarketplacePage()}
        {currentPage === 'agents' && renderAgentsPage()}
      </div>
    </div>
  );
};

export default App;