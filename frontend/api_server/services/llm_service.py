import os
import json
import requests
import asyncio
import re
from typing import List, Dict, Any, Optional, AsyncGenerator
from bs4 import BeautifulSoup
from urllib.parse import urlparse


# Web scraping functionality
def _scrape_webpage(url: str, max_length: int = 5000) -> str:
    """Scrape content from a webpage."""
    try:
        # Validate URL
        if not _is_valid_url(url):
            return f"Error: Invalid URL format: {url}"
        
        # Make request
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse content
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Extract title
        title = soup.find('title')
        title_text = title.get_text().strip() if title else "No title found"
        
        # Extract main content
        content = _extract_main_content(soup)
        
        # Truncate if too long
        if len(content) > max_length:
            content = content[:max_length] + "... [Content truncated]"
        
        return f"""Webpage Content:
URL: {url}
Title: {title_text}
Content Length: {len(content)} characters

Content:
{content}"""
        
    except Exception as e:
        return f"Error scraping webpage: {str(e)}"


def _is_valid_url(url: str) -> bool:
    """Check if URL is valid."""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False


def _extract_main_content(soup: BeautifulSoup) -> str:
    """Extract main content from the page."""
    # Try to find main content areas
    content_selectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '.main-content',
        '.post-content',
        '.entry-content',
        '#content',
        '#main'
    ]
    
    for selector in content_selectors:
        content_elem = soup.select_one(selector)
        if content_elem:
            return content_elem.get_text(separator=' ', strip=True)
    
    # Fallback to body content
    body = soup.find('body')
    if body:
        return body.get_text(separator=' ', strip=True)
    
    # Last resort: all text
    return soup.get_text(separator=' ', strip=True)


def _detect_tool_calls(text: str) -> List[Dict[str, Any]]:
    """Detect tool calls in the LLM response."""
    tool_calls = []
    
    # Pattern 1: scrape_webpage(url)
    scrape_pattern = r'scrape_webpage\(["\']([^"\']+)["\']\)'
    matches = re.finditer(scrape_pattern, text)
    for match in matches:
        tool_calls.append({
            'tool': 'scrape_webpage',
            'url': match.group(1),
            'start': match.start(),
            'end': match.end()
        })
    
    # Pattern 2: scrape_webpage(url, max_length)
    scrape_with_length_pattern = r'scrape_webpage\(["\']([^"\']+)["\'],\s*(\d+)\)'
    matches = re.finditer(scrape_with_length_pattern, text)
    for match in matches:
        tool_calls.append({
            'tool': 'scrape_webpage',
            'url': match.group(1),
            'max_length': int(match.group(2)),
            'start': match.start(),
            'end': match.end()
        })
    
    return tool_calls


def _execute_tool_calls(text: str) -> str:
    """Execute tool calls found in the text and replace them with results."""
    tool_calls = _detect_tool_calls(text)
    
    if not tool_calls:
        return text
    
    # Sort by position (reverse order to avoid index issues when replacing)
    tool_calls.sort(key=lambda x: x['start'], reverse=True)
    
    result_text = text
    
    for tool_call in tool_calls:
        if tool_call['tool'] == 'scrape_webpage':
            url = tool_call['url']
            max_length = tool_call.get('max_length', 5000)
            
            # Execute the tool
            tool_result = _scrape_webpage(url, max_length)
            
            # Replace the tool call with the result
            result_text = (
                result_text[:tool_call['start']] + 
                f"\n\n{tool_result}\n\n" + 
                result_text[tool_call['end']:]
            )
    
    return result_text


def _to_messages(system: Optional[str], chat_history: List[Dict], prompt: str) -> List[Dict[str, str]]:
    """Convert system prompt, chat history, and current prompt to Ollama format"""
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})

    # Process chat history
    for m in (chat_history or []):
        role = getattr(m, "role", m.get("role"))
        content = getattr(m, "content", m.get("content"))
        # Map roles to ollama's chat roles ("user"/"assistant")
        if role in ("assistant", "tool"):
            msgs.append({"role": "assistant", "content": content})
        else:
            msgs.append({"role": "user", "content": content})

    msgs.append({"role": "user", "content": prompt})
    return msgs


