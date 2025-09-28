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
  onStopStreaming?: () => void;
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
  messages = [],
  onStopStreaming
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
  const [dynamicAgentNodes, setDynamicAgentNodes] = useState<Map<string, Node>>(new Map());
  const [activeTaskEdges, setActiveTaskEdges] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const reactFlowRef = useRef<ReactFlowInstance>(null);

  // Stop thinking function
  const handleStopThinking = () => {
    setFunctionOutput('');
    setCurrentStep('');
    // Clear progress
    setSupervisorProgress(undefined);
    // Stop the streaming from parent component
    if (onStopStreaming) {
      onStopStreaming();
      console.log('Stopping thinking...');
    }
  };


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

  const handleAgentExpand = useCallback((agentId: string) => {
    // Find agent from dynamic nodes using a ref to avoid dependency issues
    setSelectedAgent(prev => {
      // We'll find the agent in the modal component instead
      return { id: agentId } as AgentData;
    });
    setIsModalOpen(true);
  }, []);

  // Create dynamic agent nodes for each task - aligned with sequential execution
  useEffect(() => {
    console.log('🔍 Processing tasks for dynamic node creation:', {
      currentTasks,
      taskCount: currentTasks.length,
      tasks: currentTasks.map(t => ({ id: t.id, agent: t.assigned_agent, status: t.status, output: t.output?.substring(0, 50) }))
    });
    
    const newAgentNodes = new Map<string, Node>();
    const newActiveEdges = new Set<string>();
    
    // Sort tasks by priority (ascending) so first-executed is leftmost, last-executed is rightmost
    const sortedTasks = [...currentTasks].sort((a, b) => {
      // Sort by priority (lower priority number = executed first = leftmost)
      return (a.priority || 0) - (b.priority || 0);
    });
    
    // Create a stable position map based on task ID to prevent cards from moving
    const taskPositionMap = new Map<string, number>();
    sortedTasks.forEach((task, index) => {
      taskPositionMap.set(task.id, index);
    });
    
    // Process all tasks (not just sorted ones) to maintain stable positions
    currentTasks.forEach((task) => {
      if (!task.assigned_agent) return;
      
      const agentId = `agent-${task.assigned_agent}-${task.id}`;
      const isRunning = task.status === 'running';
      const isCompleted = task.status === 'completed';
      const isFailed = task.status === 'failed';
      const isPending = task.status === 'pending';
      
      // Get stable position from the position map
      const stableIndex = taskPositionMap.get(task.id) || 0;
      
      console.log(`🔍 Task ${task.id} (${task.assigned_agent}): status=${task.status}, isRunning=${isRunning}, isCompleted=${isCompleted}, stableIndex=${stableIndex}`);
      
      // Create agent data for this specific task
      const agentData: AgentData = {
        id: agentId,
        name: task.assigned_agent,
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
        taskDescription: task.description,
        progress: {
          current: isCompleted ? 1 : 0,
          total: 1,
          phase: task.status
        }
      };

      // Create the node with stable positioning
      const node: Node = {
        id: agentId,
        type: 'agent',
        position: {
          // Use stable index to prevent cards from moving
          x: 100 + stableIndex * 400, // 400px spacing between nodes
          y: 500 // Same Y level for all agent nodes - increased distance from supervisor
        },
        data: {
          ...agentData,
          onExpand: handleAgentExpand,
          isNewSpawn: true, // Always mark as new spawn for dynamic nodes
        },
      };

      newAgentNodes.set(agentId, node);
      
            // Track active edges for running tasks only
            if (isRunning) {
              console.log(`🔥 Adding active edge for running task: supervisor-${agentId}`);
              newActiveEdges.add(`supervisor-${agentId}`);
            }
    });

    setDynamicAgentNodes(newAgentNodes);
    setActiveTaskEdges(newActiveEdges);
  }, [currentTasks]);

  // Convert tasks to agents using useMemo to prevent infinite loops (legacy support)
  const agents: AgentData[] = useMemo(() => {
    console.log('Creating agents from tasks (legacy):', currentTasks);
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


  // Enhanced node initialization with dynamic agent spawning and glowing edges
  useEffect(() => {
    console.log('Creating supervisor node with enhanced data:', {
      supervisorTasks, isStreaming, functionOutput, currentStep, supervisorProgress
    });

    // Use dynamic agent nodes instead of legacy agents
    const dynamicNodes = Array.from(dynamicAgentNodes.values());
    
    // Always create supervisor node, even when there are no tasks
    const supervisorNode: Node = {
      id: 'supervisor',
      type: 'supervisor',
      position: { 
        x: dynamicNodes.length > 0 ? 
          // Center supervisor above the agent nodes using stable positioning
          (100 + (dynamicNodes.length - 1) * 400) / 2 : 
          400, // Default position if no agents
        y: 100 
      },
      data: {
        tasks: supervisorTasks,
        isStreaming,
        prompt: messages.filter(m => m.role === 'user').pop()?.content,
        functionOutput,
        currentStep,
        progress: supervisorProgress,
        onStopThinking: handleStopThinking
      },
    };
    
    // Create edges - all supervisor-to-agent connections
    const agentEdges: Edge[] = [];
    
            // Connect supervisor to ALL agent nodes
            dynamicNodes.forEach((node) => {
              const edgeId = `supervisor-${node.id}`;
              const isActive = activeTaskEdges.has(edgeId);
              const agentData = node.data as AgentData;
              
              console.log(`🔗 Creating supervisor edge: ${edgeId}, isActive=${isActive}, status=${agentData.status}`);
      
              agentEdges.push({
                id: edgeId,
                source: 'supervisor',
                target: node.id,
                type: 'smoothstep',
                animated: isActive,
                style: {
                  stroke: agentData.status === 'done' ? '#34d399' :
                          agentData.status === 'error' ? '#f87171' :
                          agentData.status === 'running' ? '#22d3ee' : '#6b7280',
                  strokeWidth: agentData.status === 'running' ? 4 : 2,
                  strokeDasharray: agentData.status === 'queued' ? '5,5' : undefined,
                  filter: agentData.status === 'running' ? 'drop-shadow(0 0 8px #22d3ee)' : undefined,
                },
                className: agentData.status === 'running' ? 'glowing-edge' : undefined
              });
            });
    
    // All edges are now supervisor-to-agent connections

    // Always show at least the supervisor node
    const allNodes = [supervisorNode, ...dynamicNodes];
    setNodes(allNodes);
    setEdges(agentEdges);
    console.log('Dynamic nodes set:', allNodes);
    console.log('Active edges:', Array.from(activeTaskEdges));
    console.log('React Flow will render nodes:', allNodes.length);
    console.log('Node types available:', Object.keys(nodeTypes));
  }, [supervisorTasks, dynamicAgentNodes, activeTaskEdges, isStreaming, supervisorProgress]);

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
          fitView={false}
          fitViewOptions={{ padding: 0.6 }}
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
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          onInit={(instance) => {
            reactFlowRef.current = instance;
            console.log('React Flow initialized:', instance);
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
              if (node.type === 'supervisor') return '#0891b2';
              if (node.type === 'agent') return '#3b82f6';
              return '#6b7280';
            }}
            nodeStrokeWidth={3}
            nodeBorderRadius={8}
            maskColor="rgba(0, 0, 0, 0.1)"
            position="top-right"
            style={{
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(75, 85, 99, 0.3)',
              borderRadius: '0.5rem',
              marginTop: '60px', // Add margin to avoid overlap with controls
            }}
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="rgba(30, 58, 138, 0.6)"
          />
        </ReactFlow>
      </div>

      {/* Bottom Composer */}
      <div className="bottom-composer">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Describe your task and I'll orchestrate the perfect agent solution..."
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

      {/* Agent Details Modal */}
      <AgentDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agent={selectedAgent}
        dynamicAgentNodes={dynamicAgentNodes}
      />
    </div>
  );
};

export default OrchestratorCanvas;
