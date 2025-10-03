import asyncio
import json
from typing import Dict
from fastapi import WebSocket


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

    async def stream_response(self, session_id: str, response_text: str, agent_name: str):
        """Stream response word by word via WebSocket"""
        words = response_text.split(' ')
        current_content = ''

        for word in words:
            current_content += word + ' '
            await self.send_message(session_id, {
                "type": "message",
                "role": "assistant",
                "content": current_content.strip(),
                "agent_name": agent_name,
                "isStreaming": True
            })
            await asyncio.sleep(0.05)  # Small delay for streaming effect

        # Send final message
        await self.send_message(session_id, {
            "type": "message",
            "role": "assistant",
            "content": response_text,
            "agent_name": agent_name,
            "isStreaming": False
        })


# Global instance
connection_manager = ConnectionManager()