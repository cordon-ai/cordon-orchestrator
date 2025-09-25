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
            progress_updates = []

            # Progress callback to collect updates
            def progress_callback(update):
                progress_updates.append(update)

            # Stage 1: Initial setup
            yield sse({"type": "thinking", "message": "🔄 Starting task orchestration..."})

            # Stage 2: Route through orchestrator to get task-based response
            response = await agent_service.route_request(
                request.message,
                request.user_id,
                request.session_id,
                progress_callback
            )

            # Stream all collected progress updates
            for update in progress_updates:
                yield sse(update)
                await asyncio.sleep(0.02)  # Faster streaming

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

            # Stream the response in optimized chunks for better performance
            if response_text:
                # Smart chunking - balance between readability and performance
                chunk_size = 50  # characters per chunk
                words = response_text.split()
                current_chunk = ""

                for word in words:
                    if len(current_chunk + " " + word) > chunk_size and current_chunk:
                        # Send current chunk
                        yield sse({"type": "content", "content": current_chunk + " "})
                        await asyncio.sleep(0.01)  # Much faster streaming
                        current_chunk = word
                    else:
                        current_chunk += (" " + word if current_chunk else word)

                # Send remaining chunk
                if current_chunk:
                    yield sse({"type": "content", "content": current_chunk})

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