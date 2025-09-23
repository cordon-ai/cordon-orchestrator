import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../../types';
import { getAgentIcon, getAgentColorStyle } from '../../utils/agentHelpers';

interface MessageBubbleProps {
  message: Message;
  index: number;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, index }) => {
  const IconComponent = getAgentIcon(message.agentName || '');

  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`chat-bubble ${message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-agent'} max-w-2xl`}>
        {message.role === 'assistant' && message.agentName && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="agent-badge mb-3"
            style={{
              backgroundColor: getAgentColorStyle(message.agentName).bg,
              borderColor: getAgentColorStyle(message.agentName).border,
              color: getAgentColorStyle(message.agentName).text
            }}
          >
            <IconComponent className="w-5 h-5" />
            <span className="font-medium">{message.agentName}</span>
          </motion.div>
        )}
        <div className="streaming-text">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom styling for markdown elements
              h1: ({children}: any) => <h1 className="text-xl font-bold mb-2 text-white">{children}</h1>,
              h2: ({children}: any) => <h2 className="text-lg font-bold mb-2 text-white">{children}</h2>,
              h3: ({children}: any) => <h3 className="text-base font-bold mb-1 text-white">{children}</h3>,
              p: ({children}: any) => <p className="mb-2 text-white">{children}</p>,
              strong: ({children}: any) => <strong className="font-bold text-white">{children}</strong>,
              em: ({children}: any) => <em className="italic text-white">{children}</em>,
              code: ({children, className, ...props}: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                const isInline = !className;
                
                if (isInline) {
                  return <code className="bg-gray-700 px-1 py-0.5 rounded text-sm text-green-400">{children}</code>;
                }
                
                return (
                  <div className="my-4 rounded-lg overflow-hidden border border-gray-600">
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={language || 'text'}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        backgroundColor: '#1e1e1e',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                      }}
                      codeTagProps={{
                        style: {
                          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                        }
                      }}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                );
              },
              pre: ({children}: any) => {
                // The SyntaxHighlighter handles pre styling, so we just pass through
                return <>{children}</>;
              },
              ul: ({children}: any) => <ul className="list-disc list-inside mb-2 text-white">{children}</ul>,
              ol: ({children}: any) => <ol className="list-decimal list-inside mb-2 text-white">{children}</ol>,
              li: ({children}: any) => <li className="mb-1 text-white">{children}</li>,
              blockquote: ({children}: any) => <blockquote className="border-l-4 border-gray-500 pl-4 italic text-gray-300 mb-2">{children}</blockquote>,
              a: ({children, href}: any) => <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
            }}
          >
            {message.content}
          </ReactMarkdown>
          {message.isStreaming && (
            <span className="cursor-blink" />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;