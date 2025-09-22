import { Agent } from '../types';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

export const api = {
  async callBackend(endpoint: string, data: any = {}, method: string = 'POST') {
    try {
      const options: RequestInit = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (method !== 'GET' && method !== 'DELETE') {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, options);

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Backend API error:', error);
      throw error;
    }
  },

  async checkHealth() {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  async sendMessage(message: string, sessionId: string, userId: string) {
    return this.callBackend('/api/chat', {
      message,
      session_id: sessionId,
      user_id: userId
    });
  },

  async getAgents(): Promise<Agent[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/agents`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Failed to load agents from backend:', error);
      return [];
    }
  },

  async getMarketplaceAgents(): Promise<Agent[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/marketplace`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Failed to load marketplace agents:', error);
      return [];
    }
  },

  async addAgent(agent: Agent) {
    return this.callBackend('/api/agents', {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      category: agent.category,
      icon: "🤖",
      rating: 4.5,
      downloads: 0,
      capabilities: agent.capabilities,
      agent_type: agent.agent_type || "GenericLLMAgent",
      ...(agent.requires_api_key && agent.api_key_placeholder && { api_key: agent.api_key_placeholder })
    });
  },

  async removeAgent(agentId: string) {
    return this.callBackend(`/api/agents/${agentId}`, {}, 'DELETE');
  }
};