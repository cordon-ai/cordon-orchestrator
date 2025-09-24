# Orchestrator Canvas Components

This directory contains the React components that implement the Orchestrator Canvas UI, a graph-style chat view that replaces the traditional chat interface.

## Components

### OrchestratorCanvas
The main component that renders the React Flow graph with:
- Header with "Orchestrator" title and input box
- Supervisor node at the top showing task assignments
- Agent nodes that appear as tasks execute
- Pan, zoom, and minimap controls
- Real-time streaming simulation

### SupervisorCard
A React Flow node component that displays:
- Supervisor icon and title
- List of assigned tasks with status indicators
- Real-time task updates as they progress
- Connection handles for linking to agent nodes

### AgentCard
A React Flow node component that shows:
- Agent-specific icon and name
- Current status (queued/running/done/error)
- Live preview of agent output
- Expand button to open detailed modal
- Copy button when task is complete

### AgentDetailsModal
A modal component that displays:
- Full agent transcript with virtualized scrolling
- Structured output in JSON format
- Agent metadata (timestamps, status)
- Copy functionality for agent output
- Responsive design (drawer on mobile)

## Features

- **Graph Visualization**: Uses React Flow for interactive node-based UI
- **Live Streaming**: Simulates real-time agent execution with progressive updates
- **Task Planning**: Intelligently generates tasks based on user input
- **Status Tracking**: Visual status indicators with color-coded pills
- **Expandable Details**: Click any node to see full agent transcript
- **Responsive Design**: Works on desktop and mobile devices
- **Backend Integration**: Connects to existing chat API endpoints

## Usage

The OrchestratorCanvas replaces the traditional ChatPage component in the main App.tsx:

```tsx
<OrchestratorCanvas
  onSendMessage={sendMessage}
  isStreaming={chatState === 'responding'}
  backendConnected={backendConnected}
/>
```

## Styling

Custom CSS classes are defined in App.css:
- `.orchestrator-canvas`: Background gradient for the canvas
- `.orchestrator-node`: Hover effects for node cards
- `.line-clamp-3`: Text truncation utility
- React Flow custom animations and styling

## Integration

The components integrate with the existing:
- `useChat` hook for message handling
- `useBackendConnection` hook for connection status
- Backend chat API endpoints
- Agent management system
