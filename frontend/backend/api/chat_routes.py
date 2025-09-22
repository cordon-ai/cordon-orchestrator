import asyncio
from fastapi import APIRouter, HTTPException
from ..models.schemas import ChatRequest, ChatResponse
from ..services.agent_service import agent_service
from ..services.websocket_service import connection_manager

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Handle chat requests and route to appropriate agent"""
    try:
        # Route the request through the orchestrator
        response = await agent_service.route_request(
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
        await connection_manager.send_message(request.session_id, {
            "type": "agent_responding",
            "agent_name": agent_name,
            "message": f"{agent_name} is responding..."
        })

        # Simulate processing time
        await asyncio.sleep(0.5)

        # Send streaming response
        await connection_manager.stream_response(request.session_id, response_text, agent_name)

        return ChatResponse(
            response=response_text,
            agent_name=agent_name,
            session_id=request.session_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")