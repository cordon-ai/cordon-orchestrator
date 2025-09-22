from pydantic import BaseModel
from typing import List, Optional


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
    category: str
    description: str
    icon: str
    rating: float
    downloads: int
    capabilities: List[str] = []
    requires_api_key: bool = False
    api_key_placeholder: str = ""
    agent_type: str = "GenericLLMAgent"
    api_key: Optional[str] = None


class UpdateAgentRequest(BaseModel):
    agent_id: str
    api_key: str


class HealthResponse(BaseModel):
    status: str
    message: str
    orchestrator_initialized: bool
    agents_count: int
    supervisor_active: bool
    timestamp: str