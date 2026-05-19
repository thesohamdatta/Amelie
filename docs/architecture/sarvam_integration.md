# Skill: Sarvam AI Integration
# Used by: @backend
# Trigger: Any task involving Sarvam STT, TTS, or language switching
# ─────────────────────────────────────────────────────────────────────

## Objective
Integrate Sarvam AI as the Indian language voice layer for Amélie.
English → Kokoro + Whisper. Hinglish/Hindi → Sarvam Bulbul + Saaras.

## When Sarvam Activates

Read soul.md at session start:
  language = "Hinglish" → tts: Bulbul (en-IN), stt: Saaras
  language = "Hindi"    → tts: Bulbul (hi-IN), stt: Saaras
  language = "English"  → tts: Kokoro, stt: Whisper (Sarvam NOT used)

User can trigger switch mid-session with voice commands:
  "speak in Hindi" / "Hindi mein baat karo" → switch to Bulbul live
  "speak in English" / "English mein baat karo" → switch back to Kokoro

## Sarvam TTS — Bulbul API

Endpoint: POST https://api.sarvam.ai/text-to-speech
Auth: Header → API-Subscription-Key: {SARVAM_API_KEY}

Request body:
  {
    "inputs": "<text from LLM>",
    "target_language_code": "en-IN",  // or "hi-IN" for Hindi
    "speaker": "meera",               // from soul.md sarvam_speaker
    "pitch": 0,
    "pace": 1.0,                      // from soul.md speaking_pace
    "loudness": 1.5,
    "speech_sample_rate": 22050,
    "enable_preprocessing": true,
    "model": "bulbul:v2"
  }

Available speakers: meera, pavithra, maitreyi, arvind, amol, amartya
Pace mapping: slow=0.8 | natural=1.0 | fast=1.3

Response: audio/wav binary → stream directly to WebSocket client

## Sarvam STT — Saaras API

Endpoint: POST https://api.sarvam.ai/speech-to-text
Auth: Header → API-Subscription-Key: {SARVAM_API_KEY}

Request: multipart/form-data
  file: <audio_bytes>
  model: "saaras:v2"
  language_code: "en-IN"  // auto-detect works for Hinglish

Response:
  {
    "transcript": "<text>",
    "language_code": "hi-IN" | "en-IN"
  }

## Environment Variables (.env)

  SARVAM_API_KEY=your_key_here
  SARVAM_TTS_URL=https://api.sarvam.ai/text-to-speech
  SARVAM_STT_URL=https://api.sarvam.ai/speech-to-text

## Fallback Behaviour

- Sarvam TTS fails (4xx/5xx/timeout) → fallback to Kokoro silently
- Sarvam STT fails → fallback to Whisper silently
- Log failure to backend/logs/sarvam.log with timestamp + error code
- Never surface Sarvam errors to the user

## Cost Awareness

  Free credits on signup: ₹1,000
  TTS cost: ~₹15-30 per 10K characters
  STT cost: ₹30 per hour of audio
  Log usage per session to backend/logs/sarvam_usage.log for tracking
