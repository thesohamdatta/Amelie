"""
config.py — Router for personality (soul.md) and memory management.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from backend.soul import load_soul, save_soul, Soul
from backend.db import sqlite

router = APIRouter(prefix="/api")

class SoulUpdate(BaseModel):
    name: Optional[str]
    personality: Optional[str]
    language: Optional[str]
    tts_voice: Optional[str]
    elevenlabs_voice_id: Optional[str]
    elevenlabs_model_id: Optional[str]
    sarvam_speaker: Optional[str]
    stt_engine: Optional[str]
    memory_depth: Optional[str]
    speaking_pace: Optional[str]
    interests: Optional[List[str]]
    default_mode: Optional[str]
    greeting_style: Optional[str]

@router.get("/soul")
async def get_soul():
    """Retrieve current Amélie personality configuration."""
    soul = load_soul()
    return soul.to_dict()

@router.post("/soul")
async def update_soul(update: SoulUpdate):
    """Update Amélie personality configuration."""
    current_soul = load_soul()
    update_data = update.dict(exclude_unset=True)
    
    # Update fields
    for key, value in update_data.items():
        if hasattr(current_soul, key):
            setattr(current_soul, key, value)
            
    try:
        save_soul(current_soul)
        return {"status": "success", "soul": current_soul.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/memory")
async def get_memory():
    """Retrieve user facts and session summaries."""
    facts = sqlite.get_profile_value("user_facts", "")
    # Parse facts into a list for easier frontend rendering
    fact_list = [f.strip() for f in facts.split("\n") if f.strip()] if facts else []
    
    # Get summaries from SQLite
    import sqlite3
    conn = sqlite3.connect(sqlite.DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT session_id, summary, timestamp FROM session_logs ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    
    summaries = [
        {"session_id": r[0], "summary": r[1], "timestamp": r[2]}
        for r in rows
    ]
    
    return {
        "facts": fact_list,
        "summaries": summaries
    }
