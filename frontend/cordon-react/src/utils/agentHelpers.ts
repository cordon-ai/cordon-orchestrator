import {
  Code, Search, Crown, PenTool, Database, Palette,
  Languages, Zap, Shield, Bot
} from 'lucide-react';
import { AgentColorStyle } from '../types';

export const getAgentIcon = (agentName: string) => {
  switch (agentName?.toLowerCase()) {
    case 'coder':
      return Code;
    case 'researcher':
      return Search;
    case 'supervisor':
      return Crown;
    case 'writer':
      return PenTool;
    case 'data analyst':
      return Database;
    case 'designer':
      return Palette;
    case 'translator':
      return Languages;
    case 'openai agent':
      return Zap;
    case 'anthropic assistant':
      return Shield;
    default:
      return Bot;
  }
};

export const getAgentColorStyle = (agentName: string): AgentColorStyle => {
  const colors: {[key: string]: AgentColorStyle} = {
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

  const defaultColor: AgentColorStyle = {
    bg: 'rgba(100, 100, 100, 0.1)',
    text: '#9ca3af',
    border: 'rgba(100, 100, 100, 0.3)'
  };

  return colors[agentName?.toLowerCase()] || defaultColor;
};