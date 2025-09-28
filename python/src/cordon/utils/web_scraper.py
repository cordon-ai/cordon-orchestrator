"""
Web scraping utilities for the Researcher agent.
"""
import requests
from bs4 import BeautifulSoup
from typing import Optional, Dict, Any
import time
from urllib.parse import urljoin, urlparse
import re


class WebScraper:
    """Web scraping utility for extracting content from web pages."""
    
    def __init__(self, timeout: int = 10, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def scrape_url(self, url: str, max_length: int = 5000) -> Dict[str, Any]:
        """
        Scrape content from a URL.
        
        :param url: The URL to scrape
        :param max_length: Maximum length of content to return
        :return: Dictionary with scraped content and metadata
        """
        try:
            # Validate URL
            if not self._is_valid_url(url):
                return {
                    'success': False,
                    'error': 'Invalid URL format',
                    'url': url
                }
            
            # Make request with retries
            for attempt in range(self.max_retries):
                try:
                    response = self.session.get(url, timeout=self.timeout)
                    response.raise_for_status()
                    break
                except requests.RequestException as e:
                    if attempt == self.max_retries - 1:
                        return {
                            'success': False,
                            'error': f'Failed to fetch URL after {self.max_retries} attempts: {str(e)}',
                            'url': url
                        }
                    time.sleep(1)  # Wait before retry
            
            # Parse content
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Extract title
            title = soup.find('title')
            title_text = title.get_text().strip() if title else "No title found"
            
            # Extract main content
            content = self._extract_main_content(soup)
            
            # Truncate if too long
            if len(content) > max_length:
                content = content[:max_length] + "... [Content truncated]"
            
            return {
                'success': True,
                'url': url,
                'title': title_text,
                'content': content,
                'content_length': len(content),
                'status_code': response.status_code
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Error scraping URL: {str(e)}',
                'url': url
            }
    
    def _is_valid_url(self, url: str) -> bool:
        """Check if URL is valid."""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except:
            return False
    
    def _extract_main_content(self, soup: BeautifulSoup) -> str:
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
    
    def search_web(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """
        Search the web using a simple approach (this is a placeholder - 
        in production you'd want to use a proper search API like Google Custom Search).
        
        :param query: Search query
        :param num_results: Number of results to return
        :return: Dictionary with search results
        """
        # This is a simplified implementation
        # In a real implementation, you'd use Google Custom Search API, Bing Search API, etc.
        return {
            'success': False,
            'error': 'Web search not implemented. Please provide specific URLs to scrape.',
            'query': query,
            'suggestion': 'Use the scrape_url function with specific URLs instead.'
        }


# Global instance
web_scraper = WebScraper()
