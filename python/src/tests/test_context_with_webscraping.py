#!/usr/bin/env python3
"""
Test script for context passing with web scraping capabilities.
"""
import sys
import os
import asyncio

# Add the Python src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python', 'src'))

from cordon.orchestrator import AgentTeam, Task, TaskStatus
from cordon.types import AgentTeamConfig
from cordon.agents.generic_llm_agent import GenericLLMAgent, GenericLLMAgentOptions


def mock_generate(prompt, system, user_id, session_id, chat_history, params):
    """Mock LLM generate function for testing context passing with web scraping."""
    prompt_lower = prompt.lower()
    
    # Check if this is a Coder agent with context
    if "context from previous tasks" in prompt_lower and "researcher output" in prompt_lower:
        return f"""🤖 **Coder Agent Response with Context**

I can see the Researcher has provided valuable context about the web scraping results. Based on the research findings, I'll now create the code implementation.

**Key insights from the research:**
- The Researcher scraped content from the provided URL
- Extracted relevant information and provided analysis
- Identified key patterns and findings

**Code Implementation based on context:**
```python
# Web Scraper Implementation based on research context
import requests
from bs4 import BeautifulSoup

class WebScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({{
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }})
    
    def scrape_url(self, url: str) -> dict:
        # Implementation based on the research context
        response = self.session.get(url)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        return {{
            'title': soup.find('title').get_text() if soup.find('title') else 'No title',
            'content': soup.get_text(separator=' ', strip=True),
            'url': url
        }}

# Usage example based on the research findings
scraper = WebScraper()
result = scraper.scrape_url("https://example.com")
print(f"Title: {{result['title']}}")
print(f"Content: {{result['content'][:200]}}...")
```

This implementation incorporates the web scraping techniques and findings from the Researcher's analysis."""
    
    elif "scrape" in prompt_lower and "url" in prompt_lower:
        return f"""🔍 **Researcher Agent Response**

I'll help you with that web scraping research request! You asked: "{prompt}"

Let me scrape the content from the provided URL to get the information you need:

scrape_webpage("https://httpbin.org/html")

This will extract the main content, title, and provide a summary of the webpage.

**Research Analysis:**
Based on the scraped content, I can provide insights about:
- Content structure and organization
- Key themes and topics
- Data patterns and trends
- Technical implementation details

**Key Findings:**
- The webpage contains structured content
- Multiple sections with different information types
- Rich textual data suitable for analysis
- Potential for automated extraction and processing

**Recommendations:**
- Implement robust error handling for web scraping
- Use appropriate content extraction techniques
- Consider rate limiting and respectful scraping practices
- Validate and clean extracted data before analysis"""
    
    else:
        return f"Mock response for: {prompt[:100]}..."


async def test_context_passing_with_webscraping():
    """Test context passing between agents with web scraping."""
    print("Testing Context Passing with Web Scraping")
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
        description="Research and analysis agent with web scraping",
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
            description="Scrape content from https://httpbin.org/html and analyze the findings",
            assigned_agent="Researcher",
            status=TaskStatus.PENDING
        ),
        Task(
            id="task_2", 
            description="Create a web scraper implementation based on the research findings",
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
            print(f"Output: {result.output[:300]}...")
        else:
            print(f"Error: {result.error}")
    
    print("\n" + "="*50)
    print("Context passing with web scraping test completed!")


if __name__ == "__main__":
    asyncio.run(test_context_passing_with_webscraping())
