# GEMINI.md — Project Amélie

## Project Overview

Amélie is a **voice-native sentient object** designed for digital intimacy and atmospheric, low-latency interaction. Unlike transactional AI assistants, Amélie is built as a "presence" with a distinct personality—witty, warm, and slightly sarcastic—inspired by the sentient interface in the movie *Her*.

### Core Architecture

- **The Brain (Backend):** A FastAPI engine that orchestrates real-time voice processing.
  - **LLM:** Groq (for rapid response generation).
  - **Voice Pipeline (Live Loop):** STT (Sarvam Saaras/Whisper) -> LLM -> TTS (Sarvam Bulbul/Kokoro).
  - **Memory:** ChromaDB for long-term recall and contextual awareness.
  - **Personality:** Controlled by `soul.md`, which defines her philosophy, interests, and speaking style.
- **The Face (Frontend):** A Next.js 15 application featuring a **Soul Orb**.
  - **Visuals:** Three.js and React Three Fiber power the liquid, biological animations of the Orb.
  - **Styling:** Adheres to an editorial design system (documented in `DESIGN.md`) using Vanilla CSS and a minimalist, atmospheric aesthetic.
  - **Communication:** Uses WebSockets for streaming audio chunks and status updates (listening, thinking, speaking, emotions).

---

## Building and Running

### Prerequisites
- **FFmpeg:** Required for audio processing (`brew install ffmpeg` or `choco install ffmpeg`).
- **Environment:** Create a `.env` file in the root or in `backend/` based on `.env.example`.

### Backend (The Brain)
```bash
cd backend
pip install -r requirements.txt
python main.py
```
- The backend runs on `http://localhost:8000`.
- Key router: `backend/routers/chat.py` (WebSocket at `/ws/chat`).

### Frontend (The Face)
```bash
cd web
npm install
npm run dev
```
- The frontend runs on `http://localhost:3000`.
- Main page: `web/app/page.tsx`.
- Orb component: `web/components/elevenlabs/orb.tsx`.

### Testing
- **Frontend Tests:** `cd web && npm test`
- **Backend Tests:** Located in `backend/tests/`. Run with `pytest`.

---

## Development Conventions

### 1. Voice-Native Interaction
Amélie is "Voice First." Avoid adding transactional UI buttons unless they serve the atmospheric experience. Interaction should be triggered by voice (VAD) or a single central interaction point (the Orb).

### 2. Personality First (`soul.md`)
Always respect the personality defined in `soul.md`. Amélie should speak in **Hinglish** (a mix of Hindi and English) where appropriate and use natural fillers/hesitations.

### 3. The Soul Orb
The Orb is not just a visualizer; it is Amélie's body. It reacts to:
- **State:** Idle, Listening, Thinking, Speaking.
- **Emotion:** Detected from LLM responses (e.g., curious, playful, vulnerable).

### 4. Low Latency & Barge-In
The system supports "Barge-in," meaning Amélie can be interrupted. The `VoiceOrchestrator` in the backend manages response cancellation when new user speech is detected.

### 5. Design System
Follow the **ElevenLabs-inspired editorial design** in `DESIGN.md`:
- Off-white canvas (`#f5f5f5`) and warm near-black ink (`#292524`).
- Typography: Waldenburg Light (Serif) for display, Inter (Sans) for body.
- No saturated brand colors; use pastel gradient orbs for atmosphere.

---

## Key Files & Directories

- `soul.md`: The source of truth for Amélie's personality and voice settings.
- `CONTEXT.md`: Project-wide domain language and core concepts.
- `DESIGN.md`: Visual brand guidelines and typography.
- `backend/services/orchestrator.py`: Manages the voice response lifecycle and interruptions.
- `web/hooks/useLiveLoop.ts`: Client-side logic for the WebSocket voice interaction.
- `docs/architecture/`: Detailed technical specifications for memory, voice, and UI.
