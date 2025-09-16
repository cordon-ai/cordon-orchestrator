from cordon.agents.generic_llm_agent import GenericLLMAgent, GenericLLMAgentOptions
from cordon.agents import SupervisorAgent, SupervisorAgentOptions, AgentResponse
from cordon.orchestrator import AgentSquad
from cordon.types import AgentSquadConfig

import os, requests 
import asyncio
import uuid
import sys
import json
from unittest.mock import patch, MagicMock

orchestrator = AgentSquad(options=AgentSquadConfig(
  LOG_AGENT_CHAT=True,
  LOG_CLASSIFIER_CHAT=True,
  LOG_CLASSIFIER_RAW_OUTPUT=True,
  LOG_CLASSIFIER_OUTPUT=True,
  LOG_EXECUTION_TIMES=True,
  MAX_RETRIES=3,
  USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED=True,
  MAX_MESSAGE_PAIRS_PER_AGENT=10
))


def _to_messages(system, chat_history, prompt):
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    # chat_history can be list of dicts or objects; try both
    for m in (chat_history or []):
        role = getattr(m, "role", m.get("role"))
        content = getattr(m, "content", m.get("content"))
        # map roles to ollama's chat roles ("user"/"assistant")
        if role in ("assistant", "tool"):
            msgs.append({"role": "assistant", "content": content})
        else:
            msgs.append({"role": "user", "content": content})
    msgs.append({"role": "user", "content": prompt})
    return msgs

def my_model_generate(prompt, system, user_id, session_id, chat_history, params):
    # ---- config
    model = os.getenv("LLAMA_MODEL", "llama3.1:8b")  # e.g., llama3.1:8b / llama3.1:70b
    url   = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")

    temperature = (params or {}).get("temperature", 0.2)
    max_tokens  = (params or {}).get("max_tokens", 512)

    payload = {
        "model": model,
        "messages": _to_messages(system, chat_history, prompt),
        "stream": True,  # Enable streaming
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens
        },
    }
    
    # Stream the response
    response = requests.post(url, json=payload, stream=True, timeout=600)
    response.raise_for_status()
    
    full_content = ""
    for line in response.iter_lines():
        if line:
            try:
                data = json.loads(line.decode('utf-8'))
                if 'message' in data and 'content' in data['message']:
                    content = data['message']['content']
                    if content:  # Only print non-empty content
                        print(content, end='', flush=True)
                        full_content += content
                elif data.get('done', False):
                    break
            except json.JSONDecodeError:
                continue
    
    print()  # New line after streaming
    return full_content.strip()

# lead = GenericLLMAgent(GenericLLMAgentOptions(
#     name="MyLead",
#     description="Generic backend lead",
#     generate=my_model_generate,
# ))


researcher = GenericLLMAgent(GenericLLMAgentOptions(
    name="Researcher",
    description="Answers research questions",
    generate=my_model_generate,
))
orchestrator.add_agent(researcher)


coder = GenericLLMAgent(GenericLLMAgentOptions(
    name="Coder",
    description="Writes code like a seasoned developer",
    generate=my_model_generate,
))
orchestrator.add_agent(coder)

# Create a supervisor agent for classification
supervisor = GenericLLMAgent(GenericLLMAgentOptions(
    name="Supervisor",
    description="Classifies requests and routes them to appropriate agents",
    generate=my_model_generate,
))

# Set system prompt for the supervisor to act as a classifier
# modify the prompt to be generic to all possible agents 
supervisor.set_system_prompt("""You are a supervisor agent that classifies user requests and routes them to the appropriate specialist agent.

Available agents:
- Researcher: For research tasks, finding information, analysis, data gathering, academic work
- Coder: For programming, coding, software development, debugging, technical implementation

Your job is to analyze the user's request and respond with ONLY the name of the most appropriate agent: "Researcher" or "Coder".

Examples:
- "I need help with Python programming" -> "Coder"
- "Can you research the latest AI trends?" -> "Researcher" 
- "Write a function to sort an array" -> "Coder"
- "Find information about climate change" -> "Researcher"
- "Debug my JavaScript code" -> "Coder"
- "Analyze market trends" -> "Researcher"

Respond with only the agent name, nothing else.""")

orchestrator.add_supervisor(supervisor)



# sup = SupervisorAgent(SupervisorAgentOptions(
#     name="SupervisorAgent",
#     description="Delegates to team",
#     lead_agent=lead,
#     team=[researcher, coder],
#     trace=True
# ))

async def handle_request(_orchestrator: AgentSquad, _user_input: str, _user_id: str, _session_id: str):
    response = await _orchestrator.route_request(_user_input, _user_id, _session_id)
    
    # Handle different response types
    if hasattr(response, 'metadata'):
        # This is the orchestrator's response wrapper
        agent_name = response.metadata.agent_name
        print(f"\n🤖 Agent: {agent_name}")
        
        # Extract content from the wrapped response
        if hasattr(response.output, 'content'):
            # It's a ConversationMessage - content was already streamed
            pass  # Don't print again since it was streamed
        else:
            # It's a string or other type
            print(response.output)
    else:
        # This is a direct ConversationMessage from the agent
        # Get the agent name from the orchestrator (first agent for now)
        agent_name = _orchestrator.agents[0].name if _orchestrator.agents else "Unknown"
        print(f"\n🤖 Agent: {agent_name}")
        print("Response: ", end='', flush=True)
        print(response.content[0]['text'])

if __name__ == "__main__":
    USER_ID = "user123"
    SESSION_ID = str(uuid.uuid4())
    print("Welcome to the interactive Multi-Agent system. Type 'quit' to exit.")
    while True:
        # Get user input
        user_input = input("\nYou: ").strip()
        if user_input.lower() == 'quit':
            print("Exiting the program. Goodbye!")
            sys.exit()
        # Run the async function
        asyncio.run(handle_request(orchestrator, user_input, USER_ID, SESSION_ID))
