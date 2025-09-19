#!/usr/bin/env python3
"""
Integrated startup script for Cordon AI Frontend
This script combines the frontend with the existing cordon package functionality
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

# Import cordon components
from cordon.agents.generic_llm_agent import GenericLLMAgent, GenericLLMAgentOptions
from cordon.orchestrator import AgentTeam
from cordon.types import AgentTeamConfig, ConversationMessage, ParticipantRole
from cordon.agents.openai_agent import OpenAIAgent, OpenAIAgentOptions
from cordon.agents.anthropic_agent import AnthropicAgent, AnthropicAgentOptions

# Initialize FastAPI app
app = FastAPI(title="Cordon AI Frontend", version="1.0.0")

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

# Global orchestrator instance
orchestrator = None
active_connections: Dict[str, WebSocket] = {}

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
    requestCount: int
    capabilities: List[str] = []

class MarketplaceAgent(BaseModel):
    id: str
    name: str
    category: str  # Changed from 'category' to match frontend
    description: str
    icon: str
    rating: float
    downloads: int
    capabilities: List[str] = []
    requires_api_key: bool = False
    api_key_placeholder: str = ""
    agent_type: str = "GenericLLMAgent"  # Type of agent class to instantiate
    api_key: Optional[str] = None  # API key for agents that require it

# Helper function to get agent capabilities
def get_agent_capabilities(agent_name: str) -> List[str]:
    """Get capabilities for a given agent"""
    capabilities_map = {
        "Researcher": ["Research", "Analysis", "Data gathering", "Fact checking"],
        "Coder": ["Programming", "Code review", "Debugging", "Software development"],
        "Supervisor": ["Classification", "Routing", "Coordination", "Management"],
        "Writer": ["Content creation", "Editing", "Proofreading", "Creative writing"],
        "Data Analyst": ["Data analysis", "Statistics", "Visualization", "Reporting"],
        "Designer": ["UI/UX design", "Graphics", "Prototyping", "Visual design"],
        "Translator": ["Language translation", "Localization", "Cultural adaptation"]
    }
    return capabilities_map.get(agent_name, ["General assistance"])

# Initialize the orchestrator
def initialize_orchestrator():
    global orchestrator
    
    orchestrator = AgentTeam(options=AgentTeamConfig(
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

async def stream_response(session_id: str, response_text: str, agent_name: str):
    """Stream response word by word via WebSocket"""
    words = response_text.split(' ')
    current_content = ''
    
    for word in words:
        current_content += word + ' '
        await manager.send_message(session_id, {
            "type": "message",
            "role": "assistant",
            "content": current_content.strip(),
            "agent_name": agent_name,
            "isStreaming": True
        })
        await asyncio.sleep(0.05)  # Small delay for streaming effect
    
    # Send final message
    await manager.send_message(session_id, {
        "type": "message",
        "role": "assistant",
        "content": response_text,
        "agent_name": agent_name,
        "isStreaming": False
    })

# Routes
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Cordon AI Backend is running",
        "orchestrator_initialized": orchestrator is not None,
        "agents_count": len(orchestrator.agents) if orchestrator else 0,
        "supervisor_active": orchestrator.supervisor is not None if orchestrator else False,
        "timestamp": datetime.now().isoformat()
    }

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

@app.get("/api/marketplace", response_model=List[MarketplaceAgent])
async def get_marketplace_agents():
    """Get available agents from marketplace"""
    marketplace_agents = [
        # AI Provider Agents (require API keys)
        MarketplaceAgent(
            id="openai_001",
            name="OpenAI Agent",
            category="AI Provider",
            description="Advanced AI agent powered by OpenAI's GPT models for intelligent conversations and task completion",
            icon="🤖",
            rating=4.9,
            downloads=2500,
            capabilities=["Natural language processing", "Code generation", "Creative writing", "Analysis", "Problem solving"],
            requires_api_key=True,
            api_key_placeholder="sk-...",
            agent_type="OpenAIAgent"
        ),
        MarketplaceAgent(
            id="anthropic_001",
            name="Anthropic Assistant",
            category="AI Provider",
            description="Versatile AI assistant powered by Anthropic's Claude models for comprehensive assistance",
            icon="🧠",
            rating=4.8,
            downloads=1800,
            capabilities=["Conversational AI", "Reasoning", "Analysis", "Creative tasks", "Technical assistance"],
            requires_api_key=True,
            api_key_placeholder="sk-ant-...",
            agent_type="AnthropicAgent"
        ),
        # Generic Agents (no API key required)
        MarketplaceAgent(
            id="writer_001",
            name="Writer",
            category="Content",
            description="Professional content writer specializing in articles, blogs, and creative writing",
            icon="✍️",
            rating=4.8,
            downloads=1250,
            capabilities=["Content creation", "Editing", "Proofreading", "Creative writing"],
            requires_api_key=False,
            agent_type="GenericLLMAgent"
        ),
        MarketplaceAgent(
            id="data_analyst_001",
            name="Data Analyst",
            category="Analytics",
            description="Expert in data analysis, statistics, and creating insightful reports",
            icon="📊",
            rating=4.9,
            downloads=980,
            capabilities=["Data analysis", "Statistics", "Visualization", "Reporting"],
            requires_api_key=False,
            agent_type="GenericLLMAgent"
        ),
        MarketplaceAgent(
            id="designer_001",
            name="Designer",
            category="Design",
            description="UI/UX designer with expertise in modern design principles and prototyping",
            icon="🎨",
            rating=4.7,
            downloads=750,
            capabilities=["UI/UX design", "Graphics", "Prototyping", "Visual design"],
            requires_api_key=False,
            agent_type="GenericLLMAgent"
        ),
        MarketplaceAgent(
            id="translator_001",
            name="Translator",
            category="Language",
            description="Multi-language translator with expertise in technical and creative translation",
            icon="🌐",
            rating=4.6,
            downloads=650,
            capabilities=["Language translation", "Localization", "Cultural adaptation"],
            requires_api_key=False,
            agent_type="GenericLLMAgent"
        ),
        MarketplaceAgent(
            id="marketing_001",
            name="Marketing Specialist",
            category="Marketing",
            description="Digital marketing expert specializing in campaigns and strategy",
            icon="📈",
            rating=4.5,
            downloads=420,
            capabilities=["Campaign planning", "SEO", "Social media", "Analytics"],
            requires_api_key=False,
            agent_type="GenericLLMAgent"
        ),
        MarketplaceAgent(
            id="consultant_001",
            name="Business Consultant",
            category="Business",
            description="Strategic business consultant with expertise in operations and growth",
            icon="💼",
            rating=4.8,
            downloads=890,
            capabilities=["Strategy", "Operations", "Growth planning", "Analysis"],
            requires_api_key=False,
            agent_type="GenericLLMAgent"
        )
    ]
    
    return marketplace_agents

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
            requestCount=0,
            capabilities=get_agent_capabilities(agent.name)
        ))
    
    if orchestrator.supervisor:
        agents.append(AgentInfo(
            id=orchestrator.supervisor.id,
            name=orchestrator.supervisor.name,
            description=orchestrator.supervisor.description,
            type="Supervisor",
            status="active",
            requestCount=0,
            capabilities=get_agent_capabilities(orchestrator.supervisor.name)
        ))
    
    return agents

@app.post("/api/agents/debug")
async def debug_add_agent(request: dict):
    """Debug endpoint to see what data is being sent"""
    print(f"Raw request data: {request}")
    return {"received": request}

@app.post("/api/agents")
async def add_agent(agent: MarketplaceAgent):
    """Add a new agent to the orchestrator"""
    try:
        print(f"Received agent data: {agent}")
        
        # Create agent based on type
        if agent.agent_type == "OpenAIAgent":
            if not agent.api_key:
                raise HTTPException(status_code=400, detail="OpenAI API key is required")
            new_agent = OpenAIAgent(OpenAIAgentOptions(
                name=agent.name,
                description=agent.description,
                api_key=agent.api_key
            ))
        elif agent.agent_type == "AnthropicAgent":
            if not agent.api_key:
                raise HTTPException(status_code=400, detail="Anthropic API key is required")
            new_agent = AnthropicAgent(AnthropicAgentOptions(
                name=agent.name,
                description=agent.description,
                api_key=agent.api_key
            ))
        else:  # GenericLLMAgent (default)
            new_agent = GenericLLMAgent(GenericLLMAgentOptions(
                name=agent.name,
                description=agent.description,
                generate=my_model_generate,
            ))
        
        orchestrator.add_agent(new_agent)
        return {"message": f"Agent '{agent.name}' added successfully", "agent_id": new_agent.id}
        
    except Exception as e:
        print(f"Error adding agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adding agent: {str(e)}")

class UpdateAgentRequest(BaseModel):
    agent_id: str
    api_key: str

@app.put("/api/agents/{agent_id}")
async def update_agent(agent_id: str, request: UpdateAgentRequest):
    """Update an agent's API key"""
    try:
        # Find the agent
        agent_found = None
        agent_index = None
        
        for i, agent in enumerate(orchestrator.agents):
            if agent.id == agent_id:
                agent_found = agent
                agent_index = i
                break
        
        if not agent_found:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Update API key based on agent type
        if isinstance(agent_found, OpenAIAgent):
            # Create new OpenAI agent with updated API key
            updated_agent = OpenAIAgent(OpenAIAgentOptions(
                name=agent_found.name,
                description=agent_found.description,
                api_key=request.api_key
            ))
            orchestrator.agents[agent_index] = updated_agent
        elif isinstance(agent_found, AnthropicAgent):
            # Create new Anthropic agent with updated API key
            updated_agent = AnthropicAgent(AnthropicAgentOptions(
                name=agent_found.name,
                description=agent_found.description,
                api_key=request.api_key
            ))
            orchestrator.agents[agent_index] = updated_agent
        else:
            raise HTTPException(status_code=400, detail="This agent type does not support API key updates")
        
        return {"message": f"Agent '{agent_found.name}' API key updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating agent: {str(e)}")

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
    print("Based on test_generic_llm_agent.py configuration")
    # Initialize orchestrator before starting
    initialize_orchestrator()
    print("🚀 Cordon AI Frontend started!")
    print(f"📊 Orchestrator initialized with {len(orchestrator.agents)} agents")
    if orchestrator.supervisor:
        print(f"🎯 Supervisor agent: {orchestrator.supervisor.name}")
    print("🌐 Frontend available at: http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
