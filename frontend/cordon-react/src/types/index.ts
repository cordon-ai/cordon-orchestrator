export interface Task {
  id: string;
  description: string;
  assigned_agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  output?: string;
  error?: string;
  progress?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentName: string | null;
  isStreaming?: boolean;
  tasks?: Task[];
  currentTaskId?: string;
}

export interface Agent {
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

export type ChatState = 'idle' | 'selecting' | 'responding';
export type Page = 'chat' | 'marketplace' | 'agents';

export interface AgentColorStyle {
  bg: string;
  text: string;
  border: string;
}