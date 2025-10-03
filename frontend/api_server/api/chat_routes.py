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
            # Stage 1: Initial setup
            yield sse({"type": "thinking", "message": "🔄 Starting task orchestration..."})

            # Stage 2: Route through orchestrator to get task-based response
            # Create a queue to collect progress updates for real-time streaming
            import asyncio
            progress_queue = asyncio.Queue()
            
            # Progress callback that puts updates in the queue
            def progress_callback(update):
                try:
                    progress_queue.put_nowait(update)
                except asyncio.QueueFull:
                    pass  # Skip if queue is full

            # Start the orchestrator task
            orchestrator_task = asyncio.create_task(
                agent_service.route_request(
                    request.message,
                    request.user_id,
                    request.session_id,
                    progress_callback
                )
            )

            # Stream progress updates in real-time while orchestrator is running
            while not orchestrator_task.done():
                try:
                    # Wait for progress update with timeout
                    update = await asyncio.wait_for(progress_queue.get(), timeout=0.1)
                    yield sse(update)
                    await asyncio.sleep(0.02)  # Faster streaming
                except asyncio.TimeoutError:
                    # No update available, continue waiting
                    continue

            # Get the final response
            response = await orchestrator_task

            # Stream any remaining progress updates
            while not progress_queue.empty():
                try:
                    update = progress_queue.get_nowait()
                    yield sse(update)
                    await asyncio.sleep(0.02)
                except asyncio.QueueEmpty:
                    break

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