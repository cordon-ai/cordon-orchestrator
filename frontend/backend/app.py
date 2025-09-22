#!/usr/bin/env python3
"""
Modular Cordon AI Backend Application
Refactored version of start_integrated.py with proper separation of concerns
"""

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from .api.health_routes import router as health_router
from .api.chat_routes import router as chat_router
from .api.agent_routes import router as agent_router
from .api.websocket_routes import router as websocket_router
from .services.agent_service import agent_service


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    app = FastAPI(title="Cordon AI Frontend", version="1.0.0")

    # Add CORS middleware for React frontend
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

    # Include API routers
    app.include_router(health_router, prefix="/api")
    app.include_router(chat_router, prefix="/api")
    app.include_router(agent_router, prefix="/api")
    app.include_router(websocket_router)

    @app.get("/", response_class=HTMLResponse)
    async def read_root(request: Request):
        return templates.TemplateResponse("index.html", {"request": request})

    return app


def initialize_services():
    """Initialize all services"""
    print("Initializing Cordon AI Backend...")
    agent_service.initialize_orchestrator()
    print(f"🚀 Orchestrator initialized with {len(agent_service.orchestrator.agents)} agents")
    if agent_service.orchestrator.supervisor:
        print(f"🎯 Supervisor agent: {agent_service.orchestrator.supervisor.name}")


# Create the app instance
app = create_app()