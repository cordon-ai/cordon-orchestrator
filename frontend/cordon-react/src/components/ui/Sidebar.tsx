import React from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, Store, Users, ChevronRight
} from 'lucide-react';
import { Page } from '../../types';
import cordonLogo from '../../cordonlogo.png';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  backendConnected: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, backendConnected }) => {
  return (
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className="sidebar w-72 flex flex-col fixed h-screen z-20"
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="logo-container logo-small shadow-lg shadow-cyan-500/20">
            <img src={cordonLogo} alt="Cordon AI" className="cordon-logo" />
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
          onClick={() => onPageChange('chat')}
          className={`nav-item w-full ${currentPage === 'chat' ? 'active' : ''}`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat Interface</span>
          {currentPage === 'chat' && (
            <ChevronRight className="w-4 h-4 ml-auto" />
          )}
        </button>

        <button
          onClick={() => onPageChange('marketplace')}
          className={`nav-item w-full ${currentPage === 'marketplace' ? 'active' : ''}`}
        >
          <Store className="w-4 h-4" />
          <span>Marketplace</span>
          {currentPage === 'marketplace' && (
            <ChevronRight className="w-4 h-4 ml-auto" />
          )}
        </button>

        <button
          onClick={() => onPageChange('agents')}
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
  );
};

export default Sidebar;