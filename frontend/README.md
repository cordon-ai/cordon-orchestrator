# Cordon AI Frontend

A modern web interface for the Cordon AI multi-agent orchestrator system.

## Features

- **Chat Interface**: Interactive chat with the orchestrator that routes requests to appropriate agents
- **Agent Marketplace**: Browse and add new agents to your orchestrator
- **Agent Management**: View and manage current agents
- **Real-time Communication**: WebSocket support for live updates
- **Responsive Design**: Modern UI built with Tailwind CSS and Alpine.js

## Quick Start

1. **Run the integrated frontend:**
   ```bash
   cd frontend
   ./run.sh
   ```

2. **Or run manually:**
   ```bash
   cd frontend
   pip install -r requirements.txt
   python3 start_integrated.py
   ```

3. **Open your browser:**
   ```
   http://localhost:8000
   ```

## Architecture

The frontend integrates with the existing Cordon Python package:

- **Backend**: FastAPI server (`start_integrated.py`)
- **Frontend**: HTML/CSS/JS with Alpine.js (`templates/index.html`)
- **Integration**: Uses the same orchestrator configuration as `test_generic_llm_agent.py`

## API Endpoints

- `GET /` - Main frontend interface
- `POST /api/chat` - Send chat messages
- `GET /api/agents` - List current agents
- `POST /api/agents` - Add new agent
- `DELETE /api/agents/{id}` - Remove agent
- `GET /api/health` - Health check
- `WS /ws/{session_id}` - WebSocket connection

## Default Agents

The frontend comes with the same default agents as the test file:

- **Researcher**: Handles research tasks and analysis
- **Coder**: Assists with programming and development
- **Supervisor**: Classifies requests and routes to appropriate agents

## Customization

You can customize the frontend by:

1. **Adding new agents** through the marketplace
2. **Modifying agent responses** in `my_model_generate()` function
3. **Styling** by editing the CSS in `templates/index.html`
4. **Adding features** by extending the FastAPI routes

## Integration with Existing Code

This frontend is designed to work seamlessly with the existing Cordon package:

- Uses the same `AgentTeam` orchestrator
- Implements the same agent configuration
- Maintains compatibility with existing agent types
- Can be extended to support additional agent types

## Development

To extend the frontend:

1. **Add new API endpoints** in `start_integrated.py`
2. **Update the frontend** in `templates/index.html`
3. **Add new agent types** by importing from the cordon package
4. **Test integration** with the existing test files

## Requirements

- Python 3.8+
- FastAPI
- Uvicorn
- WebSocket support
- Modern web browser

## Troubleshooting

- **Port 8000 in use**: Change the port in `start_integrated.py`
- **Import errors**: Ensure the Python src directory is in the path
- **WebSocket issues**: Check browser console for connection errors
- **Agent not responding**: Verify the orchestrator is properly initialized

## Next Steps

- Add support for streaming responses
- Implement agent configuration UI
- Add user authentication
- Support for custom agent types
- Integration with external LLM services
