#!/usr/bin/env python3
"""
Test script for the new task-based orchestrator system.
"""

import asyncio
import sys
import os

# Add the Python src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python', 'src'))

from cordon.orchestrator import AgentTeam, Task, TaskStatus
from cordon.types import AgentTeamConfig

# Mock agent for testing
class MockAgent:
    def __init__(self, name, description):
        self.name = name
        self.description = description
        self.id = f"agent_{name.lower()}"
    
    async def process_request(self, input_text, user_id, session_id, chat_history):
        # Simulate some processing time
        await asyncio.sleep(0.1)
        
        # If this is a task splitting request, return mock JSON
        if "Split this user prompt" in input_text:
            if "Research the latest AI trends" in input_text:
                return '[{"description": "Research the latest AI trends", "assigned_agent": "Researcher", "priority": 0}]'
            elif "Research Python frameworks" in input_text:
                return '''[
                    {"description": "Research Python frameworks", "assigned_agent": "Researcher", "priority": 0},
                    {"description": "Write a simple web app using Flask", "assigned_agent": "Coder", "priority": 1},
                    {"description": "Run the application to test it", "assigned_agent": "CommandExecutor", "priority": 2}
                ]'''
            elif "Find information about machine learning" in input_text:
                return '''[
                    {"description": "Find information about machine learning", "assigned_agent": "Researcher", "priority": 0},
                    {"description": "Research Python libraries for ML", "assigned_agent": "Researcher", "priority": 1},
                    {"description": "Write a simple ML script", "assigned_agent": "Coder", "priority": 2},
                    {"description": "Run the script to test it", "assigned_agent": "CommandExecutor", "priority": 3}
                ]'''
        
        return f"Mock response from {self.name} for: {input_text}"

async def test_task_orchestrator():
    """Test the new task-based orchestrator system."""
    print("🧪 Testing Task-Based Orchestrator System")
    print("=" * 60)
    
    # Create orchestrator
    orchestrator = AgentTeam(options=AgentTeamConfig())
    
    # Add mock agents
    researcher = MockAgent("Researcher", "Research and analysis")
    coder = MockAgent("Coder", "Programming and development")
    command_executor = MockAgent("CommandExecutor", "Terminal commands")
    supervisor = MockAgent("Supervisor", "Task coordination and agent assignment")
    
    orchestrator.add_agent(researcher)
    orchestrator.add_agent(coder)
    orchestrator.add_agent(command_executor)
    orchestrator.add_supervisor(supervisor)
    
    print(f"✅ Added {len(orchestrator.agents)} agents")
    
    # Test 1: Simple single task
    print("\n📋 Test 1: Simple Single Task")
    print("-" * 40)
    user_input = "Research the latest AI trends"
    tasks = await orchestrator.split_input_into_tasks(user_input)
    print(f"Split into {len(tasks)} tasks:")
    for task in tasks:
        print(f"  - {task.description} (Assigned to: {task.assigned_agent or 'None'})")
    
    # Test 2: Multiple tasks sequential execution
    print("\n📋 Test 2: Multiple Tasks Sequential Execution")
    print("-" * 40)
    user_input = "Research Python frameworks. Then write a simple web app using Flask. Finally, run the application to test it."
    tasks = await orchestrator.split_input_into_tasks(user_input)
    print(f"Split into {len(tasks)} tasks:")
    for i, task in enumerate(tasks):
        print(f"  {i+1}. {task.description}")
        print(f"     Assigned to: {task.assigned_agent or 'None'}")
        print(f"     Priority: {task.priority}")
        print()
    
    # Test 3: Task assignment
    print("\n📋 Test 3: Task Assignment")
    print("-" * 40)
    await orchestrator.assign_tasks_to_agents(tasks)
    for task in tasks:
        print(f"Task: {task.description[:50]}...")
        print(f"  Assigned to: {task.assigned_agent}")
        print()
    
    # Test 4: Sequential execution
    print("\n⚡ Test 4: Sequential Task Execution")
    print("-" * 40)
    print("Executing tasks sequentially...")
    results = await orchestrator.execute_tasks_sequential(tasks)
    
    print(f"Completed {len(results)} tasks:")
    for result in results:
        print(f"  Task {result.task_id}: {'✅ Success' if result.success else '❌ Failed'}")
        if result.success:
            print(f"    Output: {str(result.output)[:100]}...")
        else:
            print(f"    Error: {result.error}")
        print()
    
    # Test 5: Response coordination
    print("\n🎯 Test 5: Response Coordination")
    print("-" * 40)
    final_response = await orchestrator.coordinate_responses(results)
    print("Final coordinated response:")
    print(final_response)
    
    # Test 6: Complex multi-task request
    print("\n🔄 Test 6: Complex Multi-Task Request")
    print("-" * 40)
    complex_input = "Find information about machine learning. Research Python libraries for ML. Write a simple ML script. Run the script to test it."
    
    print(f"Processing: {complex_input}")
    print()
    
    # Use the main route_request method
    response = await orchestrator.route_request(complex_input, "test_user", "test_session")
    
    print("Response from orchestrator:")
    print(f"Agent: {response.metadata.agent_name}")
    print(f"Output: {response.output}")
    
    print("\n🎉 Task-based orchestrator testing completed!")

if __name__ == "__main__":
    asyncio.run(test_task_orchestrator())
