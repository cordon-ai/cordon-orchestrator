from typing import Optional, Any, Callable, Union, AsyncIterable
from dataclasses import dataclass
import asyncio

from cordon.agents import Agent, AgentOptions
from cordon.types import ConversationMessage, ParticipantRole



@dataclass
class GenericLLMAgentOptions(AgentOptions):
    # Callable signature: (prompt: str, system: str | None, user_id: str, session_id: str, chat_history: list[ConversationMessage], params: dict | None) -> str
    generate: Callable[[str, Optional[str], str, str, list[ConversationMessage], Optional[dict]], str] = None


class GenericLLMAgent(Agent):
    """Adapter agent that allows plugging any text generation backend via a callable.

    Satisfies SupervisorAgent's duck-typed requirements:
    - set_system_prompt(str)
    - process_request(...)
    - is_streaming_enabled() -> bool
    - tool wiring via set_tool_config(tool, tool_max_recursions) or tool_config attr
    """

    def __init__(self, options: GenericLLMAgentOptions):
        if options.generate is None:
            raise ValueError("GenericLLMAgentOptions.generate is required")
        super().__init__(options)
        self._system_prompt: Optional[str] = None
        self._streaming_enabled: bool = False
        self.tool_config: Optional[dict] = None
        self._generate = options.generate

    def set_system_prompt(self, prompt: str) -> None:
        self._system_prompt = prompt

    def is_streaming_enabled(self) -> bool:
        return self._streaming_enabled

    def set_tool_config(self, tool, tool_max_recursions: int) -> None:
        self.tool_config = {
            'tool': tool,
            'toolMaxRecursions': tool_max_recursions,
        }

    async def process_request(
        self,
        input_text: str,
        user_id: str,
        session_id: str,
        chat_history: list[ConversationMessage],
        additional_params: Optional[dict[str, Any]] = None
    ) -> Union[ConversationMessage, AsyncIterable[Any]]:
        # Run sync generate in a thread pool to keep async contract
        def _run():
            return self._generate(
                input_text,
                self._system_prompt,
                user_id,
                session_id,
                chat_history,
                additional_params,
            )

        text = await asyncio.to_thread(_run)
        return ConversationMessage(
            role=ParticipantRole.ASSISTANT.value,
            content=[{"text": text}]
        )


