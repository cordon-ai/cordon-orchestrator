#!/usr/bin/env python3
"""
Simplified Cordon AI Frontend
This version works without requiring all optional dependencies
"""

import os
import sys
import asyncio
import json
import uuid
import requests
from typing import Dict, List, Optional, Any
from datetime import datetime

# Add the Python src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python', 'src'))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import uvicorn

# Import only the core components we need
from cordon.agents.generic_llm_agent import GenericLLMAgent, GenericLLMAgentOptions
from cordon.orchestrator import AgentSquad
from cordon.types import AgentSquadConfig, ConversationMessage, ParticipantRole

# Global orchestrator instance
orchestrator = AgentSquad(options=AgentSquadConfig(
  LOG_AGENT_CHAT=True,
  LOG_CLASSIFIER_CHAT=True,
  LOG_CLASSIFIER_RAW_OUTPUT=True,
  LOG_CLASSIFIER_OUTPUT=True,
  LOG_EXECUTION_TIMES=True,
  MAX_RETRIES=3,
  USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED=True,
  MAX_MESSAGE_PAIRS_PER_AGENT=10
))


# Lifespan event handler (modern FastAPI approach)
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    initialize_orchestrator()
    print("🚀 Cordon AI Frontend started!")
    print(f"📊 Orchestrator initialized with {len(orchestrator.agents)} agents")
    if orchestrator.supervisor:
        print(f"🎯 Supervisor agent: {orchestrator.supervisor.name}")
    print("🌐 Frontend available at: http://localhost:8000")
    yield
    # Shutdown (if needed)
    print("🛑 Shutting down Cordon AI Frontend...")

# Initialize FastAPI app with lifespan
app = FastAPI(title="Cordon AI Frontend", version="1.0.0", lifespan=lifespan)

# Add CORS middleware for React frontend
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Pydantic models for API
class ChatRequest(BaseModel):
    message: str
    session_id: str
    user_id: str

class ChatResponse(BaseModel):
    response: str
    agent_name: str
    session_id: str

class AgentInfo(BaseModel):
    id: str
    name: str
    description: str
    type: str
    status: str
    requestCount: int = 0

class MarketplaceAgent(BaseModel):
    id: str
    name: str
    category: str
    description: str
    icon: str
    rating: float
    downloads: int

# Initialize the orchestrator
def initialize_orchestrator():
    global orchestrator
    
    orchestrator = AgentSquad(options=AgentSquadConfig(
        LOG_AGENT_CHAT=True,
        LOG_CLASSIFIER_CHAT=True,
        LOG_CLASSIFIER_RAW_OUTPUT=True,
        LOG_CLASSIFIER_OUTPUT=True,
        LOG_EXECUTION_TIMES=True,
        MAX_RETRIES=3,
        USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED=True,
        MAX_MESSAGE_PAIRS_PER_AGENT=10
    ))
    
    # Add default agents
    add_default_agents()

def add_default_agents():
    """Add default agents to the orchestrator"""
    
    # Researcher agent
    researcher = GenericLLMAgent(GenericLLMAgentOptions(
        name="Researcher",
        description="Answers research questions and provides analysis",
        generate=my_model_generate,
    ))
    orchestrator.add_agent(researcher)
    
    # Coder agent
    coder = GenericLLMAgent(GenericLLMAgentOptions(
        name="Coder",
        description="Writes code like a seasoned developer",
        generate=my_model_generate,
    ))
    orchestrator.add_agent(coder)
    
    # Supervisor agent for classification
    supervisor = GenericLLMAgent(GenericLLMAgentOptions(
        name="Supervisor",
        description="Classifies requests and routes them to appropriate agents",
        generate=my_model_generate,
    ))
    
    # Set system prompt for the supervisor
    supervisor.set_system_prompt("""You are a supervisor agent that classifies user requests and routes them to the appropriate specialist agent.

Your job is to analyze the user's request and respond with ONLY the name of the most appropriate agent: "Researcher" or "Coder".

Examples:
- "I need help with Python programming" -> "Coder"
- "Can you research the latest AI trends?" -> "Researcher" 
- "Can you help me do my taxes" -> "Accountant"
- "Find information about climate change" -> "Researcher"
- "Find information about the weather" -> "Weather" 
- "Can you help me with my car insurance" -> "Insurance"
- "Can you help me with my mortgage" -> "Financial Advisor"
- "Can you help me with my student loans" -> "Financial Advisor"
- "Can you help me with my credit card debt" -> "Financial Advisor"
- "Can you help me with my finances" -> "Financial Advisor"
- "Debug my JavaScript code" -> "Coder"
- "Analyze market trends" -> "Researcher"

Respond with only the agent name, nothing else. 

Available agents and their descriptions:
""" + "\n".join([f"- {agent.name}: {agent.description}" for agent in orchestrator.agents]))
    
    orchestrator.add_supervisor(supervisor)

