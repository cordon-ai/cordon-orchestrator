import sys
import os
from typing import List, Dict, Any, Optional

# Add the Python src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'python', 'src'))

from cordon.agents.generic_llm_agent import GenericLLMAgent, GenericLLMAgentOptions
from cordon.orchestrator import AgentTeam
from cordon.types import AgentTeamConfig
from cordon.agents.openai_agent import OpenAIAgent, OpenAIAgentOptions
from cordon.agents.anthropic_agent import AnthropicAgent, AnthropicAgentOptions

from .llm_service import generate_llm_response
from ..models.schemas import AgentInfo, MarketplaceAgent


class AgentService:
    def __init__(self):
        self.orchestrator: Optional[AgentTeam] = None

    def initialize_orchestrator(self):
        """Initialize the orchestrator with default configuration"""
        self.orchestrator = AgentTeam(options=AgentTeamConfig(
            LOG_AGENT_CHAT=True,
            LOG_CLASSIFIER_CHAT=True,
            LOG_CLASSIFIER_RAW_OUTPUT=True,
            LOG_CLASSIFIER_OUTPUT=True,
            LOG_EXECUTION_TIMES=True,
            MAX_RETRIES=3,
            USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED=True,
            MAX_MESSAGE_PAIRS_PER_AGENT=10
        ))

        self._add_default_agents()

    def _add_default_agents(self):
        """Add default agents to the orchestrator"""
        if not self.orchestrator:
            return

        # Researcher agent
        researcher = GenericLLMAgent(GenericLLMAgentOptions(
            name="Researcher",
            description="Answers research questions and provides analysis",
            generate=generate_llm_response,
        ))
        self.orchestrator.add_agent(researcher)

        # Coder agent
        coder = GenericLLMAgent(GenericLLMAgentOptions(
            name="Coder",
            description="Writes code like a seasoned developer",
            generate=generate_llm_response,
        ))
        self.orchestrator.add_agent(coder)

        # Supervisor agent for classification
        supervisor = GenericLLMAgent(GenericLLMAgentOptions(
            name="Supervisor",
            description="Classifies requests and routes them to appropriate agents",
            generate=generate_llm_response,
        ))

        # Set system prompt for the supervisor
        supervisor_prompt = """You are a supervisor agent that classifies user requests and routes them to the appropriate specialist agent.

Your job is to analyze the user's request and respond with ONLY the name of the most appropriate agent: "Researcher" or "Coder".

Examples:
- "I need help with Python programming" -> "Coder"
- "Can you research the latest AI trends?" -> "Researcher"
- "Can you help me do my taxes" -> "Accountant"
- "Find information about climate change" -> "Researcher"
- "Find information about the weather" -> "Weather"
- "Can you help me with my car insurance" -> "Insurance"
- "Can you help me with my mortgage" -> "Financial Advisor"
- "Can you help me with my student loans" -> "Financial Advisor"
- "Can you help me with my credit card debt" -> "Financial Advisor"
- "Can you help me with my finances" -> "Financial Advisor"
- "Debug my JavaScript code" -> "Coder"
- "Analyze market trends" -> "Researcher"

Respond with only the agent name, nothing else.

Available agents and their descriptions:
""" + "\n".join([f"- {agent.name}: {agent.description}" for agent in self.orchestrator.agents])

        supervisor.set_system_prompt(supervisor_prompt)
        self.orchestrator.add_supervisor(supervisor)

    def get_agent_capabilities(self, agent_name: str) -> List[str]:
        """Get capabilities for a given agent"""
        capabilities_map = {
            "Researcher": ["Research", "Analysis", "Data gathering", "Fact checking"],
            "Coder": ["Programming", "Code review", "Debugging", "Software development"],
            "Supervisor": ["Classification", "Routing", "Coordination", "Management"],
            "Writer": ["Content creation", "Editing", "Proofreading", "Creative writing"],
            "Data Analyst": ["Data analysis", "Statistics", "Visualization", "Reporting"],
            "Designer": ["UI/UX design", "Graphics", "Prototyping", "Visual design"],
            "Translator": ["Language translation", "Localization", "Cultural adaptation"]
        }
        return capabilities_map.get(agent_name, ["General assistance"])

    def get_marketplace_agents(self) -> List[MarketplaceAgent]:
        """Get available agents from marketplace"""
        return [
            # AI Provider Agents (require API keys)
            MarketplaceAgent(
                id="openai_001",
                name="OpenAI Agent",
                category="AI Provider",
                description="Advanced AI agent powered by OpenAI's GPT models for intelligent conversations and task completion",
                icon="🤖",
                rating=4.9,
                downloads=2500,
                capabilities=["Natural language processing", "Code generation", "Creative writing", "Analysis", "Problem solving"],
                requires_api_key=True,
                api_key_placeholder="sk-...",
                agent_type="OpenAIAgent"
            ),
            MarketplaceAgent(
                id="anthropic_001",
                name="Anthropic Assistant",
                category="AI Provider",
                description="Versatile AI assistant powered by Anthropic's Claude models for comprehensive assistance",
                icon="🧠",
                rating=4.8,
                downloads=1800,
                capabilities=["Conversational AI", "Reasoning", "Analysis", "Creative tasks", "Technical assistance"],
                requires_api_key=True,
                api_key_placeholder="sk-ant-...",
                agent_type="AnthropicAgent"
            ),
            # Generic Agents (no API key required)
            MarketplaceAgent(
                id="writer_001",
                name="Writer",
                category="Content",
                description="Professional content writer specializing in articles, blogs, and creative writing",
                icon="✍️",
                rating=4.8,
                downloads=1250,
                capabilities=["Content creation", "Editing", "Proofreading", "Creative writing"],
                requires_api_key=False,
                agent_type="GenericLLMAgent"
            ),
            MarketplaceAgent(
                id="data_analyst_001",
                name="Data Analyst",
                category="Analytics",
                description="Expert in data analysis, statistics, and creating insightful reports",
                icon="📊",
                rating=4.9,
                downloads=980,
                capabilities=["Data analysis", "Statistics", "Visualization", "Reporting"],
                requires_api_key=False,
                agent_type="GenericLLMAgent"
            ),
            MarketplaceAgent(
                id="designer_001",
                name="Designer",
                category="Design",
                description="UI/UX designer with expertise in modern design principles and prototyping",
                icon="🎨",
                rating=4.7,
                downloads=750,
                capabilities=["UI/UX design", "Graphics", "Prototyping", "Visual design"],
                requires_api_key=False,
                agent_type="GenericLLMAgent"
            ),
            MarketplaceAgent(
                id="translator_001",
                name="Translator",
                category="Language",
                description="Multi-language translator with expertise in technical and creative translation",
                icon="🌐",
                rating=4.6,
                downloads=650,
                capabilities=["Language translation", "Localization", "Cultural adaptation"],
                requires_api_key=False,
                agent_type="GenericLLMAgent"
            ),
            MarketplaceAgent(
                id="marketing_001",
                name="Marketing Specialist",
                category="Marketing",
                description="Digital marketing expert specializing in campaigns and strategy",
                icon="📈",
                rating=4.5,
                downloads=420,
                capabilities=["Campaign planning", "SEO", "Social media", "Analytics"],
                requires_api_key=False,
                agent_type="GenericLLMAgent"
            ),
            MarketplaceAgent(
                id="consultant_001",
                name="Business Consultant",
                category="Business",
                description="Strategic business consultant with expertise in operations and growth",
                icon="💼",
                rating=4.8,
                downloads=890,
                capabilities=["Strategy", "Operations", "Growth planning", "Analysis"],
                requires_api_key=False,
                agent_type="GenericLLMAgent"
            )
        ]

    def get_current_agents(self) -> List[AgentInfo]:
        """Get list of current agents"""
        if not self.orchestrator:
            return []

        agents = []
        for agent in self.orchestrator.agents:
            agents.append(AgentInfo(
                id=agent.id,
                name=agent.name,
                description=agent.description,
                type="GenericLLMAgent",
                status="active",
                requestCount=0,
                capabilities=self.get_agent_capabilities(agent.name)
            ))

        if self.orchestrator.supervisor:
            agents.append(AgentInfo(
                id=self.orchestrator.supervisor.id,
                name=self.orchestrator.supervisor.name,
                description=self.orchestrator.supervisor.description,
                type="Supervisor",
                status="active",
                requestCount=0,
                capabilities=self.get_agent_capabilities(self.orchestrator.supervisor.name)
            ))

        return agents

    def add_agent(self, agent_data: MarketplaceAgent):
        """Add a new agent to the orchestrator"""
        if not self.orchestrator:
            raise ValueError("Orchestrator not initialized")

        # Create agent based on type
        if agent_data.agent_type == "OpenAIAgent":
            if not agent_data.api_key:
                raise ValueError("OpenAI API key is required")
            new_agent = OpenAIAgent(OpenAIAgentOptions(
                name=agent_data.name,
                description=agent_data.description,
                api_key=agent_data.api_key
            ))
        elif agent_data.agent_type == "AnthropicAgent":
            if not agent_data.api_key:
                raise ValueError("Anthropic API key is required")
            new_agent = AnthropicAgent(AnthropicAgentOptions(
                name=agent_data.name,
                description=agent_data.description,
                api_key=agent_data.api_key
            ))
        else:  # GenericLLMAgent (default)
            new_agent = GenericLLMAgent(GenericLLMAgentOptions(
                name=agent_data.name,
                description=agent_data.description,
                generate=generate_llm_response,
            ))

        self.orchestrator.add_agent(new_agent)
        return new_agent.id

    def remove_agent(self, agent_id: str):
        """Remove an agent from the orchestrator"""
        if not self.orchestrator:
            raise ValueError("Orchestrator not initialized")

        for i, agent in enumerate(self.orchestrator.agents):
            if agent.id == agent_id:
                removed_agent = self.orchestrator.agents.pop(i)
                return removed_agent.name

        if self.orchestrator.supervisor and self.orchestrator.supervisor.id == agent_id:
            self.orchestrator.supervisor = None
            return "Supervisor"

        raise ValueError("Agent not found")

    async def route_request(self, message: str, user_id: str, session_id: str):
        """Route request through the orchestrator"""
        if not self.orchestrator:
            raise ValueError("Orchestrator not initialized")

        return await self.orchestrator.route_request(message, user_id, session_id)


# Global instance
agent_service = AgentService()