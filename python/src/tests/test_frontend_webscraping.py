#!/usr/bin/env python3
"""
Test script for the frontend web scraping functionality.
"""
import sys
import os

# Add the frontend backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'frontend', 'backend'))

from services.llm_service import generate_llm_response, _scrape_webpage, _detect_tool_calls, _execute_tool_calls


def test_web_scraping():
    """Test the web scraping functionality."""
    print("Testing Web Scraping...")
    
    # Test direct scraping
    test_url = "https://httpbin.org/html"
    result = _scrape_webpage(test_url, 1000)
    print(f"Direct scraping result: {result[:200]}...")
    
    print("\n" + "="*50 + "\n")


def test_tool_detection():
    """Test tool call detection."""
    print("Testing Tool Call Detection...")
    
    test_text = 'I need to scrape this website: scrape_webpage("https://example.com") and also this one: scrape_webpage("https://test.com", 2000)'
    
    tool_calls = _detect_tool_calls(test_text)
    print(f"Detected tool calls: {tool_calls}")
    
    print("\n" + "="*50 + "\n")


def test_tool_execution():
    """Test tool call execution."""
    print("Testing Tool Call Execution...")
    
    test_text = 'Let me scrape this website: scrape_webpage("https://httpbin.org/html", 500)'
    
    result = _execute_tool_calls(test_text)
    print(f"Tool execution result: {result[:300]}...")
    
    print("\n" + "="*50 + "\n")


def test_researcher_agent():
    """Test the researcher agent with web scraping."""
    print("Testing Researcher Agent...")
    
    # Test with a research prompt that should trigger web scraping
    prompt = "Research the latest AI trends and scrape some information from https://httpbin.org/html"
    
    response = generate_llm_response(
        prompt=prompt,
        system="You are a Researcher agent with web scraping capabilities.",
        user_id="test_user",
        session_id="test_session"
    )
    
    print(f"Researcher response: {response[:500]}...")
    
    print("\n" + "="*50 + "\n")


def main():
    """Main test function."""
    print("Frontend Web Scraping Integration Test")
    print("="*50)
    
    # Test web scraping directly
    test_web_scraping()
    
    # Test tool detection
    test_tool_detection()
    
    # Test tool execution
    test_tool_execution()
    
    # Test researcher agent
    test_researcher_agent()
    
    print("Test completed!")


if __name__ == "__main__":
    main()
