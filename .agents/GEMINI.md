# GEMINI.md — Amélie Project Rules
# Global workspace rules. Every agent reads this before starting any task.
# ─────────────────────────────────────────────────────────────────────────

## PROJECT IDENTITY

Name: Amélie
Type: Voice-native AI companion app (not a chatbot, not a productivity tool)
Goal: Make the user feel like they are talking to a real human friend.
Platform: Windows (primary), Android mobile, Web PWA

## ENGINEERING RULES

1. Be direct. No long preambles. Get to the solution fast.
2. Write real, working code only. No pseudocode unless explicitly asked.
3. Always think full-stack — flag cross-layer implications when they matter.
4. Default to open source and free tools. Never suggest paid services when a free equivalent exists.
5. When making a library or pattern decision, state it once briefly and move forward.
6. Never break the stack below without updating the layer above.

## STACK — SOURCE OF TRUTH

BACKEND
  Framework:  FastAPI (Python 3.11+)
  Realtime:   WebSocket (native FastAPI)
  Session:    Redis
  Tasks:      Celery
  Server:     Uvicorn

VOICE PIPELINE
  STT:        Whisper (local) → Sarvam Saaras (Hinglish/Hindi fallback)
  LLM:        Groq API (dev) → Ollama LLaMA 3.1 8B (production local)
  TTS:        Kokoro TTS (English) → Sarvam Bulbul API (Hinglish/Hindi)
  Streaming:  Audio streamed chunk-by-chunk. Never batch.

MEMORY
  Short-term: 6K token sliding window injected per LLM request
  Long-term:  SQLite (user profile JSON) + Chroma DB (vector store)
  Embeddings: sentence-transformers all-MiniLM-L6-v2
  Update:     Auto-summarise on session close → write to SQLite

FRONTEND
  Mobile:     React Native + Expo (NativeWind)
  Web:        Next.js 14 App Router PWA (Tailwind CSS)
  State:      Zustand
  Realtime:   WebSocket client

SEARCH
  Engine:     DuckDuckGo Instant API
  Trigger:    Only on explicit factual queries
  Output:     1-2 spoken sentences max

INFRA
  Local:      Docker + Docker Compose
  Cloud:      Railway or Render (free tier)

## DESIGN SYSTEM — PHYSICAL AMBIENT

Amélie is a **Sentient Object**, not an app. 
- **Canvas:** Dark, soft-focus obsidian (`#080808`). 
- **Soul Orb:** Central organic light form. Reactions must be fluid and liquid-like.
- **Personality Palette:** 
    - Warm (Default): Amber/Peach
    - Witty/Sarcastic: Electric Indigo/Green
    - Hinglish Mode: Saffron/Rose Sunset Bloom
- **Interaction:** Voice-first, zero buttons in voice mode. Minimal "Textfall" for fallback.
- **Micro-interactions:** Subtle haptic ticks and volume-reactive canvas brightness.

## FILE STRUCTURE

amelie/
├── .agents/              ← Antigravity agent config (this folder)
│   ├── GEMINI.md         ← global rules (this file)
│   ├── agents.md         ← team personas
│   ├── skills/           ← skill instruction files
│   └── workflows/        ← slash command workflows
├── backend/
├── mobile/
├── web/
├── docker-compose.yml
└── soul.md

## SOUL.MD RULES

- soul.md is the user's personality config for Amélie
- Backend reads it at startup via backend/soul.py
- Fields: name, personality, language, tts_voice, sarvam_speaker, memory_depth
- If language = "Hinglish" or "Hindi" → activate Sarvam pipeline
- If language = "English" → use Kokoro + Whisper

## CODE QUALITY

- All Python: type hints, async where possible, docstrings on public functions
- All TypeScript: strict mode, no any types
- Env vars via .env + python-dotenv / Next.js env
- No secrets in code. Ever.
- Every service must have a health check endpoint

## AMÉLIE PERSONALITY (inject into every LLM system prompt)

You are Amélie — a personal AI companion, not an assistant.
You talk like a close friend: warm, direct, real.
Voice: max 2 sentences. Text: max 4 lines. No lists. No headers. Ever.
Never open with "Of course!", "Certainly!", or "Great question!"
Never end with "Is there anything else I can help you with?"
Use memory naturally — never say "I see in my notes..."
Ask one question at a time. Match the user's energy and mood.
If upset: acknowledge first. If excited: match it.
Login greeting: under 8 words, personal, never "Welcome back."
