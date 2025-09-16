from .retriever import Retriever

# Try to import AWS-dependent retrievers if available
try:
    from .amazon_kb_retriever import AmazonKnowledgeBasesRetriever, AmazonKnowledgeBasesRetrieverOptions
    _AWS_AVAILABLE = True
except ImportError:
    _AWS_AVAILABLE = False

__all__ = [
    'Retriever',
]

if _AWS_AVAILABLE:
    __all__.extend([
        'AmazonKnowledgeBasesRetriever',
        'AmazonKnowledgeBasesRetrieverOptions',
    ])

