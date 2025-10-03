# Cordon AI

A multi-agent orchestrator with web frontend and React UI.

## Installation

Install all requirements including frontend API server dependencies:
```bash
pip install -e .[frontend,dev]
```

## Running the Application

### 1. Start the Python Backend (Frontend API Server)
```bash
cd frontend
python start_frontend.py
```

### 2. Start the React Frontend
```bash
cd frontend/cordon-react
npm install
npm start
```

### 3. Setup Local Model (Optional - Ollama)
For local AI model support:
```bash
ollama serve
ollama pull llama3.1:8b
```

## Architecture

- **Backend**: Python orchestrator with FastAPI frontend server
- **Frontend**: React application with modern UI
- **Agents**: Multiple AI agents (Researcher, Coder, CommandExecutor, etc.)
- **LLM Integration**: Supports OpenAI, Anthropic, and local Ollama models

## Features

- Multi-agent orchestration system
- Real-time WebSocket communication
- Web scraping capabilities
- Agent marketplace with custom agents
- Streaming responses
- Cross-platform support