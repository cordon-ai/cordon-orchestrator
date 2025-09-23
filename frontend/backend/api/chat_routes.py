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
            # Stage 1: Supervisor thinking indicator
            yield f"data: {{\"type\": \"thinking\", \"message\": \"Supervisor analyzing request...\"}}\n\n"
            await asyncio.sleep(0.5)

            # Stage 2: Route through orchestrator to get agent selection
            response = await agent_service.route_request(
                request.message,
                request.user_id,
                request.session_id
            )

            # Extract agent name and initial response
            if hasattr(response, 'metadata'):
                agent_name = response.metadata.agent_name
                if hasattr(response.output, 'content'):
                    response_text = response.output.content[0]['text']
                else:
                    response_text = str(response.output)
            else:
                agent_name = "Unknown"
                response_text = str(response)

            # Stage 3: Agent selected indicator
            yield f"data: {{\"type\": \"agent_selected\", \"agent\": \"{agent_name}\"}}\n\n"
            await asyncio.sleep(0.3)
            # Stage 4: Start
            yield sse({"type": "response_start", "agent": agent_name})

            # Tokenize preserving ALL whitespace (spaces, tabs, newlines)
            # Matches either a run of whitespace (\s+) or a run of non-whitespace (\S+)
            for m in re.finditer(r"\s+|\S+", response_text):
                chunk = m.group(0)
                # Send the chunk exactly as-is; the client should concatenate in order
                yield sse({"type": "content", "content": chunk})
                await asyncio.sleep(0.05)

            # Stage 5: Complete
            yield sse({"type": "complete", "agent": agent_name})
            yield "data: [DONE]\n\n"

        return StreamingResponse(
                stream_generator(),
                media_type="text/event-stream",  # correct SSE content type
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",   # helpful with some proxies
                },
        )
        #     # Stage 4: Start streaming the actual response
        #     yield f"data: {{\"type\": \"response_start\", \"agent\": \"{agent_name}\"}}\n\n"

        #     # Stream the response word by word for better UX
        #     words = response_text.split()
        #     for i, word in enumerate(words):
        #         chunk = word + (" " if i < len(words) - 1 else "")
        #         yield f"data: {{\"type\": \"content\", \"content\": \"{chunk}\"}}\n\n"
        #         await asyncio.sleep(0.05)  # Small delay for streaming effect

        #     # Stage 5: Final completion
        #     yield f"data: {{\"type\": \"complete\", \"agent\": \"{agent_name}\"}}\n\n"
        #     yield "data: [DONE]\n\n"

        # return StreamingResponse(
        #     stream_generator(),
        #     media_type="text/plain",
        #     headers={
        #         "Cache-Control": "no-cache",
        #         "Connection": "keep-alive",
        #         "Content-Type": "text/event-stream",
        #     }
        # )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")