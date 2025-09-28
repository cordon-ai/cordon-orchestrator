#!/usr/bin/env python3
"""
Test script for frontend Coder agent web scraping capabilities.
"""
import sys
import os

# Add the frontend backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'frontend', 'backend'))

from services.agent_service import agent_service
from services.llm_service import generate_llm_response


def test_coder_agent_creation():
    """Test that the Coder agent is created with web scraping capabilities."""
    print("Testing Coder Agent Creation...")
    
    # Initialize the agent service
    agent_service.initialize_orchestrator()
    
    # Get current agents
    agents = agent_service.get_current_agents()
    
    # Find the Coder agent
    coder_agent = None
    for agent in agents:
        if agent.name == "Coder":
            coder_agent = agent
            break
    
    if coder_agent:
        print(f"✅ Coder agent found: {coder_agent.name}")
        print(f"✅ Description: {coder_agent.description}")
        print(f"✅ Capabilities: {coder_agent.capabilities}")
        
        # Check if web scraping is in capabilities
        if "Web scraping" in coder_agent.capabilities:
            print("✅ Web scraping capability found!")
        else:
            print("❌ Web scraping capability missing!")
    else:
        print("❌ Coder agent not found!")
    
    print("\n" + "="*50 + "\n")


def test_coder_web_scraping():
    """Test Coder agent web scraping functionality."""
    print("Testing Coder Agent Web Scraping...")
    
    # Test with a coding prompt that should trigger web scraping
    prompt = "Scrape the Python documentation for requests library and show me examples"
    
    response = generate_llm_response(
        prompt=prompt,
        system="You are a Coder agent with web scraping capabilities.",
        user_id="test_user",
        session_id="test_session"
    )
    
    print(f"Coder response: {response[:500]}...")
    
    # Check if response mentions web scraping
    if "web scraping" in response.lower() or "scrape" in response.lower():
        print("✅ Web scraping mentioned in response!")
    else:
        print("❌ Web scraping not mentioned in response!")
    
    print("\n" + "="*50 + "\n")


def test_coder_with_tool_calls():
    """Test Coder agent with explicit tool calls."""
    print("Testing Coder Agent with Tool Calls...")
    
    # Test with explicit tool call
    prompt = "I need to get API documentation. Let me scrape this: scrape_webpage('https://httpbin.org/html', 1000)"
    
    response = generate_llm_response(
        prompt=prompt,
        system="You are a Coder agent with web scraping capabilities.",
        user_id="test_user",
        session_id="test_session"
    )
    
    print(f"Coder response with tool call: {response[:500]}...")
    
    # Check if tool was executed
    if "Webpage Content:" in response or "Error scraping webpage:" in response:
        print("✅ Tool call was executed!")
    else:
        print("❌ Tool call was not executed!")
    
    print("\n" + "="*50 + "\n")


def test_agent_capabilities():
    """Test agent capabilities mapping."""
    print("Testing Agent Capabilities...")
    
    coder_capabilities = agent_service.get_agent_capabilities("Coder")
    print(f"Coder capabilities: {coder_capabilities}")
    
    if "Web scraping" in coder_capabilities:
        print("✅ Web scraping in capabilities!")
    else:
        print("❌ Web scraping missing from capabilities!")
    
    if "API integration" in coder_capabilities:
        print("✅ API integration in capabilities!")
    else:
        print("❌ API integration missing from capabilities!")
    
    print("\n" + "="*50 + "\n")


def main():
    """Main test function."""
    print("Frontend Coder Agent Web Scraping Test")
    print("="*50)
    
    # Test agent creation
    test_coder_agent_creation()
    
    # Test capabilities
    test_agent_capabilities()
    
    # Test Coder agent web scraping
    test_coder_web_scraping()
    
    # Test Coder agent with tool calls
    test_coder_with_tool_calls()
    
    print("Test completed!")


if __name__ == "__main__":
    main()