def _to_messages(system, chat_history, prompt):
    """Convert system prompt, chat history, and current prompt to Ollama format"""
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    # chat_history can be list of dicts or objects; try both
    for m in (chat_history or []):
        role = getattr(m, "role", m.get("role"))
        content = getattr(m, "content", m.get("content"))
        # map roles to ollama's chat roles ("user"/"assistant")
        if role in ("assistant", "tool"):
            msgs.append({"role": "assistant", "content": content})
        else:
            msgs.append({"role": "user", "content": content})
    msgs.append({"role": "user", "content": prompt})
    return msgs

def my_model_generate(prompt, system, user_id, session_id, chat_history, params):
    """Enhanced LLM generation function with Ollama integration"""
    
    # Check if Ollama is available, otherwise use mock responses
    try:
        # ---- config
        model = os.getenv("LLAMA_MODEL", "llama3.1:8b")  # e.g., llama3.1:8b / llama3.1:70b
        url   = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")

        temperature = (params or {}).get("temperature", 0.2)
        max_tokens  = (params or {}).get("max_tokens", 512)

        payload = {
            "model": model,
            "messages": _to_messages(system, chat_history, prompt),
            "stream": True,  # Enable streaming
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            },
        }
        
        # Stream the response
        response = requests.post(url, json=payload, stream=True, timeout=600)
        response.raise_for_status()
        
        full_content = ""
        for line in response.iter_lines():
            if line:
                try:
                    data = json.loads(line.decode('utf-8'))
                    if 'message' in data and 'content' in data['message']:
                        content = data['message']['content']
                        if content:  # Only print non-empty content
                            print(content, end='', flush=True)
                            full_content += content
                    elif data.get('done', False):
                        break
                except json.JSONDecodeError:
                    continue
        
        print()  # New line after streaming
        return full_content.strip()
        
    except Exception as e:
        print(f"⚠️ Ollama not available, using mock response: {e}")
        # Fallback to mock responses
        prompt_lower = prompt.lower()
        
        if any(keyword in prompt_lower for keyword in ["code", "programming", "python", "javascript", "function", "debug", "algorithm"]):
            return f"""🤖 **Coder Agent Response**

I'm here to help you with programming tasks! You asked: "{prompt}"

Here's what I can help you with:
- Writing code in various languages (Python, JavaScript, etc.)
- Debugging and fixing code issues
- Algorithm design and optimization
- Code reviews and best practices
- Software architecture guidance

**Example Response:**
```python
# Based on your request, here's a helpful code snippet:
def example_function():
    # Your code implementation here
    return "Hello from Coder agent!"
```

Would you like me to help you with a specific programming task?"""
        
        elif any(keyword in prompt_lower for keyword in ["research", "analysis", "find", "information", "data", "study", "investigate"]):
            return f"""🔍 **Researcher Agent Response**

I'm here to help you with research and analysis! You asked: "{prompt}"

Here's what I can help you with:
- Information gathering and fact-checking
- Data analysis and interpretation
- Research methodology guidance
- Academic and market research
- Trend analysis and insights

**Research Approach:**
1. **Topic Analysis**: Understanding your research question
2. **Information Gathering**: Collecting relevant data and sources
3. **Analysis**: Processing and interpreting the information
4. **Insights**: Providing actionable conclusions

**Example Research Areas:**
- Market trends and analysis
- Academic research topics
- Technology developments
- Business intelligence
- Scientific discoveries

Would you like me to dive deeper into any specific research area?"""
        
        else:
            return f"""👋 **General Assistant Response**

Hello! I'm here to help you with your request: "{prompt}"

I can assist you with:
- **Programming & Development**: Code writing, debugging, technical implementation
- **Research & Analysis**: Information gathering, data analysis, insights

**How I work:**
1. I analyze your request using my supervisor agent
2. I route it to the most appropriate specialist agent
3. I provide detailed, helpful responses

**Try asking me:**
- "Help me write a Python function to sort a list"
- "Research the latest trends in artificial intelligence"
- "Debug this JavaScript code"
- "Analyze the market for electric vehicles"

What would you like help with today?"""

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_text(json.dumps(message))
            except:
                self.disconnect(session_id)

