import os
import json
import requests
from typing import List, Dict, Any, Optional


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
        return full_content.strip()

    except Exception as e:
        # Ollama not available, using mock response
        return _get_mock_response(prompt)


def _get_mock_response(prompt: str) -> str:
    """Generate mock responses when Ollama is not available"""
    prompt_lower = prompt.lower()

    if any(keyword in prompt_lower for keyword in ["code", "programming", "python", "javascript", "function", "debug", "algorithm"]):
        return f"""🤖 **Coder Agent Response**

I'm here to help you with programming tasks! You asked: "{prompt}"

Here's what I can help you with:
- Writing code in various languages (Python, JavaScript, etc.)
- Debugging and fixing code issues
- Algorithm design and optimization
- Code reviews and best practices
- Software architecture guidance

**Example Response:**
```python
# Based on your request, here's a helpful code snippet:
def example_function():
    # Your code implementation here
    return "Hello from Coder agent!"
```

Would you like me to help you with a specific programming task?"""

    elif any(keyword in prompt_lower for keyword in ["research", "analysis", "find", "information", "data", "study", "investigate"]):
        return f"""🔍 **Researcher Agent Response**

I'm here to help you with research and analysis! You asked: "{prompt}"

Here's what I can help you with:
- Information gathering and fact-checking
- Data analysis and interpretation
- Research methodology guidance
- Academic and market research
- Trend analysis and insights

**Research Approach:**
1. **Topic Analysis**: Understanding your research question
2. **Information Gathering**: Collecting relevant data and sources
3. **Analysis**: Processing and interpreting the information
4. **Insights**: Providing actionable conclusions

**Example Research Areas:**
- Market trends and analysis
- Academic research topics
- Technology developments
- Business intelligence
- Scientific discoveries

Would you like me to dive deeper into any specific research area?"""

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

What would you like help with today?"""