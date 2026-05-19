"""
search.py — DuckDuckGo Instant API integration for factual queries.
"""
import httpx
import logging

logger = logging.getLogger(__name__)

async def search_fact(query: str) -> str:
    """
    Search DuckDuckGo for a quick fact.
    Returns 1-2 spoken sentences max as per GEMINI.md.
    """
    url = f"https://api.duckduckgo.com/?q={query}&format=json&no_html=1&skip_disambig=1"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            data = response.json()
            
            # Use Abstract if available
            abstract = data.get("AbstractText")
            if abstract:
                return abstract[:200]  # Truncate for voice brevity
            
            # Use first RelatedTopic if abstract is empty
            topics = data.get("RelatedTopics")
            if topics and "Text" in topics[0]:
                return topics[0]["Text"][:200]
                
            return "I couldn't find a quick answer for that, yaar."
            
    except Exception as e:
        logger.error(f"[Search] DuckDuckGo error: {e}")
        return "My search brain is a bit fuzzy right now."
