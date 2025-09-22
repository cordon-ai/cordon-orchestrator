from fastapi import APIRouter
from datetime import datetime
from ..models.schemas import HealthResponse
from ..services.agent_service import agent_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    orchestrator_initialized = agent_service.orchestrator is not None
    agents_count = len(agent_service.orchestrator.agents) if agent_service.orchestrator else 0
    supervisor_active = agent_service.orchestrator.supervisor is not None if agent_service.orchestrator else False

    return HealthResponse(
        status="healthy",
        message="Cordon AI Backend is running",
        orchestrator_initialized=orchestrator_initialized,
        agents_count=agents_count,
        supervisor_active=supervisor_active,
        timestamp=datetime.now().isoformat()
    )