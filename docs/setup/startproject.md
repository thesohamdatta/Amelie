# Workflow: /startproject
# Slash command to bootstrap the entire Amélie project from scratch
# ─────────────────────────────────────────────────────────────────────

## Trigger
User types: /startproject

## Steps

### Step 1 — @architect
Read GEMINI.md and soul.md.
Generate an Implementation Plan artifact covering:
  - Backend folder structure with file descriptions
  - Voice pipeline data flow diagram (text-based)
  - Sarvam integration points
  - Memory layer architecture
  - WebSocket message protocol spec
PAUSE for user approval before Step 2.

### Step 2 — @backend
Using the approved plan:
  1. Scaffold backend/ folder structure
  2. Create main.py with FastAPI app, CORS, WebSocket router
  3. Create .env.example with all required keys
  4. Create requirements.txt with all dependencies
  5. Create backend/soul.py — soul.md parser
  6. Create stub files for all services (stt, tts, llm, memory, search)
Save all files to backend/.

### Step 3 — @memory
  1. Implement backend/db/sqlite.py — user profile schema + CRUD
  2. Implement backend/db/chroma.py — Chroma client + collection setup
  3. Implement backend/services/memory.py — retrieval + injection + update
  4. Create Celery task for session summarisation
Save all files to backend/.

### Step 4 — @backend
  1. Implement backend/services/stt.py — Whisper + Sarvam Saaras switch
  2. Implement backend/services/tts.py — Kokoro + Sarvam Bulbul switch
  3. Implement backend/services/llm.py — Groq + Ollama switch with streaming
  4. Implement backend/routers/chat.py — full WebSocket chat endpoint
Save all files to backend/.

### Step 5 — @frontend
  1. Scaffold mobile/ with Expo
  2. Build VoiceOrb.tsx component
  3. Build WebSocket service
  4. Build audio recording + playback service
  5. Build useAmelie.ts Zustand store
  6. Wire up index.tsx voice home screen
Save all files to mobile/.

### Step 6 — @qa
  1. Test WebSocket connection end-to-end
  2. Test STT → LLM → TTS pipeline with a sample audio
  3. Test Sarvam API with Hinglish text sample
  4. Test memory injection — verify context appears in LLM prompt
  5. Report any bugs with file + line reference

### Step 7 — @devops
  1. Write Dockerfile for backend
  2. Write docker-compose.yml (backend + redis + chroma)
  3. Run docker compose up and verify all services start
  4. Output local URL to user

## Output
User gets a fully running Amélie backend with working voice pipeline
and a scaffolded mobile frontend ready to wire up.
