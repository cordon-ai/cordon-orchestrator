import asyncio, json, re
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..models.schemas import ChatRequest, ChatResponse
from ..services.agent_service import agent_service
from ..services.llm_service import generate_llm_response_streaming

router = APIRouter()

def sse(data_obj: dict) -> str:
    # One SSE event with a single data: line containing JSON
    return f"data: {json.dumps(data_obj, ensure_ascii=False)}\n\n"


@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Handle chat requests and route to appropriate agent with real-time streaming"""
    try:
        # Create streaming callback that yields chunks
        async def stream_generator():
            progress_messages = []

            # Progress callback to capture orchestrator updates
            async def progress_callback(update):
                nonlocal progress_messages
                progress_messages.append(update)

            # Stage 1: Initial setup
            yield f"data: {{\"type\": \"thinking\", \"message\": \"🔄 Starting task orchestration...\"}}\n\n"
            await asyncio.sleep(0.2)

            # Stage 2: Route through orchestrator to get task-based response
            response = await agent_service.route_request(
                request.message,
                request.user_id,
                request.session_id,
                progress_callback
            )

            # Stream all the progress messages that were collected
            for update in progress_messages:
                yield f"data: {json.dumps(update)}\n\n"
                await asyncio.sleep(0.1)

            # Extract response information
            if hasattr(response, 'metadata'):
                agent_name = response.metadata.agent_name
                if hasattr(response.output, 'content'):
                    response_text = response.output.content[0]['text']
                else:
                    response_text = str(response.output)
            else:
                agent_name = "Orchestrator"
                response_text = str(response)

            # Stage 3: Final response indicator
            yield f"data: {{\"type\": \"response_start\", \"agent\": \"{agent_name}\"}}\n\n"
            await asyncio.sleep(0.3)

            # Stream the response word by word
            words = response_text.split()
            for i, word in enumerate(words):
                chunk = word + (" " if i < len(words) - 1 else "")
                yield sse({"type": "content", "content": chunk})
                await asyncio.sleep(0.04)

            # Stage 4: Complete
            yield sse({"type": "complete", "agent": agent_name})
            yield "data: [DONE]\n\n"

        return StreamingResponse(
                stream_generator(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")