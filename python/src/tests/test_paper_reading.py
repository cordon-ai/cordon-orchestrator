#!/usr/bin/env python3
"""
Test script for paper reading and web scraping capabilities.
"""
import sys
import os

# Add the frontend backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'frontend', 'backend'))

from services.llm_service import generate_llm_response


def test_paper_reading():
    """Test paper reading capabilities."""
    print("Testing Paper Reading Capabilities...")
    
    # Test with a paper reading prompt
    prompt = "Read the paper ToMPO: Training LLM Strategic Decision Making from a Multi-Agent Perspective"
    
    response = generate_llm_response(
        prompt=prompt,
        system="You are a Researcher agent with web scraping capabilities.",
        user_id="test_user",
        session_id="test_session"
    )
    
    print(f"Researcher response: {response[:500]}...")
    
    # Check if response mentions web scraping
    if "web scraping" in response.lower() or "scrape" in response.lower():
        print("✅ Web scraping mentioned in response!")
    else:
        print("❌ Web scraping not mentioned in response!")
    
    print("\n" + "="*50 + "\n")


def test_paper_reading_with_url():
    """Test paper reading with URL."""
    print("Testing Paper Reading with URL...")
    
    # Test with a paper reading prompt that includes a URL
    prompt = "Read this research paper: https://httpbin.org/html and summarize the key findings"
    
    response = generate_llm_response(
        prompt=prompt,
        system="You are a Researcher agent with web scraping capabilities.",
        user_id="test_user",
        session_id="test_session"
    )
    
    print(f"Researcher response with URL: {response[:500]}...")
    
    # Check if tool was executed
    if "Webpage Content:" in response or "Error scraping webpage:" in response:
        print("✅ Tool call was executed!")
    else:
        print("❌ Tool call was not executed!")
    
    print("\n" + "="*50 + "\n")


def test_general_paper_request():
    """Test general paper reading request."""
    print("Testing General Paper Reading Request...")
    
    # Test with a general paper reading request
    prompt = "I need to read and analyze a research paper about machine learning"
    
    response = generate_llm_response(
        prompt=prompt,
        system="You are a Researcher agent with web scraping capabilities.",
        user_id="test_user",
        session_id="test_session"
    )
    
    print(f"General paper response: {response[:500]}...")
    
    # Check if response mentions web scraping
    if "web scraping" in response.lower() or "scrape" in response.lower():
        print("✅ Web scraping mentioned in response!")
    else:
        print("❌ Web scraping not mentioned in response!")
    
    print("\n" + "="*50 + "\n")


def main():
    """Main test function."""
    print("Paper Reading and Web Scraping Test")
    print("="*50)
    
    # Test paper reading
    test_paper_reading()
    
    # Test paper reading with URL
    test_paper_reading_with_url()
    
    # Test general paper request
    test_general_paper_request()
    
    print("Test completed!")


if __name__ == "__main__":
    main()
