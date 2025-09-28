// Import error suppression first to catch errors early
import './utils/errorSuppression';

import React, { useState, useEffect } from 'react';
import { Page } from './types';
import { useChat } from './hooks/useChat';
import { useAgents } from './hooks/useAgents';
import { useBackendConnection } from './hooks/useBackendConnection';
import Sidebar from './components/ui/Sidebar';
import OrchestratorCanvas from './components/orchestrator/OrchestratorCanvas';
import MarketplacePage from './components/marketplace/MarketplacePage';
import AgentsPage from './components/agents/AgentsPage';
import ErrorBoundary from './components/ErrorBoundary';
import { suppressResizeObserverErrors } from './utils/errorSuppression';
import './App.css';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('chat');
  const [sessionId] = useState(() => `session_${Math.random().toString(36).substr(2, 9)}`);

  // Aggressive ResizeObserver error suppression
  useEffect(() => {
    const cleanup = suppressResizeObserverErrors();
    
    // Additional global error handler
    const handleError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('ResizeObserver')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && event.reason.message.includes('ResizeObserver')) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      cleanup();
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { backendConnected } = useBackendConnection();

  const {
    availableAgents,
    marketplaceAgents,
    apiKeyInput,
    setApiKeyInput,
    showApiKeyModal,
    setShowApiKeyModal,
    addAgentFromMarketplace,
    addAgentWithApiKey,
    removeAgent
  } = useAgents();

  const {
    messages,
    chatState,
    sendMessage,
    stopStreaming,
    currentTasks,
    currentTaskId
  } = useChat(sessionId, availableAgents);

  // Initialize error suppression for ResizeObserver errors
  useEffect(() => {
    const cleanup = suppressResizeObserverErrors();
    return cleanup;
  }, []);

  const handleApiKeyConfirm = () => {
    if (showApiKeyModal) {
      const apiKey = apiKeyInput[showApiKeyModal.id] || '';
      addAgentWithApiKey(showApiKeyModal, apiKey);
    }
  };

  const handleApiKeyCancel = () => {
    if (showApiKeyModal) {
      const agentId = showApiKeyModal.id;
      setShowApiKeyModal(null);
      setApiKeyInput(prev => ({ ...prev, [agentId]: '' }));
    }
  };


  return (
    <div className={`min-h-screen bg-gradient-to-br from-black to-gray-900 flex ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} 
         style={{ '--sidebar-width': sidebarCollapsed ? '4rem' : '18rem' } as React.CSSProperties}>
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        backendConnected={backendConnected}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
      />

      <div
        className="flex-1"
        style={{
          marginLeft: sidebarCollapsed ? '4rem' : '18rem',
          transition: 'margin-left 0.3s ease-in-out',
          height: '100vh',
          overflow: currentPage === 'chat' ? 'hidden' : 'auto'
        }}
      >
        {currentPage === 'chat' && (
          <ErrorBoundary>
            <OrchestratorCanvas
              onSendMessage={sendMessage}
              isStreaming={chatState === 'responding' || chatState === 'selecting'}
              backendConnected={backendConnected}
              currentTasks={currentTasks}
              currentTaskId={currentTaskId}
              messages={messages}
              onStopStreaming={stopStreaming}
            />
          </ErrorBoundary>
        )}

        {currentPage === 'marketplace' && (
          <MarketplacePage
            marketplaceAgents={marketplaceAgents}
            onAddAgent={addAgentFromMarketplace}
            showApiKeyModal={showApiKeyModal}
            apiKeyInput={showApiKeyModal ? (apiKeyInput[showApiKeyModal.id] || '') : ''}
            onApiKeyChange={(value) => {
              if (showApiKeyModal) {
                const agentId = showApiKeyModal.id;
                setApiKeyInput(prev => ({ ...prev, [agentId]: value }));
              }
            }}
            onApiKeyConfirm={handleApiKeyConfirm}
            onApiKeyCancel={handleApiKeyCancel}
          />
        )}

        {currentPage === 'agents' && (
          <AgentsPage
            availableAgents={availableAgents}
            backendConnected={backendConnected}
            onRemoveAgent={removeAgent}
          />
        )}
      </div>

    </div>
  );
};

export default App;