# Skill: Memory System
# Used by: @memory, @backend
# Trigger: Any task involving user profile, context injection, session summarisation
# ─────────────────────────────────────────────────────────────────────

## Objective
Build a two-layer memory system that makes Amélie remember things
naturally — like a real friend, not a database.

## Layer 1 — Short-term (per request)

- Sliding window of last N messages (fit within 6K token budget)
- Injected into every LLM system prompt
- Stored in Redis (key: session:{user_id})
- Expires after 30 min of inactivity

## Layer 2 — Long-term (persistent)

### SQLite (backend/db/sqlite.py)
Stores structured user profile JSON:
  {
    "name": "",
    "age": null,
    "city": "",
    "job": "",
    "relationships": {},
    "goals": [],
    "hobbies": [],
    "emotional_events": [],
    "preferences": {}
  }
Updated async at session close via Celery task.

### Chroma DB (backend/db/chroma.py)
Stores: timestamped memory chunks as vector embeddings
Model: sentence-transformers all-MiniLM-L6-v2
Retrieval: semantic similarity search — top 5 relevant memories per request
Collection name: amelie_memories_{user_id}

## Memory Injection (backend/services/memory.py)

On every LLM call:
1. Fetch top 5 semantic memories from Chroma
2. Fetch user profile from SQLite
3. Format into memory block (max 1500 tokens):
   [MEMORY]
   User profile: {profile_json}
   Relevant memories: {top_5_chunks}
   [/MEMORY]
4. Prepend to system prompt before sending to LLM

## Session Summarisation (Celery task)

On session end (WebSocket disconnect):
1. Take full conversation transcript
2. Send to LLM with prompt: "Summarise key facts, emotions, and events from this conversation in 200 words."
3. Store summary as new Chroma embedding
4. Update SQLite profile with any new facts detected
5. Append emotional events with timestamp + sentiment tag

## Rules

- Never expose memory to user directly ("I see in my notes...")
- Never inject more than 6K tokens total (short-term + long-term combined)
- Memory updates are always async — never block the voice response path
- If Chroma is unavailable, fall back to SQLite profile only