def generate_llm_response(
    prompt: str,
    system: Optional[str] = None,
    user_id: str = "default_user",
    session_id: str = "default_session",
    chat_history: Optional[List[Dict]] = None,
    params: Optional[Dict[str, Any]] = None
) -> str:
    """Enhanced LLM generation function with Ollama integration"""

    try:
        # Configuration
        model = os.getenv("LLAMA_MODEL", "llama3.1:8b")
        url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")

        temperature = (params or {}).get("temperature", 0.2)
        max_tokens = (params or {}).get("max_tokens", 512)

        payload = {
            "model": model,
            "messages": _to_messages(system, chat_history or [], prompt),
            "stream": True,
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
                        if content:
                            full_content += content
                    elif data.get('done', False):
                        break
                except json.JSONDecodeError:
                    continue
        # Execute any tool calls in the response
        processed_content = _execute_tool_calls(full_content.strip())
        return processed_content

    except Exception as e:
        # Ollama not available, using mock response
        mock_response = _get_mock_response(prompt)
        # Execute any tool calls in the mock response too
        return _execute_tool_calls(mock_response)


async def generate_llm_response_streaming(
    prompt: str,
    system: Optional[str] = None,
    user_id: str = "default_user",
    session_id: str = "default_session",
    chat_history: Optional[List[Dict]] = None,
    params: Optional[Dict[str, Any]] = None
) -> AsyncGenerator[str, None]:
    """Streaming LLM generation function with Ollama integration"""
    
    try:
        # Configuration
        model = os.getenv("LLAMA_MODEL", "llama3.1:8b")
        url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")

        temperature = (params or {}).get("temperature", 0.2)
        max_tokens = (params or {}).get("max_tokens", 512)

        payload = {
            "model": model,
            "messages": _to_messages(system, chat_history or [], prompt),
            "stream": True,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            },
        }

        # Stream the response
        response = requests.post(url, json=payload, stream=True, timeout=600)
        response.raise_for_status()

        for line in response.iter_lines():
            if line:
                try:
                    data = json.loads(line.decode('utf-8'))
                    if 'message' in data and 'content' in data['message']:
                        content = data['message']['content']
                        if content:
                            yield content
                    elif data.get('done', False):
                        break
                except json.JSONDecodeError:
                    continue

    except Exception as e:
        # Ollama not available, yield mock response
        mock_response = _get_mock_response(prompt)
        # Simulate streaming by yielding chunks
        words = mock_response.split()
        for word in words:
            yield word + " "
            await asyncio.sleep(0.05)  # Small delay for streaming effect


