import { useState, useEffect } from 'react';
import { Agent } from '../types';
import { api } from '../services/api';

export const useAgents = () => {
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [marketplaceAgents, setMarketplaceAgents] = useState<Agent[]>([]);
  const [apiKeyInput, setApiKeyInput] = useState<{[key: string]: string}>({});
  const [showApiKeyModal, setShowApiKeyModal] = useState<Agent | null>(null);

  const loadAgentsFromBackend = async () => {
    const agents = await api.getAgents();
    setAvailableAgents(agents);
  };

  const loadMarketplaceAgents = async () => {
    const agents = await api.getMarketplaceAgents();
    setMarketplaceAgents(agents);
  };

  const addAgentFromMarketplace = async (agent: Agent) => {
    try {
      if (agent.requires_api_key) {
        setShowApiKeyModal(agent);
        return;
      }

      await api.addAgent(agent);
      await loadAgentsFromBackend();
      setMarketplaceAgents(prev => prev.filter(a => a.id !== agent.id));
    } catch (error) {
      console.error('Failed to add agent:', error);
    }
  };

  const addAgentWithApiKey = async (agent: Agent, apiKey: string) => {
    try {
      const agentData = {
        ...agent,
        api_key: apiKey
      };

      await api.addAgent(agentData);
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
        await api.removeAgent(agentId);
        await loadAgentsFromBackend();
        setMarketplaceAgents(prev => [...prev, { ...agent, status: 'available' }]);
      }
    } catch (error) {
      console.error('Failed to remove agent:', error);
    }
  };

  useEffect(() => {
    loadAgentsFromBackend();
    loadMarketplaceAgents();
  }, []);

  return {
    availableAgents,
    marketplaceAgents,
    apiKeyInput,
    setApiKeyInput,
    showApiKeyModal,
    setShowApiKeyModal,
    addAgentFromMarketplace,
    addAgentWithApiKey,
    removeAgent,
    loadAgentsFromBackend
  };
};