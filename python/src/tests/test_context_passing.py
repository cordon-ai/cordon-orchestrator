#!/usr/bin/env python3
"""
Test script for context passing between agents.
"""
import sys
import os
import asyncio

# Add the Python src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python', 'src'))

from cordon.orchestrator import AgentTeam, Task, TaskStatus
from cordon.types import AgentTeamConfig
from cordon.agents.generic_llm_agent import GenericLLMAgent, GenericLLMAgentOptions


def mock_generate(prompt, system, user_id, session_id, chat_history, params):
    """Mock LLM generate function for testing."""
    prompt_lower = prompt.lower()
    
    # Check if this is a Coder agent with context
    if "context from previous tasks" in prompt_lower and "researcher output" in prompt_lower:
        return f"""🤖 **Coder Agent Response with Context**

I can see the Researcher has provided valuable context about the ToMPO paper. Based on the research findings, I'll now recreate the code implementation.

**Key insights from the research:**
- The paper focuses on training LLMs for strategic decision making
- Multi-agent perspective approach
- Specific implementation details were mentioned

**Code Implementation:**
```python
# ToMPO Implementation based on research context
class ToMPOAgent:
    def __init__(self, model_name="llama3.1:8b"):
        self.model_name = model_name
        self.strategic_decision_maker = True
    
    def make_strategic_decision(self, context):
        # Implementation based on the paper's methodology
        return self.process_multi_agent_perspective(context)
    
    def process_multi_agent_perspective(self, context):
        # Multi-agent decision making logic
        return "Strategic decision made"
```

This implementation incorporates the key concepts from the ToMPO paper as researched by the previous agent."""
    
    elif "read the paper" in prompt_lower:
        return f"""🔍 **Researcher Agent Response**

I've successfully read and analyzed the ToMPO paper. Here are the key findings:

**Paper Summary: "ToMPO: Training LLM Strategic Decision Making from a Multi-Agent Perspective"**

**Key Concepts:**
1. **Strategic Decision Making**: The paper presents a novel approach to training LLMs for strategic decision-making tasks
2. **Multi-Agent Perspective**: Uses a multi-agent framework to simulate complex decision scenarios
3. **Training Methodology**: Implements a specialized training protocol for strategic reasoning
4. **Implementation Details**: 
   - Uses transformer-based architecture
   - Implements reward-based learning
   - Includes multi-step reasoning capabilities
   - Features agent interaction protocols

**Technical Implementation:**
- Model architecture: Modified transformer with strategic reasoning modules
- Training data: Multi-agent interaction scenarios
- Evaluation metrics: Strategic decision accuracy and reasoning quality

**Code Structure Needed:**
- Main ToMPO class with strategic decision methods
- Multi-agent interaction framework
- Training and evaluation pipelines
- Reward calculation mechanisms

This research provides a solid foundation for implementing the ToMPO system."""
    
    else:
        return f"Mock response for: {prompt[:100]}..."


async def test_context_passing():
    """Test context passing between agents."""
    print("Testing Context Passing Between Agents")
    print("="*50)
    
    # Create orchestrator
    orchestrator = AgentTeam(options=AgentTeamConfig(
        LOG_AGENT_CHAT=False,
        LOG_CLASSIFIER_CHAT=False,
        LOG_CLASSIFIER_RAW_OUTPUT=False,
        LOG_CLASSIFIER_OUTPUT=False,
        LOG_EXECUTION_TIMES=False,
        MAX_RETRIES=3,
        USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED=True,
        MAX_MESSAGE_PAIRS_PER_AGENT=10
    ))
    
    # Create agents
    researcher = GenericLLMAgent(GenericLLMAgentOptions(
        name="Researcher",
        description="Research and analysis agent",
        generate=mock_generate
    ))
    
    coder = GenericLLMAgent(GenericLLMAgentOptions(
        name="Coder",
        description="Code implementation agent",
        generate=mock_generate
    ))
    
    # Add agents to orchestrator
    orchestrator.add_agent(researcher)
    orchestrator.add_agent(coder)
    
    # Create tasks
    tasks = [
        Task(
            id="task_1",
            description="Read the paper ToMPO: Training LLM Strategic Decision Making from a Multi-Agent Perspective",
            assigned_agent="Researcher",
            status=TaskStatus.PENDING
        ),
        Task(
            id="task_2", 
            description="Recreate the code based on the research findings",
            assigned_agent="Coder",
            status=TaskStatus.PENDING
        )
    ]
    
    # Execute tasks sequentially
    print("Executing tasks with context passing...")
    results = await orchestrator.execute_tasks_sequential(tasks)
    
    print("\n" + "="*50)
    print("RESULTS:")
    print("="*50)
    
    for i, result in enumerate(results):
        print(f"\nTask {i+1} ({result.task_id}):")
        print(f"Success: {result.success}")
        if result.success:
            print(f"Output: {result.output[:200]}...")
        else:
            print(f"Error: {result.error}")
    
    print("\n" + "="*50)
    print("Context passing test completed!")


if __name__ == "__main__":
    asyncio.run(test_context_passing())
