from .classifier import Classifier, ClassifierResult, ClassifierCallbacks

# Try to import AWS-dependent classifiers if available
try:
    from .bedrock_classifier import BedrockClassifier, BedrockClassifierOptions
    from .anthropic_classifier import AnthropicClassifier, AnthropicClassifierOptions
    from .openai_classifier import OpenAIClassifier, OpenAIClassifierOptions
    _AWS_AVAILABLE = True
except ImportError:
    _AWS_AVAILABLE = False

__all__ = [
    'Classifier',
    'ClassifierResult',
    'ClassifierCallbacks',
]

if _AWS_AVAILABLE:
    __all__.extend([
        'BedrockClassifier',
        'BedrockClassifierOptions',
        'AnthropicClassifier',
        'AnthropicClassifierOptions',
        'OpenAIClassifier',
        'OpenAIClassifierOptions',
    ])

