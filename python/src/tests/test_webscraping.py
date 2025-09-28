#!/usr/bin/env python3
"""
Test script for the web scraping functionality of the Researcher agent.
"""
import sys
import os
import asyncio

# Add the Python src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python', 'src'))

# Test web scraper directly first
try:
    from cordon.utils.web_scraper import web_scraper
    print("✓ Web scraper imported successfully")
except ImportError as e:
    print(f"✗ Failed to import web scraper: {e}")
    sys.exit(1)

# Test researcher agent
try:
    from cordon.agents.researcher_agent import ResearcherAgent, ResearcherAgentOptions
    print("✓ Researcher agent imported successfully")
except ImportError as e:
    print(f"✗ Failed to import researcher agent: {e}")
    sys.exit(1)


def test_web_scraper():
    """Test the web scraper functionality."""
    print("Testing Web Scraper...")
    
    # Test with a simple webpage
    test_url = "https://httpbin.org/html"
    result = web_scraper.scrape_url(test_url)
    
    print(f"URL: {test_url}")
    print(f"Success: {result['success']}")
    if result['success']:
        print(f"Title: {result['title']}")
        print(f"Content Length: {result['content_length']}")
        print(f"Content Preview: {result['content'][:200]}...")
    else:
        print(f"Error: {result['error']}")
    
    print("\n" + "="*50 + "\n")


def mock_generate(prompt, system, user_id, session_id, chat_history, params):
    """Mock LLM generate function for testing."""
    return f"Mock response for prompt: {prompt[:100]}..."


async def test_researcher_agent():
    """Test the Researcher agent with web scraping capabilities."""
    print("Testing Researcher Agent...")
    
    # Create researcher agent
    researcher = ResearcherAgent(ResearcherAgentOptions(
        name="TestResearcher",
        description="Test researcher with web scraping",
        generate=mock_generate
    ))
    
    # Test web scraping tool
    print("Testing scrape_webpage tool...")
    try:
        result = await researcher._scrape_webpage("https://httpbin.org/html", 1000)
        print(f"Scraping result: {result[:200]}...")
    except Exception as e:
        print(f"Error testing scrape_webpage: {e}")
    
    # Test search tool
    print("\nTesting search_web tool...")
    try:
        result = await researcher._search_web("test query", 3)
        print(f"Search result: {result}")
    except Exception as e:
        print(f"Error testing search_web: {e}")
    
    # Test available tools
    print(f"\nAvailable tools: {[tool.name for tool in researcher.get_available_tools().tools]}")
    
    print("\n" + "="*50 + "\n")


async def main():
    """Main test function."""
    print("Web Scraping Integration Test")
    print("="*50)
    
    # Test web scraper directly
    test_web_scraper()
    
    # Test researcher agent
    await test_researcher_agent()
    
    print("Test completed!")


if __name__ == "__main__":
    asyncio.run(main())