manager = ConnectionManager()

# Routes
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Handle chat requests and route to appropriate agent"""
    try:
        # Route the request through the orchestrator
        response = await orchestrator.route_request(
            request.message, 
            request.user_id, 
            request.session_id
        )
        
        # Extract response content
        if hasattr(response, 'metadata'):
            agent_name = response.metadata.agent_name
            if hasattr(response.output, 'content'):
                response_text = response.output.content[0]['text']
            else:
                response_text = str(response.output)
        else:
            agent_name = "Unknown"
            response_text = str(response)
        
        # Send agent response animation
        await manager.send_message(request.session_id, {
            "type": "agent_responding",
            "agent_name": agent_name,
            "message": f"{agent_name} is responding..."
        })
        
        # Simulate processing time
        await asyncio.sleep(0.5)
        
        # Send streaming response
        await stream_response(request.session_id, response_text, agent_name)
        
        return ChatResponse(
            response=response_text,
            agent_name=agent_name,
            session_id=request.session_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@app.get("/api/agents", response_model=List[AgentInfo])
async def get_agents():
    """Get list of current agents"""
    agents = []
    for agent in orchestrator.agents:
        agents.append(AgentInfo(
            id=agent.id,
            name=agent.name,
            description=agent.description,
            type="GenericLLMAgent",
            status="active",
            requestCount=0
        ))
    
    if orchestrator.supervisor:
        agents.append(AgentInfo(
            id=orchestrator.supervisor.id,
            name=orchestrator.supervisor.name,
            description=orchestrator.supervisor.description,
            type="Supervisor",
            status="active",
            requestCount=0
        ))
    
    return agents

@app.post("/api/agents")
async def add_agent(agent: MarketplaceAgent):
    """Add a new agent to the orchestrator"""
    try:
        new_agent = GenericLLMAgent(GenericLLMAgentOptions(
            name=agent.name,
            description=agent.description,
            generate=my_model_generate,
        ))
        
        orchestrator.add_agent(new_agent)
        return {"message": f"Agent '{agent.name}' added successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding agent: {str(e)}")

@app.delete("/api/agents/{agent_id}")
async def remove_agent(agent_id: str):
    """Remove an agent from the orchestrator"""
    try:
        for i, agent in enumerate(orchestrator.agents):
            if agent.id == agent_id:
                orchestrator.agents.pop(i)
                return {"message": f"Agent '{agent.name}' removed successfully"}
        
        if orchestrator.supervisor and orchestrator.supervisor.id == agent_id:
            orchestrator.supervisor = None
            return {"message": "Supervisor agent removed successfully"}
        
        raise HTTPException(status_code=404, detail="Agent not found")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing agent: {str(e)}")

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time communication"""
    await manager.connect(websocket, session_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(session_id)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "orchestrator_initialized": orchestrator is not None,
        "agents_count": len(orchestrator.agents) if orchestrator else 0,
        "supervisor_active": orchestrator.supervisor is not None if orchestrator else False,
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    print("Starting Cordon AI Frontend...")
    print("This integrates the frontend with the existing cordon package")
    uvicorn.run("simple_frontend:app", host="0.0.0.0", port=8000, reload=True)
