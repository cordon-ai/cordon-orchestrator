"""
Simple orchestrator for managing agents and routing requests.
"""
from typing import List, Optional, Any
from .agents import Agent
from .types import ConversationMessage, AgentSquadConfig


class AgentSquad:
    """Simple orchestrator that manages a collection of agents."""
    
    def __init__(self, options: Optional[AgentSquadConfig] = None):
        self.agents: List[Agent] = []
        self.supervisor: Optional[Agent] = None
        self.options = options or AgentSquadConfig()
    
    def add_agent(self, agent: Agent) -> None:
        """Add an agent to the orchestrator."""
        self.agents.append(agent)
    
    def add_supervisor(self, supervisor: Agent) -> None:
        """Add a supervisor agent for classification."""
        self.supervisor = supervisor
    
    async def _classify_request(self, user_msg: str) -> Agent:
        """Use supervisor agent to classify requests and route to appropriate agents."""
        if self.supervisor is None:
            print("⚠️ No supervisor agent available, using first agent")
            return self.agents[0] if self.agents else None
        
        try:
            # Use supervisor to classify the request
            chat_history = []
            classification_response = await self.supervisor.process_request(user_msg, "classification", "session", chat_history)
            
            # Extract the agent name from the supervisor's response
            if hasattr(classification_response, 'content'):
                agent_name = classification_response.content[0]['text'].strip()
            else:
                agent_name = str(classification_response).strip()
            
            print(f"🔍 Supervisor classified request as: {agent_name}")
            
            # Find the agent with the matching name
            for agent in self.agents:
                if agent_name.lower() in agent.name.lower() or agent.name.lower() in agent_name.lower():
                    print(f"✅ Routing to agent: {agent.name}")
                    return agent
            
            # If no exact match, try partial matching
            if "coder" in agent_name.lower() or "code" in agent_name.lower():
                for agent in self.agents:
                    if 'coder' in agent.name.lower() or 'code' in agent.name.lower():
                        print(f"✅ Routing to Coder agent: {agent.name}")
                        return agent
            elif "research" in agent_name.lower():
                for agent in self.agents:
                    if 'researcher' in agent.name.lower() or 'research' in agent.name.lower():
                        print(f"✅ Routing to Researcher agent: {agent.name}")
                        return agent
            
            print(f"❓ Could not find agent '{agent_name}', using first agent: {self.agents[0].name}")
            return self.agents[0] if self.agents else None
            
        except Exception as e:
            print(f"❌ Error in classification: {str(e)}")
            print(f"🔄 Falling back to first agent: {self.agents[0].name}")
            return self.agents[0] if self.agents else None

    async def route_request(self, user_msg: str, user_id: str, session_id: str) -> Any:
        """Route a request to the appropriate agent based on classification."""
        if not self.agents:
            return type('Response', (), {
                'streaming': False,
                'metadata': type('Metadata', (), {'agent_name': 'no-agent'})(),
                'output': "No agents available"
            })()
        
        # Classify the request and select appropriate agent
        agent = await self._classify_request(user_msg)
        
        if agent is None:
            agent = self.agents[0]  # Fallback to first agent
        
        # Actually call the agent's process_request method with required parameters
        try:
            # Create empty chat history for now
            chat_history = []
            response = await agent.process_request(user_msg, user_id, session_id, chat_history)
            
            # Wrap the response with agent metadata
            return type('Response', (), {
                'streaming': False,
                'metadata': type('Metadata', (), {'agent_name': agent.name})(),
                'output': response
            })()
        except Exception as e:
            # Fallback response if agent fails
            return type('Response', (), {
                'streaming': False,
                'metadata': type('Metadata', (), {'agent_name': agent.name})(),
                'output': f"Error processing request: {str(e)}"
            })()
