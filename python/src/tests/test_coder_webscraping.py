#!/usr/bin/env python3
"""
Test script for Coder agent web scraping capabilities.
"""
import sys
import os

# Add the frontend backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'frontend', 'backend'))

from services.llm_service import generate_llm_response, _scrape_webpage, _detect_tool_calls, _execute_tool_calls


def test_coder_web_scraping():
    """Test the Coder agent with web scraping."""
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
    
    print("\n" + "="*50 + "\n")


def test_tool_detection_for_coder():
    """Test tool call detection for Coder agent."""
    print("Testing Tool Call Detection for Coder...")
    
    test_text = 'I need to scrape this API docs: scrape_webpage("https://httpbin.org/html") and then implement the client'
    
    tool_calls = _detect_tool_calls(test_text)
    print(f"Detected tool calls: {tool_calls}")
    
    result = _execute_tool_calls(test_text)
    print(f"Tool execution result: {result[:300]}...")
    
    print("\n" + "="*50 + "\n")


def test_direct_scraping():
    """Test direct web scraping functionality."""
    print("Testing Direct Web Scraping...")
    
    test_url = "https://httpbin.org/html"
    result = _scrape_webpage(test_url, 1000)
    print(f"Direct scraping result: {result[:200]}...")
    
    print("\n" + "="*50 + "\n")


def main():
    """Main test function."""
    print("Coder Agent Web Scraping Integration Test")
    print("="*50)
    
    # Test direct scraping
    test_direct_scraping()
    
    # Test tool detection
    test_tool_detection_for_coder()
    
    # Test Coder agent with web scraping
    test_coder_web_scraping()
    
    # Test Coder agent with explicit tool calls
    test_coder_with_tool_calls()
    
    print("Test completed!")


if __name__ == "__main__":
    main()
