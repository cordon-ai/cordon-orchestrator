from fastapi import APIRouter, HTTPException
from typing import List
from ..models.schemas import AgentInfo, MarketplaceAgent, UpdateAgentRequest
from ..services.agent_service import agent_service

router = APIRouter()


@router.get("/marketplace", response_model=List[MarketplaceAgent])
async def get_marketplace_agents():
    """Get available agents from marketplace"""
    return agent_service.get_marketplace_agents()


@router.get("/agents", response_model=List[AgentInfo])
async def get_agents():
    """Get list of current agents"""
    return agent_service.get_current_agents()


@router.post("/agents/debug")
async def debug_add_agent(request: dict):
    """Debug endpoint to see what data is being sent"""
    print(f"Raw request data: {request}")
    return {"received": request}


@router.post("/agents")
async def add_agent(agent: MarketplaceAgent):
    """Add a new agent to the orchestrator"""
    try:
        print(f"Received agent data: {agent}")
        agent_id = agent_service.add_agent(agent)
        return {"message": f"Agent '{agent.name}' added successfully", "agent_id": agent_id}

    except Exception as e:
        print(f"Error adding agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adding agent: {str(e)}")


@router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, request: UpdateAgentRequest):
    """Update an agent's API key"""
    try:
        # For now, this is a placeholder - updating API keys requires recreating agents
        # This would need to be implemented based on specific requirements
        return {"message": f"Agent API key update not yet implemented"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating agent: {str(e)}")


@router.delete("/agents/{agent_id}")
async def remove_agent(agent_id: str):
    """Remove an agent from the orchestrator"""
    try:
        agent_name = agent_service.remove_agent(agent_id)
        return {"message": f"Agent '{agent_name}' removed successfully"}

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing agent: {str(e)}")