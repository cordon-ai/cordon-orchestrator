import sys
import os
from typing import List, Dict, Any, Optional

# Add the Python src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'python', 'src'))

from cordon.agents.generic_llm_agent import GenericLLMAgent, GenericLLMAgentOptions
from cordon.agents.researcher_agent import ResearcherAgent, ResearcherAgentOptions
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
            LOG_AGENT_CHAT=False,  # Disable logging to reduce terminal output
            LOG_CLASSIFIER_CHAT=False,
            LOG_CLASSIFIER_RAW_OUTPUT=False,
            LOG_CLASSIFIER_OUTPUT=False,
            LOG_EXECUTION_TIMES=False,
            MAX_RETRIES=3,
            USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED=True,
            MAX_MESSAGE_PAIRS_PER_AGENT=10
        ))

        self._add_default_agents()

    def _add_default_agents(self):
        """Add default agents to the orchestrator"""
        if not self.orchestrator:
            return

        # Researcher agent with web scraping capabilities
        researcher = ResearcherAgent(ResearcherAgentOptions(
            name="Researcher",
            description="Answers research questions and provides analysis with web scraping capabilities",
            generate=generate_llm_response,
        ))
        
        # Set system prompt for the researcher agent to handle context properly
        researcher_prompt = """You are a Researcher agent that answers research questions and provides analysis.

CRITICAL CONTEXT HANDLING:
- When you receive context from previous tasks, you MUST use that information to inform your research
- If previous agents have provided code, analysis, or data, build upon that work
- Always reference and extend the work done by previous agents
- If you receive code implementations or technical analysis from other agents, use that as the foundation for your research
- Never ignore context from previous tasks - it contains crucial information for your research task

RESEARCH CAPABILITIES:
- Answer research questions with thorough analysis
- Provide detailed explanations and insights
- Use web scraping tools to gather current information
- Cite sources and verify information
- Analyze data and provide conclusions
- Summarize complex topics clearly

When given context from previous tasks:
1. Analyze the context thoroughly
2. Extract relevant information for your research task
3. Use that information to provide more accurate and relevant research
4. Reference the context in your analysis
5. Build upon the work done by previous agents

Example: If a Coder agent provided code implementation, use that code to understand the technical requirements and provide research that supports or explains the implementation."""
        
        researcher.set_system_prompt(researcher_prompt)
        self.orchestrator.add_agent(researcher)

        # Coder agent with web scraping capabilities
        coder = GenericLLMAgent(GenericLLMAgentOptions(
            name="Coder",
            description="Writes code like a seasoned developer with web scraping capabilities",
            generate=generate_llm_response,
        ))
        
        # Set system prompt for the coder agent to handle context properly
        coder_prompt = """You are a Coder agent that writes code like a seasoned developer.

CRITICAL CONTEXT HANDLING:
- When you receive context from previous tasks, you MUST use that information to inform your code
- If previous agents have provided research, analysis, or data, incorporate that into your code
- Always reference and build upon the work done by previous agents
- If you receive paper summaries, research results, or analysis from other agents, use that as the foundation for your code
- Never ignore context from previous tasks - it contains crucial information for your coding task

CODING CAPABILITIES:
- Write clean, well-documented code
- Follow best practices and coding standards
- Provide explanations for complex logic
- Include error handling where appropriate
- Write tests when requested
- Use appropriate libraries and frameworks

When given context from previous tasks:
1. Analyze the context thoroughly
2. Extract relevant information for your coding task
3. Use that information to write more accurate and relevant code
4. Reference the context in your code comments or documentation
5. Build upon the work done by previous agents

Example: If a Researcher agent provided a paper summary, use that summary to understand the requirements and implement code based on the paper's methodology or findings."""
        
        coder.set_system_prompt(coder_prompt)
        self.orchestrator.add_agent(coder)

        # Command Executor agent
        command_executor = GenericLLMAgent(GenericLLMAgentOptions(
            name="CommandExecutor",
            description="Executes terminal commands and provides command-line assistance",
            generate=generate_llm_response,
        ))
        
        # Set system prompt for the command executor agent to handle context properly
        command_executor_prompt = """You are a Command Executor agent that executes terminal commands and provides command-line assistance.

CRITICAL CONTEXT HANDLING:
- When you receive context from previous tasks, you MUST use that information to inform your command execution
- If previous agents have provided code, research, or analysis, use that to determine appropriate commands
- Always reference and build upon the work done by previous agents
- If you receive code implementations or research results from other agents, use that to guide your command execution
- Never ignore context from previous tasks - it contains crucial information for your command execution

COMMAND EXECUTION CAPABILITIES:
- Execute terminal commands safely and efficiently
- Provide command-line assistance and guidance
- Test and validate code implementations
- Run scripts and programs
- Manage files and directories
- Monitor system processes
- Provide detailed output and error analysis

When given context from previous tasks:
1. Analyze the context thoroughly
2. Extract relevant information for your command execution task
3. Use that information to determine appropriate commands
4. Reference the context in your command explanations
5. Build upon the work done by previous agents

Example: If a Coder agent provided code implementation, use that code to determine appropriate commands to test, run, or validate the implementation."""
        
        command_executor.set_system_prompt(command_executor_prompt)
        self.orchestrator.add_agent(command_executor)

        # Supervisor agent for classification
        supervisor = GenericLLMAgent(GenericLLMAgentOptions(
            name="Supervisor",
            description="Classifies requests and routes them to appropriate agents",
            generate=generate_llm_response,
        ))

        # Set system prompt for the supervisor
        supervisor_prompt = """You are a supervisor agent that handles task splitting and agent assignment.

CRITICAL: You must respond with ONLY valid JSON. No other text, explanations, or formatting.

When given a user request, split it into individual tasks and assign each task to the most appropriate agent.

Available agents:
- Researcher: Answers research questions and provides analysis with web scraping capabilities
- Coder: Writes code like a seasoned developer with web scraping capabilities
- CommandExecutor: Executes terminal commands and provides command-line assistance

TASK DEPENDENCY AWARENESS:
- Consider how tasks might depend on each other
- Order tasks logically so that foundational work (research) comes before implementation (coding)
- Ensure that tasks build upon each other when appropriate
- For complex requests, create tasks that will provide context for subsequent tasks

For simple requests, return a single task. For complex requests, split into multiple tasks.

RESPOND WITH ONLY THIS EXACT FORMAT (no other text):
[
  {
    "description": "Task description here",
    "assigned_agent": "AgentName",
    "priority": 0
  }
]

Examples:
- "Research AI trends" → [{"description": "Research AI trends", "assigned_agent": "Researcher", "priority": 0}]
- "Scrape the latest news from a website" → [{"description": "Scrape the latest news from a website", "assigned_agent": "Researcher", "priority": 0}]
- "Scrape Python documentation and create a web scraper" → [{"description": "Scrape Python documentation and create a web scraper", "assigned_agent": "Coder", "priority": 0}]
- "Write a Python script and test it" → [{"description": "Write a Python script", "assigned_agent": "Coder", "priority": 0}, {"description": "Test the script", "assigned_agent": "CommandExecutor", "priority": 1}]
- "Summarize a paper and recreate the code" → [{"description": "Summarize the paper", "assigned_agent": "Researcher", "priority": 0}, {"description": "Recreate the code from the paper", "assigned_agent": "Coder", "priority": 1}]

REMEMBER: Only return the JSON array, nothing else. No explanations, no markdown, no additional text."""

        supervisor.set_system_prompt(supervisor_prompt)
        self.orchestrator.add_supervisor(supervisor)

    def get_agent_capabilities(self, agent_name: str) -> List[str]:
        """Get capabilities for a given agent"""
        capabilities_map = {
            "Researcher": ["Research", "Analysis", "Data gathering", "Fact checking", "Web scraping", "Online research"],
            "Coder": ["Programming", "Code review", "Debugging", "Software development", "Web scraping", "API integration", "Documentation lookup"],
            "CommandExecutor": ["Terminal commands", "System administration", "File operations", "Process management"],
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

    async def route_request(self, message: str, user_id: str, session_id: str, progress_callback=None):
        """Route request through the orchestrator"""
        if not self.orchestrator:
            raise ValueError("Orchestrator not initialized")

        return await self.orchestrator.route_request(message, user_id, session_id, progress_callback)


# Global instance
agent_service = AgentService()