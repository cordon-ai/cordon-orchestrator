import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Maximize2, Network } from 'lucide-react';
import { Task } from '../../types';
import { getAgentIcon, getAgentColorStyle } from '../../utils/agentHelpers';

export interface TaskVisualizationProps {
  isOpen: boolean;
  onClose: () => void;
  originalPrompt: string;
  tasks: Task[];
  currentTaskId?: string;
}

const TaskVisualization: React.FC<TaskVisualizationProps> = ({
  isOpen,
  onClose,
  originalPrompt,
  tasks,
  currentTaskId
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return 'border-gray-500 bg-gray-500/20';
      case 'running':
        return 'border-blue-500 bg-blue-500/20 shadow-blue-500/30';
      case 'completed':
        return 'border-green-500 bg-green-500/20 shadow-green-500/30';
      case 'failed':
        return 'border-red-500 bg-red-500/20 shadow-red-500/30';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'running':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: 50, y: 50 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, x: 50, y: 50 }}
          className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
            isMinimized ? 'w-80 h-12' : 'w-[900px] h-[600px]'
          }`}
        >
          <div className="bg-black/90 backdrop-blur-xl border border-gray-600 rounded-lg shadow-2xl h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-600 bg-gray-800/50">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-purple-400" />
                <span className="text-white text-sm font-medium">Task Flow Graph</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  {isMinimized ? (
                    <Maximize2 className="w-3 h-3 text-gray-400" />
                  ) : (
                    <Minimize2 className="w-3 h-3 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Graph Content */}
            {!isMinimized && (
              <div className="flex-1 p-4 relative overflow-hidden">
                <svg
                  width="100%"
                  height="100%"
                  className="absolute inset-0"
                  style={{ zIndex: 1 }}
                >
                  {/* Draw connections between tasks */}
                  {tasks.map((task, index) => {
                    if (index === tasks.length - 1) return null;

                    const startX = 150 + (index % 3) * 280;
                    const startY = 100 + Math.floor(index / 3) * 180 + 60;
                    const endX = 150 + ((index + 1) % 3) * 280;
                    const endY = 100 + Math.floor((index + 1) / 3) * 180 + 60;

                    return (
                      <motion.line
                        key={`connection-${index}`}
                        x1={startX}
                        y1={startY}
                        x2={endX}
                        y2={endY}
                        stroke={task.status === 'completed' ? '#10b981' : '#6b7280'}
                        strokeWidth="2"
                        strokeDasharray={task.status === 'completed' ? '0' : '5,5'}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: index * 0.2, duration: 0.8 }}
                      />
                    );
                  })}

                  {/* Draw flow direction arrows */}
                  {tasks.map((task, index) => {
                    if (index === tasks.length - 1) return null;

                    const startX = 150 + (index % 3) * 280;
                    const startY = 100 + Math.floor(index / 3) * 180 + 60;
                    const endX = 150 + ((index + 1) % 3) * 280;
                    const endY = 100 + Math.floor((index + 1) / 3) * 180 + 60;

                    const midX = (startX + endX) / 2;
                    const midY = (startY + endY) / 2;

                    return (
                      <motion.polygon
                        key={`arrow-${index}`}
                        points={`${midX-5},${midY-5} ${midX+5},${midY} ${midX-5},${midY+5}`}
                        fill={task.status === 'completed' ? '#10b981' : '#6b7280'}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.2 + 0.4 }}
                      />
                    );
                  })}
                </svg>

                {/* Task Nodes */}
                <div className="relative z-10 h-full">
                  {tasks.map((task, index) => {
                    const IconComponent = getAgentIcon(task.assigned_agent || 'Unknown');
                    const colorStyle = getAgentColorStyle(task.assigned_agent || 'Unknown');
                    const isCurrentTask = task.id === currentTaskId;

                    const x = (index % 3) * 280;
                    const y = Math.floor(index / 3) * 180;

                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, scale: 0, x: x + 50, y: y + 50 }}
                        animate={{ opacity: 1, scale: 1, x, y }}
                        transition={{
                          delay: index * 0.15,
                          type: "spring",
                          stiffness: 200,
                          damping: 20
                        }}
                        className="absolute"
                        style={{ left: x, top: y }}
                      >
                        <div className={`w-64 h-36 rounded-lg border-2 p-3 ${getStatusColor(task.status)} ${
                          isCurrentTask ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                        } transition-all duration-300 hover:scale-105`}>

                          {/* Task Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getStatusIcon(task.status)}</span>
                              <span className="text-xs text-gray-300 font-medium capitalize">
                                {task.status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
                              #{index + 1}
                            </div>
                          </div>

                          {/* Task Description */}
                          <div className="mb-2">
                            <p className="text-white text-xs font-medium line-clamp-2 leading-tight">
                              {task.description}
                            </p>
                          </div>

                          {/* Agent Assignment */}
                          <div className="flex items-center gap-2">
                            <div
                              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: colorStyle.bg,
                                borderColor: colorStyle.border,
                                color: colorStyle.text
                              }}
                            >
                              <IconComponent className="w-3 h-3" />
                              <span>{task.assigned_agent}</span>
                            </div>
                          </div>

                          {/* Running animation */}
                          {task.status === 'running' && (
                            <motion.div
                              className="absolute inset-0 rounded-lg border-2 border-blue-500"
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Original Prompt Display */}
                <div className="absolute top-4 left-4 right-4 z-20">
                  <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Original Request:</div>
                    <div className="text-white text-sm line-clamp-2">{originalPrompt}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskVisualization;