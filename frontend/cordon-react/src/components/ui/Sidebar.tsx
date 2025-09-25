import React, { useState } from 'react';
import {
  MessageSquare, Store, Users, ChevronRight, ChevronLeft
} from 'lucide-react';
import { Page } from '../../types';
import cordonLogo from '../../cordonlogo.png';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  backendConnected: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  backendConnected,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  // Use external collapsed state if provided, otherwise use internal state
  const collapsed = onToggleCollapse ? isCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    const newCollapsed = !collapsed;
    if (onToggleCollapse) {
      onToggleCollapse(newCollapsed);
    } else {
      setInternalCollapsed(newCollapsed);
    }
  };
  return (
    <div
      className={`sidebar ${collapsed ? 'w-16' : 'w-72'} flex flex-col fixed h-screen z-20`}
      style={{
        width: collapsed ? '4rem' : '18rem',
        transition: 'width 0.3s ease-in-out',
        top: 0,
        left: 0,
        height: '100vh'
      }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="logo-container logo-small shadow-lg shadow-cyan-500/20 flex-shrink-0">
            <img src={cordonLogo} alt="Cordon AI" className="cordon-logo" />
          </div>
          {!collapsed && (
            <div className="logo-text">
              <h1 className="text-xl font-light text-white/95 tracking-tight whitespace-nowrap">
                Cordon AI
              </h1>
              <p className="text-xs text-white/50 font-light whitespace-nowrap">
                Multi-Agent Orchestrator
              </p>
            </div>
          )}
        </div>
        <button
          onClick={toggleCollapse}
          className="absolute top-6 right-4 p-1.5 rounded-md bg-gray-800/60 hover:bg-gray-700/80 border border-gray-600/40 transition-colors duration-200"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-white/90" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-white/90" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <button
          onClick={() => onPageChange('chat')}
          className={`nav-item w-full ${currentPage === 'chat' ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Chat Interface' : ''}
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Chat Interface</span>}
          {!collapsed && currentPage === 'chat' && (
            <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
          )}
        </button>

        <button
          onClick={() => onPageChange('marketplace')}
          className={`nav-item w-full ${currentPage === 'marketplace' ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Marketplace' : ''}
        >
          <Store className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Marketplace</span>}
          {!collapsed && currentPage === 'marketplace' && (
            <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
          )}
        </button>

        <button
          onClick={() => onPageChange('agents')}
          className={`nav-item w-full ${currentPage === 'agents' ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Active Agents' : ''}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Active Agents</span>}
          {!collapsed && currentPage === 'agents' && (
            <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
          )}
        </button>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className={`flex items-center text-xs text-white/40 ${collapsed ? 'justify-center' : 'gap-2'}`}>
          <div
            className={`status-dot ${backendConnected ? 'online' : 'offline'}`}
            title={collapsed ? `System ${backendConnected ? 'Online' : 'Offline'}` : ''}
          />
          {!collapsed && <span>System {backendConnected ? 'Online' : 'Offline'}</span>}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;