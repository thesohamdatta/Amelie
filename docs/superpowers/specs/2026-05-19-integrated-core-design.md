# Design Spec: Integrated Core Assembly (2026-05-19)

## 1. Overview
This document outlines the assembly of Amélie's "Brain" (FastAPI Backend) and "Face" (Next.js Frontend) into a real-time, voice-first integrated core.

## 2. WebSocket Contract
**Endpoint:** `ws://localhost:8000/ws/chat`

### Message Schema
All messages are JSON objects.

#### Client -> Server
- **Audio Chunk:** `{ "type": "audio", "data": "base64_wav_chunk", "timestamp": number }`
- **Text Input:** `{ "type": "text", "data": "string", "timestamp": number }`

#### Server -> Client
- **State Change:** `{ "type": "state", "value": "idle" | "listening" | "thinking" | "speaking", "emotion": "string" }`
- **Audio Output:** `{ "type": "audio", "data": "base64_wav_chunk", "timestamp": number }`
- **Text Token:** `{ "type": "text", "data": "string", "timestamp": number }`

## 3. Backend Architecture (The Brain)
- **Hub:** FastAPI WebSocket router (`backend/routers/chat.py`).
- **Processing Loop:**
    - `AudioRecorderQueue`: Buffers incoming base64 chunks.
    - `STT Task`: Processes buffer using Whisper/Sarvam; detects silence/EOT.
    - `LLM Task`: Streams tokens from Groq (Llama 3.1 8B).
    - `TTS Task`: Streams audio from Kokoro/Sarvam Bulbul based on LLM tokens.
- **State Management:** Emits state updates to sync the Soul Orb visual phase.

## 4. Frontend Architecture (The Face)
- **State Management:** `useAmelieWebSocket` hook in Zustand.
- **Soul Orb:**
    - Visual modes: Idle (Amber pulse), Listening (Audio-reactive radius), Thinking (Indigo shimmer), Speaking (Saffron expansion).
    - Audio sync: Uses Web Audio API `AnalyserNode` to drive animation scale from the incoming audio stream.
- **Latency Handling:** Optimistic state switching (switches to 'thinking' immediately upon EOT detection).

## 5. Success Criteria
- End-to-end latency (Speech to Speech) < 1.2s.
- Soul Orb transitions feel fluid and lag-free.
- Bidirectional text fallback works if audio fails.
