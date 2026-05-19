# Skill: Backend Voice Pipeline
# Used by: @backend
# Trigger: Any task involving STT, TTS, LLM, or WebSocket chat endpoint
# ─────────────────────────────────────────────────────────────────────

## Objective
Build and maintain the real-time voice pipeline:
Audio In → STT → LLM → TTS → Audio Out
All over WebSocket. Target latency: under 800ms end-to-end.

## STT Rules (backend/services/stt.py)

1. Read soul.md stt_engine field at session start
2. If stt_engine = "whisper": run Whisper locally (openai-whisper)
3. If stt_engine = "sarvam_saaras": call Sarvam STT API
   - POST https://api.sarvam.ai/speech-to-text
   - Header: API-Subscription-Key from .env SARVAM_API_KEY
   - Returns: transcript + detected language_code
4. Return plain text transcript to LLM service

## LLM Rules (backend/services/llm.py)

1. Check .env LLM_PROVIDER (groq | ollama)
2. Groq: POST https://api.groq.com/openai/v1/chat/completions
   - Model: llama-3.1-8b-instant
   - Stream: True
3. Ollama: POST http://localhost:11434/api/chat
   - Model: llama3.1:8b
   - Stream: True
4. Always inject: system prompt (from GEMINI.md personality block) + memory context (max 6K tokens)
5. Stream tokens back as they arrive — never wait for full response

## TTS Rules (backend/services/tts.py)

1. Read soul.md tts_voice field
2. If tts_voice = "kokoro": pipe LLM token stream to Kokoro TTS locally
3. If tts_voice = "sarvam_bulbul": call Sarvam TTS API
   - POST https://api.sarvam.ai/text-to-speech
   - Header: API-Subscription-Key from .env SARVAM_API_KEY
   - Body: { inputs, target_language_code, speaker, pace, loudness, model: "bulbul:v2" }
   - Speaker: read from soul.md sarvam_speaker (default: meera)
   - Language code: "en-IN" for Hinglish, "hi-IN" for Hindi
4. Stream audio chunks via WebSocket as they arrive — never batch

## WebSocket Rules (backend/routers/chat.py)

- Endpoint: ws://localhost:8000/ws/chat
- On connect: load soul.md, load user memory, send greeting
- On audio message: STT → LLM → TTS → stream audio back
- On text message: LLM → stream text back
- On disconnect: trigger async memory update via Celery

## Error Handling

- Sarvam API failure → fallback to Kokoro/Whisper automatically
- LLM timeout > 3s → return "give me a sec" audio via TTS
- Log all errors to backend/logs/pipeline.log
