import React, { useState } from 'react';
import { Page } from './types';
import { useChat } from './hooks/useChat';
import { useAgents } from './hooks/useAgents';
import { useBackendConnection } from './hooks/useBackendConnection';
import Sidebar from './components/ui/Sidebar';
import OrchestratorCanvas from './components/orchestrator/OrchestratorCanvas';
import MarketplacePage from './components/marketplace/MarketplacePage';
import AgentsPage from './components/agents/AgentsPage';
import TaskVisualization from './components/chat/TaskVisualization';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('chat');
  const [sessionId] = useState(() => `session_${Math.random().toString(36).substr(2, 9)}`);
  
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
    showTaskVisualization,
    setShowTaskVisualization,
    currentTasks,
    currentTaskId
  } = useChat(sessionId, availableAgents);

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
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 flex">
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        backendConnected={backendConnected}
      />

      <div className="flex-1 main-content">
        {currentPage === 'chat' && (
          <ErrorBoundary>
            <OrchestratorCanvas
              onSendMessage={sendMessage}
              isStreaming={chatState === 'responding'}
              backendConnected={backendConnected}
              currentTasks={currentTasks}
              currentTaskId={currentTaskId}
              messages={messages}
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

      {/* Task Visualization Popup */}
      <TaskVisualization
        isOpen={showTaskVisualization}
        onClose={() => setShowTaskVisualization(false)}
        originalPrompt={messages.filter(m => m.role === 'user').pop()?.content || 'Processing request...'}
        tasks={currentTasks}
        currentTaskId={currentTaskId}
      />
    </div>
  );
};

export default App;