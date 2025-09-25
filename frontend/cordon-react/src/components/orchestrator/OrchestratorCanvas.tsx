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
  ReactFlowInstance,
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
  const [functionOutput, setFunctionOutput] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<string>('');
  const [supervisorProgress, setSupervisorProgress] = useState<{
    current: number;
    total: number;
    phase: string;
  } | undefined>();
  const [agentSpawnQueue, setAgentSpawnQueue] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const reactFlowRef = useRef<ReactFlowInstance>(null);


  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Enhanced message processing for detailed thinking steps
  useEffect(() => {
    if (messages.length === 0) {
      setFunctionOutput('');
      setCurrentStep('');
      setSupervisorProgress(undefined);
      return;
    }

    const latestMessage = messages[messages.length - 1];
    if (latestMessage.content && latestMessage.isStreaming) {
      const content = latestMessage.content;

      // Process thinking phase from structured updates
      if (latestMessage.thinkingPhase) {
        switch (latestMessage.thinkingPhase) {
          case 'analyzing':
            setCurrentStep('🧠 Analyzing request and determining task structure...');
            break;
          case 'task_creation':
            if (latestMessage.tasks) {
              const taskCount = latestMessage.tasks.length;
              setCurrentStep(`📋 Created ${taskCount} tasks for execution`);
            }
            break;
          case 'task_assignment':
            setCurrentStep('📋 Assigning tasks to available agents...');
            break;
          case 'execution':
            setCurrentStep('🔄 Orchestrating task execution...');
            break;
        }
      }

      // Enhanced pattern matching for detailed progress tracking (fallback)
      const patterns = [
        {
          match: /🧠 Supervisor analyzing request and breaking into tasks/,
          action: () => {
            setCurrentStep('🧠 Supervisor analyzing request and breaking into tasks...');
          }
        },
        {
          match: /📋 Split into (\d+) tasks/,
          action: (match: RegExpMatchArray) => {
            const taskCount = match[1];
            setCurrentStep(`📋 Created ${taskCount} tasks for execution`);
          }
        },
        {
          match: /📋 (.+) assigned: (.+)/,
          action: (match: RegExpMatchArray) => {
            const agent = match[1];
            const taskPreview = match[2];
            setCurrentStep(`📋 Assigning tasks to available agents...`);
          }
        },
        {
          match: /🔄 Starting: (.+)/,
          action: (match: RegExpMatchArray) => {
            const taskPreview = match[1];
            setCurrentStep(`🔄 Orchestrating task execution...`);
          }
        },
        {
          match: /✅ Completed: (.+)/,
          action: (match: RegExpMatchArray) => {
            const taskPreview = match[1];
            setCurrentStep(`✅ Task completed successfully: "${taskPreview}"`);
          }
        },
        {
          match: /❌ Failed: (.+)/,
          action: (match: RegExpMatchArray) => {
            const taskPreview = match[1];
            setCurrentStep(`❌ Task failed: "${taskPreview}"`);
          }
        }
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern.match);
        if (match) {
          pattern.action(match);
          break;
        }
      }

      // Fallback for simple function output
      const simplePatterns = [
        { match: /🤔 Supervisor thinking/, output: '🤔 Supervisor thinking...' },
        { match: /Processing request:(.+?)(\n|$)/, output: '🔄 Processing request:$1' },
        { match: /Executing (\d+) tasks sequentially/, output: '⚡ Executing $1 tasks sequentially...' },
      ];

      for (const pattern of simplePatterns) {
        const match = content.match(pattern.match);
        if (match) {
          const output = pattern.output.replace('$1', match[1]?.trim() || '');
          setFunctionOutput(output);
          if (!currentStep) setCurrentStep(output);
          break;
        }
      }
    }
  }, [messages]);

  // Update progress based on task completion status
  useEffect(() => {
    if (currentTasks.length > 0) {
      const completedTasks = currentTasks.filter(t => t.status === 'completed').length;
      const totalTasks = currentTasks.length;
      
      // Determine the current phase based on task status
      let phase = 'Task Assignment';
      if (completedTasks === totalTasks && totalTasks > 0) {
        phase = 'Completed';
      } else if (completedTasks > 0) {
        phase = 'Execution';
      }
      
      setSupervisorProgress({
        current: completedTasks,
        total: totalTasks,
        phase: phase
      });
    }
  }, [currentTasks]);


  // Convert backend tasks to display format using useMemo to prevent infinite loops
  const supervisorTasks: SupervisorTask[] = useMemo(() => {
    console.log('Current tasks for supervisor:', currentTasks);
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
    console.log('Creating agents from tasks:', currentTasks);
    return (currentTasks || [])
      .filter(task => task.assigned_agent)
      .reduce((acc: AgentData[], task) => {
        const existingAgent = acc.find(a => a.name === task.assigned_agent);
        if (!existingAgent) {
          console.log('Creating new agent for task:', task.assigned_agent, 'output:', task.output);
          acc.push({
            id: `agent-${task.assigned_agent}`,
            name: task.assigned_agent || 'Unknown Agent',
            status: task.status === 'pending' ? 'queued' :
                    task.status === 'running' ? 'running' :
                    task.status === 'completed' ? 'done' : 'error',
            preview: task.status === 'completed' ? 
              (task.output ? 
                (task.assigned_agent === 'Coder' ? 
                  `${task.output.substring(0, 50)}${task.output.length > 50 ? '...' : ''}` : 
                  `${task.output.substring(0, 140)}${task.output.length > 140 ? '...' : ''}`) : 
                `${task.assigned_agent} completed successfully`) :
              task.status === 'running' ? `${task.assigned_agent} is processing...` :
              task.status === 'failed' ? `${task.assigned_agent} encountered an error` :
              `${task.assigned_agent} is queued`,
            fullTranscript: task.output ? 
              `## Agent: ${task.assigned_agent}\n\n**Task:** ${task.description}\n\n**Status:** ${task.status}\n\n---\n\n### Agent Output\n\n${task.output}` :
              `## Agent: ${task.assigned_agent}\n\n**Task:** ${task.description}\n\n**Status:** ${task.status}\n\n---\n\n*No output available yet.*`,
            startTime: new Date(),
            endTime: task.status === 'completed' ? new Date() : undefined,
            structuredOutput: task.output ? {
              type: 'agent_output',
              agent: task.assigned_agent,
              task: task.description,
              status: task.status,
              output: task.output,
              timestamp: new Date().toISOString()
            } : undefined,
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
              preview: task.status === 'completed' ? 
                (task.output ? 
                  (task.assigned_agent === 'Coder' ? 
                    `${task.output.substring(0, 50)}${task.output.length > 50 ? '...' : ''}` : 
                    `${task.output.substring(0, 140)}${task.output.length > 140 ? '...' : ''}`) : 
                  `${task.assigned_agent} completed successfully`) :
                task.status === 'running' ? `${task.assigned_agent} is processing...` :
                task.status === 'failed' ? `${task.assigned_agent} encountered an error` :
                `${task.assigned_agent} is queued`,
              fullTranscript: task.output ? 
                `## Agent: ${task.assigned_agent}\n\n**Task:** ${task.description}\n\n**Status:** ${task.status}\n\n---\n\n### Agent Output\n\n${task.output}` :
                `## Agent: ${task.assigned_agent}\n\n**Task:** ${task.description}\n\n**Status:** ${task.status}\n\n---\n\n*No output available yet.*`,
              endTime: task.status === 'completed' ? new Date() : acc[existingIndex].endTime,
              structuredOutput: task.output ? {
                type: 'agent_output',
                agent: task.assigned_agent,
                task: task.description,
                status: task.status,
                output: task.output,
                timestamp: new Date().toISOString()
              } : acc[existingIndex].structuredOutput,
            };
          }
        }
        return acc;
      }, []);
  }, [currentTasks]);

  // Debug logging
  console.log('OrchestratorCanvas render:', {
    nodesCount: nodes.length,
    edgesCount: edges.length,
    currentTasksCount: currentTasks.length,
    agentsCount: agents.length,
    supervisorTasksCount: supervisorTasks.length
  });

  const handleAgentExpand = useCallback((agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      setIsModalOpen(true);
    }
  }, [agents]);

  // Enhanced node initialization with thinking steps and real-time agent spawning
  useEffect(() => {
    console.log('Creating supervisor node with enhanced data:', {
      supervisorTasks, isStreaming, functionOutput, currentStep, supervisorProgress
    });

    // Always create supervisor node, even when there are no tasks
    const supervisorNode: Node = {
      id: 'supervisor',
      type: 'supervisor',
      position: { x: 400, y: 100 },
      data: {
        tasks: supervisorTasks,
        isStreaming,
        prompt: messages.find(m => m.role === 'user')?.content,
        functionOutput,
        currentStep,
        progress: supervisorProgress
      },
    };

    // Enhanced agent node positioning with staggered animation
    const agentNodes: Node[] = agents.map((agent, index) => {
      const isNewAgent = !agentSpawnQueue.has(agent.id);
      if (isNewAgent) {
        setAgentSpawnQueue(prev => new Set(Array.from(prev).concat(agent.id)));
        // Add a slight delay for spawn animation
        setTimeout(() => {
          // Trigger re-render for spawn animation
        }, 100 * index);
      }

      return {
        id: agent.id,
        type: 'agent',
        position: {
          x: 100 + (index % 3) * 300,
          y: 400 + Math.floor(index / 3) * 180
        },
        data: {
          ...agent,
          onExpand: handleAgentExpand,
          isNewSpawn: isNewAgent,
        },
      };
    });

    // Enhanced edge styling with status-based animations
    const agentEdges: Edge[] = agents.map((agent, index) => ({
      id: `supervisor-${agent.id}`,
      source: 'supervisor',
      target: agent.id,
      type: 'smoothstep',
      animated: agent.status === 'running',
      style: {
        stroke: agent.status === 'done' ? '#34d399' :
                agent.status === 'error' ? '#f87171' :
                agent.status === 'running' ? '#60a5fa' : '#6b7280',
        strokeWidth: agent.status === 'running' ? 3 : 2,
        strokeDasharray: agent.status === 'queued' ? '5,5' : undefined
      }
    }));

    // Always show at least the supervisor node
    const allNodes = [supervisorNode, ...agentNodes];
    setNodes(allNodes);
    setEdges(agentEdges);
    console.log('Enhanced nodes set:', allNodes);
    console.log('Supervisor node details:', supervisorNode);
    console.log('React Flow will render nodes:', allNodes.length);
    console.log('Node types available:', Object.keys(nodeTypes));
  }, [supervisorTasks, agents, isStreaming, handleAgentExpand, setNodes, setEdges, messages, functionOutput, currentStep, supervisorProgress, agentSpawnQueue]);

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

    // Fixed height to prevent ResizeObserver issues
    textarea.style.height = '48px';
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
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          className="orchestrator-canvas"
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
          preventScrolling={false}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: -200, y: -50, zoom: 0.8 }}
          onInit={(instance) => {
            reactFlowRef.current = instance;
            console.log('React Flow initialized:', instance);
            // Force fit view to ensure nodes are visible
            setTimeout(() => {
              instance.fitView({ padding: 0.2 });
            }, 100);
          }}
          onWheel={(event) => {
            // Manual zoom handling
            if (event.ctrlKey || event.metaKey) {
              event.preventDefault();
              if (reactFlowRef.current) {
                const delta = event.deltaY > 0 ? -0.1 : 0.1;
                const currentZoom = reactFlowRef.current.getZoom();
                const newZoom = Math.max(0.1, Math.min(2, currentZoom + delta));
                reactFlowRef.current.zoomTo(newZoom);
              }
            }
          }}
        >
          <Controls 
            showZoom={true}
            showFitView={true}
            showInteractive={true}
            position="top-right"
          />
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
