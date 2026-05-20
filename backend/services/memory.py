"""
memory.py — Persistent memory service (Phase 2).
Combines Redis (short-term), SQLite (profile/summaries), and Chroma (semantic).
"""
from __future__ import annotations

import logging
from typing import List
import redis
import json
import os

from backend.db import sqlite, chroma

logger = logging.getLogger(__name__)

# Redis for short-term history (shared across workers)
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

try:
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True, socket_connect_timeout=1)
    r.ping()
    logger.info("[Memory] Connected to Redis")
except:
    r = None
    logger.warning("[Memory] Redis not found. Falling back to in-memory temporary store.")

# Fallback in-memory store if Redis is missing
_fallback_history = {}

# Max messages in short-term window
_MAX_MESSAGES = 20

def get_history(session_id: str) -> List[dict]:
    """Return conversation history from Redis or fallback."""
    if not r:
        return _fallback_history.get(session_id, [])
    try:
        history = r.lrange(f"history:{session_id}", 0, -1)
        return [json.loads(m) for m in history]
    except Exception as e:
        logger.error(f"[Memory] Redis error: {e}")
        return []

def add_message(session_id: str, role: str, content: str) -> None:
    """Append a message to Redis history or fallback, and Chroma semantic memory."""
    msg = {"role": role, "content": content}
    
    if not r:
        if session_id not in _fallback_history:
            _fallback_history[session_id] = []
        _fallback_history[session_id].append(msg)
        if len(_fallback_history[session_id]) > _MAX_MESSAGES:
            _fallback_history[session_id].pop(0)
    else:
        try:
            r.rpush(f"history:{session_id}", json.dumps(msg))
            r.ltrim(f"history:{session_id}", -_MAX_MESSAGES, -1)
        except Exception as e:
            logger.error(f"[Memory] Redis write error: {e}")
    
    # Add to semantic memory if it's important (long strings)
    if len(content) > 50:
        try:
            chroma.add_memory(content, {"session_id": session_id, "role": role})
        except Exception as e:
            logger.error(f"[Memory] Chroma error: {e}")

def store_fact(fact: str) -> None:
    """
    Persist a new fact about the user. 
    Appends to existing facts if they exist.
    """
    if not fact.strip():
        return
        
    current_facts = sqlite.get_profile_value("user_facts", "")
    if current_facts:
        new_facts = f"{current_facts}\n{fact}"
    else:
        new_facts = fact
        
    sqlite.set_profile_value("user_facts", new_facts)
    logger.info(f"[Memory] Stored new fact: {fact}")

_FACT_EXTRACTION_PROMPT = """You are an background memory processor for Amélie. 
Analyze the following conversation transcript and extract any NEW, PERSISTENT facts about the user (preferences, background, relationships, location).

Transcript:
{transcript}

Rules:
1. Only extract new information not already known.
2. Be extremely concise. Example: "User lives in Mumbai." or "User prefers dark chocolate."
3. If no new facts are found, strictly respond with "NONE".
4. Do not include pleasantries.
"""

async def extract_and_store_facts(transcript: str) -> None:
    """
    Background task: Use LLM to extract new facts from a transcript
    and save them to Core Personal Memory.
    """
    from backend.services import llm  # lazy import
    
    prompt = _FACT_EXTRACTION_PROMPT.format(transcript=transcript)
    
    try:
        fact = await llm.get_raw_response([{"role": "user", "content": prompt}])
        if fact and fact.strip().upper() != "NONE":
            store_fact(fact.strip())
    except Exception as e:
        logger.error(f"[Memory] Fact extraction error: {e}")

def clear_session(session_id: str) -> None:
    """Clear Redis history for a session (Redis or fallback)."""
    if r:
        try:
            r.delete(f"history:{session_id}")
        except Exception as e:
            logger.error(f"[Memory] Redis delete error: {e}")
    else:
        _fallback_history.pop(session_id, None)

def build_memory_block(session_id: str, query: str = "") -> str:
    """
    Construct the context block for LLM.
    Includes persistent profile and relevant semantic memories.
    """
    profile = sqlite.get_profile_value("user_facts", "No facts known yet.")
    past_summaries = sqlite.get_all_summaries()
    
    semantic_hits = ""
    if query:
        hits = chroma.query_memory(query)
        if hits:
            semantic_hits = "\nRelevant past snippets: " + " | ".join(hits)
            
    return f"""
<MEMORY>
User Facts: {profile}
Past Session Highlights: {past_summaries}
{semantic_hits}
</MEMORY>
"""

def summarise_and_persist(session_id: str, full_transcript: str):
    """
    Save session transcript summary to SQLite. 
    In production, this would call the LLM to generate a real summary.
    """
    summary = f"Session {session_id[:8]}: {full_transcript[:100]}..."
    sqlite.save_session_summary(session_id, summary)
    logger.info(f"[Memory] Persisted summary for {session_id}")
