import { useState, useRef } from 'react';
import { Message, Agent, ChatState, Task } from '../types';
import { api } from '../services/api';

export const useChat = (sessionId: string, availableAgents: Agent[]) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showTaskVisualization, setShowTaskVisualization] = useState(false);
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | undefined>();

  const inputRef = useRef<HTMLInputElement>(null);
  const streamingRef = useRef<boolean>(false);

  // Commented out unused streamResponse function
  // const streamResponse = async (messageId: string, fullResponse: string) => {
  //   const words = fullResponse.split(' ');
  //   let currentContent = '';
  //   streamingRef.current = true;

  //   const updateMessage = (content: string, isStreaming: boolean = true) => {
  //     setMessages(prev => prev.map(msg =>
  //       msg.id === messageId
  //         ? { ...msg, content, isStreaming }
  //         : msg
  //     ));
  //   };

  //   // Check if this is a complete response that should be shown immediately
  //   const isCompleteResponse = fullResponse.length > 0 && !fullResponse.includes('...');
  //   const isShortMessage = words.length <= 15;
    
  //   // If it's a complete short response, show it immediately
  //   if (isCompleteResponse && isShortMessage) {
  //     updateMessage(fullResponse, false);
  //     streamingRef.current = false;
  //     setChatState('idle');
  //     inputRef.current?.focus();
  //     return;
  //   }

  //   // For longer messages, use adaptive streaming
  //   const baseDelay = isShortMessage ? 15 : 25;
    
  //   for (let i = 0; i < words.length; i++) {
  //     // Check if streaming was stopped
  //     if (!streamingRef.current) {
  //       break;
  //     }
      
  //     // Adaptive delay based on position in message
  //     const progress = i / words.length;
  //     let delay = baseDelay;
      
  //     // Speed up as we approach the end
  //     if (progress > 0.8) {
  //       delay = Math.max(5, baseDelay * 0.3); // Much faster near the end
  //     } else if (progress > 0.6) {
  //       delay = Math.max(8, baseDelay * 0.6); // Moderately faster
  //     }
      
  //     await new Promise(resolve => setTimeout(resolve, delay));
  //     currentContent += (i > 0 ? ' ' : '') + words[i];
  //     updateMessage(currentContent);
  //   }

  //   updateMessage(currentContent, false);
  //   streamingRef.current = false;
  //   setChatState('idle');
  //   inputRef.current?.focus();
  // };

  const stopStreaming = () => {
    streamingRef.current = false;
    setChatState('idle');
    inputRef.current?.focus();
  };

  const handleProgressUpdate = (messageId: string, update: any) => {
    // Enhanced progress handling with detailed logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Enhanced progress update:', update.type, update.message?.substring(0, 100) || '', update);
    }

    switch (update.type) {
      case 'thinking':
      case 'task_splitting':
        setChatState('selecting');
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                content: update.message || '🧠 Processing...',
                isStreaming: true,
                thinkingPhase: 'analyzing'
              }
            : msg
        ));
        break;

      case 'tasks_created':
        const tasks = update.tasks.map((task: any) => ({
          id: task.id,
          description: task.description,
          assigned_agent: task.assigned_agent,
          status: task.status,
          priority: 0
        }));
        setCurrentTasks(tasks);
        setShowTaskVisualization(true);
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                content: `📋 Created ${tasks.length} task${tasks.length > 1 ? 's' : ''}: ${tasks.map((t: Task) => `${t.assigned_agent} → ${t.description.substring(0, 30)}...`).join(', ')}`,
                tasks,
                isStreaming: true,
                thinkingPhase: 'task_creation'
              }
            : msg
        ));
        break;

      case 'task_assigned':
      case 'task_reassigned':
        // Update task assignments in real-time
        if (update.task_id && update.agent) {
          setCurrentTasks(prev => prev.map(task =>
            task.id === update.task_id
              ? { ...task, assigned_agent: update.agent, status: 'pending' }
              : task
          ));
        }
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                content: msg.content + '\n' + update.message,
                isStreaming: true,
                thinkingPhase: 'task_assignment'
              }
            : msg
        ));
        break;

      case 'task_started':
        setChatState('responding');
        setCurrentTaskId(update.task_id);
        setCurrentTasks(prev => prev.map(task =>
          task.id === update.task_id
            ? { ...task, status: 'running', started_at: new Date().toISOString() }
            : task
        ));
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                content: msg.content + '\n' + update.message,
                currentTaskId: update.task_id,
                isStreaming: true,
                thinkingPhase: 'execution'
              }
            : msg
        ));
        break;

      case 'command_execution':
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: update.message, isStreaming: true }
            : msg
        ));
        break;

      case 'terminal_output':
        const terminalMessage = update.level === 'command' ?
          `\n💻 ${update.message}` :
          update.level === 'stdout' ? `\n📤 ${update.message}` :
          update.level === 'stderr' ? `\n📤 ${update.message}` :
          update.level === 'error' ? `\n❌ ${update.message}` :
          `\n📊 ${update.message}`;

        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: msg.content + terminalMessage, isStreaming: true }
            : msg
        ));
        break;

      case 'agent_processing':
        const agent = availableAgents.find(a => a.name === update.agent);
        setSelectedAgent(agent || null);
        // Update the specific task being processed
        if (update.task_id) {
          setCurrentTasks(prev => prev.map(task =>
            task.id === update.task_id
              ? {
                  ...task,
                  status: 'running',
                  processing_agent: update.agent,
                  processing_started: new Date().toISOString()
                }
              : task
          ));
        }
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                content: msg.content + '\n' + update.message,
                agentName: update.agent,
                isStreaming: true,
                activeAgent: update.agent
              }
            : msg
        ));
        break;

      case 'task_completed':
        console.log('Enhanced task completed update:', update);
        setCurrentTasks(prev => prev.map(task =>
          task.id === update.task_id ? {
            ...task,
            status: 'completed',
            output: update.output || task.output || 'Task completed successfully',
            completed_at: new Date().toISOString(),
            duration: task.started_at ?
              Math.round((new Date().getTime() - new Date(task.started_at).getTime()) / 1000) : undefined
          } : task
        ));
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                content: msg.content + `\n${update.message}`,
                isStreaming: true,
                completedTasks: (msg.completedTasks || 0) + 1
              }
            : msg
        ));
        break;

      case 'task_failed':
        setCurrentTasks(prev => prev.map(task =>
          task.id === update.task_id ? { ...task, status: 'failed' } : task
        ));
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: msg.content + `\n${update.message}`, isStreaming: true }
            : msg
        ));
        break;

      case 'content':
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: msg.content + update.content, isStreaming: true }
            : msg
        ));
        break;

      case 'response_start':
        setChatState('responding');
        const startAgent = availableAgents.find(a => a.name === update.agent);
        setSelectedAgent(startAgent || null);
        break;

      case 'complete':
        setChatState('idle');
        setCurrentTaskId(undefined);
        inputRef.current?.focus();
        break;

      default:
        console.log('Unknown progress update type:', update.type);
    }
  };

  const sendMessage = async (message?: string) => {
    const messageToSend = message || inputMessage;
    if (!messageToSend.trim() || chatState !== 'idle') return;

    console.log('useChat sendMessage called with:', messageToSend);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
      agentName: null
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = messageToSend;
    if (!message) {
      setInputMessage('');
    }
    setChatState('selecting');
    setSelectedAgent(null);
    setCurrentTasks([]);
    setCurrentTaskId(undefined);

    try {
      // Create a preliminary agent response message for streaming
      const agentMessageId = (Date.now() + 1).toString();
      const agentMessage: Message = {
        id: agentMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        agentName: 'TaskOrchestrator',
        isStreaming: true,
        tasks: []
      };

      setMessages(prev => [...prev, agentMessage]);

      // Use streaming API
      await api.sendMessageStreaming(
        currentInput,
        sessionId,
        'user123',
        // Progress callback
        (update: any) => {
          handleProgressUpdate(agentMessageId, update);
        },
        // Complete callback
        (response: string, agentName: string) => {
          const agent = availableAgents.find(a => a.name === agentName);
          setSelectedAgent(agent || null);
          setChatState('idle');
          inputRef.current?.focus();

          setMessages(prev => prev.map(msg =>
            msg.id === agentMessageId
              ? { ...msg, content: response, agentName: agentName, isStreaming: false }
              : msg
          ));
        },
        // Error callback
        (error: Error) => {
          console.error('Error sending message:', error);
          setChatState('idle');

          setMessages(prev => prev.map(msg =>
            msg.id === agentMessageId
              ? { ...msg, content: 'Error: Failed to get response', isStreaming: false }
              : msg
          ));
        }
      );

    } catch (error) {
      console.error('Error sending message:', error);
      setChatState('idle');
    }
  };

  return {
    messages,
    inputMessage,
    setInputMessage,
    chatState,
    selectedAgent,
    sendMessage,
    stopStreaming,
    inputRef,
    showTaskVisualization,
    setShowTaskVisualization,
    currentTasks,
    currentTaskId
  };
};