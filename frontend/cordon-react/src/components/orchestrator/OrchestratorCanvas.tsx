import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Send, Loader2, Wifi } from 'lucide-react';
import SupervisorCard, { Task as SupervisorTask } from './SupervisorCard';
import AgentCard, { AgentData } from './AgentCard';
import AgentDetailsModal from './AgentDetailsModal';
import { Task as BackendTask } from '../../types';

interface OrchestratorCanvasProps {
  onSendMessage: (message: string) => void;
  isStreaming: boolean;
  backendConnected: boolean;
  currentTasks?: BackendTask[];
  currentTaskId?: string;
  messages?: any[];
}

const nodeTypes: NodeTypes = {
  supervisor: SupervisorCard,
  agent: AgentCard,
};

const OrchestratorCanvas: React.FC<OrchestratorCanvasProps> = ({
  onSendMessage,
  isStreaming,
  backendConnected,
  currentTasks = [],
  currentTaskId,
  messages = []
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Convert backend tasks to display format using useMemo to prevent infinite loops
  const supervisorTasks: SupervisorTask[] = useMemo(() => {
    return (currentTasks || []).map((task, index) => ({
      id: task.id || `task-${index}`,
      name: task.description || 'Unknown Task',
      agent: task.assigned_agent || 'Unassigned',
      status: task.status === 'pending' ? 'queued' :
              task.status === 'running' ? 'running' :
              task.status === 'completed' ? 'done' : 'error',
      summary: task.description || 'No description available'
    }));
  }, [currentTasks]);

  // Convert tasks to agents using useMemo to prevent infinite loops
  const agents: AgentData[] = useMemo(() => {
    return (currentTasks || [])
      .filter(task => task.assigned_agent)
      .reduce((acc: AgentData[], task) => {
        const existingAgent = acc.find(a => a.name === task.assigned_agent);
        if (!existingAgent) {
          acc.push({
            id: `agent-${task.assigned_agent}`,
            name: task.assigned_agent || 'Unknown Agent',
            status: task.status === 'pending' ? 'queued' :
                    task.status === 'running' ? 'running' :
                    task.status === 'completed' ? 'done' : 'error',
            preview: task.status === 'completed' ? `${task.assigned_agent} completed successfully` :
                     task.status === 'running' ? `${task.assigned_agent} is processing...` :
                     task.status === 'failed' ? `${task.assigned_agent} encountered an error` :
                     `${task.assigned_agent} is queued`,
            fullTranscript: task.output ? 
              `${task.assigned_agent} completed successfully\nTask: ${task.description}\nStatus: ${task.status}\n\nOutput:\n${task.output}` :
              `Task: ${task.description}\nStatus: ${task.status}`,
            startTime: new Date(),
            endTime: task.status === 'completed' ? new Date() : undefined,
          });
        } else {
          // Update existing agent with new task info
          const existingIndex = acc.findIndex(a => a.name === task.assigned_agent);
          if (existingIndex !== -1) {
            acc[existingIndex] = {
              ...acc[existingIndex],
              status: task.status === 'pending' ? 'queued' :
                      task.status === 'running' ? 'running' :
                      task.status === 'completed' ? 'done' : 'error',
              preview: task.status === 'completed' ? `${task.assigned_agent} completed successfully` :
                       task.status === 'running' ? `${task.assigned_agent} is processing...` :
                       task.status === 'failed' ? `${task.assigned_agent} encountered an error` :
                       `${task.assigned_agent} is queued`,
              fullTranscript: task.output ? 
                `${task.assigned_agent} completed successfully\nTask: ${task.description}\nStatus: ${task.status}\n\nOutput:\n${task.output}` :
                `Task: ${task.description}\nStatus: ${task.status}`,
              endTime: task.status === 'completed' ? new Date() : acc[existingIndex].endTime,
            };
          }
        }
        return acc;
      }, []);
  }, [currentTasks]);

  const handleAgentExpand = useCallback((agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      setIsModalOpen(true);
    }
  }, [agents]);

  // Initialize nodes based on real backend data
  useEffect(() => {
    const supervisorNode: Node = {
      id: 'supervisor',
      type: 'supervisor',
      position: { x: 400, y: 100 },
      data: { tasks: supervisorTasks, isStreaming, prompt: messages.find(m => m.role === 'user')?.content },
    };

    const agentNodes: Node[] = agents.map((agent, index) => ({
      id: agent.id,
      type: 'agent',
      position: {
        x: 150 + (index % 3) * 280,
        y: 350 + Math.floor(index / 3) * 200
      },
      data: {
        ...agent,
        onExpand: handleAgentExpand,
      },
    }));

    const agentEdges: Edge[] = agents.map(agent => ({
      id: `supervisor-${agent.id}`,
      source: 'supervisor',
      target: agent.id,
      type: 'smoothstep',
      animated: agent.status === 'running',
      style: {
        stroke: agent.status === 'done' ? '#34d399' : '#60a5fa',
        strokeWidth: 2
      },
    }));

    setNodes([supervisorNode, ...agentNodes]);
    setEdges(agentEdges);
  }, [supervisorTasks, agents, isStreaming, handleAgentExpand, setNodes, setEdges, messages]);

  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim() || isStreaming) return;

    const message = inputMessage.trim();
    setInputMessage('');

    // Call backend
    onSendMessage(message);
  }, [inputMessage, isStreaming, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setInputMessage(textarea.value);

    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 144) + 'px';
  }, []);


  return (
    <div className="flex flex-col h-screen orchestrator-canvas">
      {/* Header */}
      <div className="orchestrator-header">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium text-white tracking-tight">Orchestrator</h1>

          <div className="flex items-center gap-2 text-sm">
            <Wifi className={`w-4 h-4 ${backendConnected ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className="text-white/60">
              {backendConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative">
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            className="orchestrator-canvas"
          >
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'supervisor') return '#60a5fa';
                return '#34d399';
              }}
              maskColor="rgba(15, 20, 23, 0.8)"
            />
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={0.5}
              color="rgba(255, 255, 255, 0.1)"
            />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full text-white/60">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wifi className="w-8 h-8" />
              </div>
              <p>Waiting for tasks...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Composer */}
      <div className="bottom-composer">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Can you..."
              className="composer-input w-full"
              disabled={isStreaming}
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isStreaming}
              className="composer-send-button"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          {inputMessage && (
            <div className="text-xs text-white/40 mt-2 px-1">
              Press Enter to send • Shift+Enter for new line
            </div>
          )}
        </div>
      </div>

      {/* Agent Details Modal */}
      <AgentDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agent={selectedAgent}
      />
    </div>
  );
};

export default OrchestratorCanvas;
