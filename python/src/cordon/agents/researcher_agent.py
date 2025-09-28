"""
Enhanced Researcher Agent with web scraping capabilities.
"""
from typing import Optional, Any, Callable, Union, AsyncIterable
from dataclasses import dataclass
import asyncio
import json

from cordon.agents import Agent, AgentOptions
from cordon.types import ConversationMessage, ParticipantRole
from cordon.utils.tool import AgentTool, AgentTools
from cordon.utils.web_scraper import web_scraper


@dataclass
class ResearcherAgentOptions(AgentOptions):
    # Callable signature: (prompt: str, system: str | None, user_id: str, session_id: str, chat_history: list[ConversationMessage], params: dict | None) -> str
    generate: Callable[[str, Optional[str], str, str, list[ConversationMessage], Optional[dict]], str] = None


class ResearcherAgent(Agent):
    """Enhanced researcher agent with web scraping capabilities."""

    def __init__(self, options: ResearcherAgentOptions):
        if options.generate is None:
            raise ValueError("ResearcherAgentOptions.generate is required")
        super().__init__(options)
        self._system_prompt: Optional[str] = None
        self._streaming_enabled: bool = False
        self._generate = options.generate
        
        # Initialize web scraping tools
        self._setup_web_tools()

    def _setup_web_tools(self):
        """Setup web scraping tools for the researcher."""
        self.web_tools = AgentTools([
            AgentTool(
                name="scrape_webpage",
                description="Scrape content from a specific webpage URL",
                properties={
                    "url": {
                        "type": "string",
                        "description": "The URL of the webpage to scrape"
                    },
                    "max_length": {
                        "type": "integer", 
                        "description": "Maximum length of content to return (default: 5000)",
                        "default": 5000
                    }
                },
                required=["url"],
                func=self._scrape_webpage
            ),
            AgentTool(
                name="search_web",
                description="Search the web for information (placeholder - use scrape_webpage for specific URLs)",
                properties={
                    "query": {
                        "type": "string",
                        "description": "The search query"
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "Number of results to return (default: 5)",
                        "default": 5
                    }
                },
                required=["query"],
                func=self._search_web
            )
        ])

    async def _scrape_webpage(self, url: str, max_length: int = 5000) -> str:
        """Scrape content from a webpage."""
        result = web_scraper.scrape_url(url, max_length)
        
        if result['success']:
            return f"""Webpage Content:
URL: {result['url']}
Title: {result['title']}
Content Length: {result['content_length']} characters

Content:
{result['content']}"""
        else:
            return f"Error scraping webpage: {result['error']}"

    async def _search_web(self, query: str, num_results: int = 5) -> str:
        """Search the web (placeholder implementation)."""
        result = web_scraper.search_web(query, num_results)
        
        if result['success']:
            return f"Search results for '{query}':\n{result['results']}"
        else:
            return f"Search error: {result['error']}\nSuggestion: {result['suggestion']}"

    def set_system_prompt(self, prompt: str) -> None:
        self._system_prompt = prompt

    def is_streaming_enabled(self) -> bool:
        return self._streaming_enabled

    def get_available_tools(self) -> AgentTools:
        """Get the web scraping tools available to this agent."""
        return self.web_tools

    async def process_request(
        self,
        input_text: str,
        user_id: str,
        session_id: str,
        chat_history: list[ConversationMessage],
        additional_params: Optional[dict[str, Any]] = None
    ) -> Union[ConversationMessage, AsyncIterable[Any]]:
        # Enhanced system prompt for web scraping capabilities
        enhanced_system_prompt = self._get_enhanced_system_prompt()
        
        # Run sync generate in a thread pool to keep async contract
        def _run():
            return self._generate(
                input_text,
                enhanced_system_prompt,
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

    def _get_enhanced_system_prompt(self) -> str:
        """Get the enhanced system prompt with web scraping capabilities."""
        base_prompt = self._system_prompt or """You are a Researcher agent that answers research questions and provides analysis."""
        
        web_capabilities = """

WEB SCRAPING CAPABILITIES:
You have access to web scraping tools that allow you to:
1. Scrape content from specific webpages using the scrape_webpage tool
2. Search the web for information (limited - use specific URLs when possible)

When you need current information from the internet:
- Use scrape_webpage with specific URLs when you know the source
- Always cite your sources when using scraped content
- Be mindful of content length limits
- If a webpage fails to load, try alternative sources

Example usage:
- "Scrape the latest news from https://example.com/news"
- "Get information from the Wikipedia page about AI"
- "Check the current weather from a weather website"

Remember to always verify information from multiple sources when possible."""
        
        return base_prompt + web_capabilities
