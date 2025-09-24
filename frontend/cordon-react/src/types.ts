export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentName: string | null;
  isStreaming?: boolean;
  tasks?: Task[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  apiKey?: string;
  capabilities: string[];
  icon?: string;
  color?: string;
  requestCount?: number;
  category?: string;
  requires_api_key?: boolean;
  api_key_placeholder?: string;
  agent_type?: string;
}

export interface Task {
  id: string;
  description: string;
  assigned_agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  output?: string;
  error?: string;
}

export type ChatState = 'idle' | 'selecting' | 'task_splitting' | 'task_executing' | 'responding';

export type Page = 'chat' | 'agents' | 'marketplace';

export interface AgentColorStyle {
  bg: string;
  text: string;
  border: string;
}