def _get_mock_response(prompt: str) -> str:
    """Generate mock responses when Ollama is not available"""
    prompt_lower = prompt.lower()
    
    # Check if prompt contains URLs and should trigger web scraping
    import re
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
    urls = re.findall(url_pattern, prompt)
    
    if urls:
        # If URLs are found, include tool calls in the response
        tool_calls = []
        for url in urls:
            tool_calls.append(f'scrape_webpage("{url}")')
        
        if any(keyword in prompt_lower for keyword in ["research", "analysis", "find", "information", "data", "study", "investigate", "scrape", "web", "website", "url", "paper", "read", "document", "article", "content"]):
            return f"""🔍 **Researcher Agent Response**

I'll help you with that research request! You asked: "{prompt}"

Let me scrape the content from the provided URL(s) to get the information you need:

{', '.join(tool_calls)}

This will extract the main content, title, and provide a summary of the webpage."""
        
        elif any(keyword in prompt_lower for keyword in ["code", "programming", "python", "javascript", "function", "debug", "algorithm", "implement", "create", "build", "develop"]):
            return f"""🤖 **Coder Agent Response**

I'll help you with that coding request! You asked: "{prompt}"

Let me scrape the documentation/examples from the provided URL(s):

{', '.join(tool_calls)}

This will help me provide you with accurate code examples and implementation details."""
    
    # Original logic for non-URL prompts

    if any(keyword in prompt_lower for keyword in ["code", "programming", "python", "javascript", "function", "debug", "algorithm", "implement", "create", "build", "develop"]):
        return f"""🤖 **Coder Agent Response**

I'm here to help you with programming tasks! You asked: "{prompt}"

Here's what I can help you with:
- Writing code in various languages (Python, JavaScript, etc.)
- Debugging and fixing code issues
- Algorithm design and optimization
- Code reviews and best practices
- Software architecture guidance
- **Web scraping and API integration**
- **Documentation and reference lookup**

**Web Scraping Capabilities:**
- I can scrape documentation, examples, and reference materials
- Use: scrape_webpage("https://example.com") to get content from a URL
- Perfect for getting API docs, code examples, and technical references

**Example Response:**
```python
# Based on your request, here's a helpful code snippet:
def example_function():
    # Your code implementation here
    return "Hello from Coder agent!"
```

**Try asking me:**
- "Scrape the Python documentation for requests library and show me examples"
- "Get the latest React hooks documentation and create a component"
- "Find API examples from https://api.example.com/docs and implement a client"

Would you like me to help you with a specific programming task or scrape some technical documentation?"""

    elif any(keyword in prompt_lower for keyword in ["research", "analysis", "find", "information", "data", "study", "investigate", "scrape", "web", "website", "url", "paper", "read", "document", "article", "content"]) and not any(keyword in prompt_lower for keyword in ["code", "programming", "python", "javascript", "function", "debug", "algorithm", "implement", "create", "build", "develop"]):
        return f"""🔍 **Researcher Agent Response**

I'm here to help you with research and analysis! You asked: "{prompt}"

Here's what I can help you with:
- Information gathering and fact-checking
- Data analysis and interpretation
- Research methodology guidance
- Academic and market research
- Trend analysis and insights
- **Web scraping and online research**

**Research Approach:**
1. **Topic Analysis**: Understanding your research question
2. **Information Gathering**: Collecting relevant data and sources (including web scraping)
3. **Analysis**: Processing and interpreting the information
4. **Insights**: Providing actionable conclusions

**Web Scraping Capabilities:**
- I can scrape content from specific webpages
- Use: scrape_webpage("https://example.com") to get content from a URL
- I'll extract the main content, title, and provide a summary

**Example Research Areas:**
- Market trends and analysis
- Academic research topics
- Technology developments
- Business intelligence
- Scientific discoveries
- Current news and events (via web scraping)

**Try asking me:**
- "Scrape the latest news from https://example.com/news"
- "Research the current AI trends and scrape some relevant articles"
- "Find information about climate change and check some scientific websites"
- "Read the paper ToMPO: Training LLM Strategic Decision Making from a Multi-Agent Perspective"
- "Scrape this research paper: https://example.com/paper.pdf"

Would you like me to dive deeper into any specific research area or scrape some web content for you?"""

    else:
        return f"""👋 **General Assistant Response**

Hello! I'm here to help you with your request: "{prompt}"

I can assist you with:
- **Programming & Development**: Code writing, debugging, technical implementation
- **Research & Analysis**: Information gathering, data analysis, insights

**How I work:**
1. I analyze your request using my supervisor agent
2. I route it to the most appropriate specialist agent
3. I provide detailed, helpful responses

**Try asking me:**
- "Help me write a Python function to sort a list"
- "Research the latest trends in artificial intelligence"
- "Debug this JavaScript code"
- "Analyze the market for electric vehicles"
- "Scrape the Python documentation and create a web scraper"
- "Get API examples from a documentation site and implement them"
- "Read this research paper and summarize it"
- "Scrape content from a specific URL"

What would you like help with today?"""