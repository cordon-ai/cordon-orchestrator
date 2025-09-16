from .agent import Agent, AgentOptions, AgentCallbacks, AgentProcessingResult, AgentResponse, AgentStreamResponse
from .supervisor_agent import SupervisorAgent, SupervisorAgentOptions
from .generic_llm_agent import GenericLLMAgent, GenericLLMAgentOptions

# Try to import AWS-dependent agents if available
try:
    from .bedrock_llm_agent import BedrockLLMAgent, BedrockLLMAgentOptions
    from .anthropic_agent import AnthropicAgent, AnthropicAgentOptions
    from .amazon_bedrock_agent import AmazonBedrockAgent, AmazonBedrockAgentOptions
    from .bedrock_flows_agent import BedrockFlowsAgent, BedrockFlowsAgentOptions
    from .bedrock_inline_agent import BedrockInlineAgent, BedrockInlineAgentOptions
    from .bedrock_translator_agent import BedrockTranslatorAgent, BedrockTranslatorAgentOptions
    from .chain_agent import ChainAgent, ChainAgentOptions
    from .comprehend_filter_agent import ComprehendFilterAgent, ComprehendFilterAgentOptions
    from .lambda_agent import LambdaAgent, LambdaAgentOptions
    from .lex_bot_agent import LexBotAgent, LexBotAgentOptions
    from .openai_agent import OpenAIAgent, OpenAIAgentOptions
    from .strands_agent import StrandsAgent
    _AWS_AVAILABLE = True
except ImportError:
    _AWS_AVAILABLE = False

__all__ = [
    'Agent',
    'AgentOptions', 
    'AgentCallbacks',
    'AgentProcessingResult',
    'AgentResponse',
    'AgentStreamResponse',
    'SupervisorAgent',
    'SupervisorAgentOptions',
    'GenericLLMAgent',
    'GenericLLMAgentOptions',
]

if _AWS_AVAILABLE:
    __all__.extend([
        'BedrockLLMAgent',
        'BedrockLLMAgentOptions',
        'AnthropicAgent',
        'AnthropicAgentOptions',
        'AmazonBedrockAgent',
        'AmazonBedrockAgentOptions',
        'BedrockFlowsAgent',
        'BedrockFlowsAgentOptions',
        'BedrockInlineAgent',
        'BedrockInlineAgentOptions',
        'BedrockTranslatorAgent',
        'BedrockTranslatorAgentOptions',
        'ChainAgent',
        'ChainAgentOptions',
        'ComprehendFilterAgent',
        'ComprehendFilterAgentOptions',
        'LambdaAgent',
        'LambdaAgentOptions',
        'LexBotAgent',
        'LexBotAgentOptions',
        'OpenAIAgent',
        'OpenAIAgentOptions',
        'StrandsAgent',
    ])
