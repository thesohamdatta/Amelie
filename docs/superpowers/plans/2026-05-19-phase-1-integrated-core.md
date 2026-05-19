# Phase 1: Integrated Core (The "Live Loop") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a low-latency, real-time voice loop where Amélie listens, thinks, and speaks with synchronized visual feedback from the Soul Orb.

**Architecture:** A bidirectional WebSocket connection using chunked audio streaming. The backend handles Voice Activity Detection (VAD) and orchestrates STT, LLM, and TTS. The frontend captures audio chunks and reacts to state/emotion updates.

**Tech Stack:** FastAPI, Next.js, Framer Motion, Web Audio API, Groq, Sarvam AI.

---

### Task 1: Backend Audio Buffer and VAD Logic

**Files:**
- Create: `backend/services/vad.py`
- Modify: `backend/routers/chat.py`

- [ ] **Step 1: Implement simple energy-based VAD**
  Create a simple VAD service to detect when a user starts and stops speaking in the audio stream.

```python
# backend/services/vad.py
import numpy as np

def is_speech(audio_data: bytes, threshold: int = 500) -> bool:
    """Detect if audio chunk contains speech based on amplitude energy."""
    # Convert bytes to int16 array
    audio_np = np.frombuffer(audio_data, dtype=np.int16)
    if len(audio_np) == 0:
        return False
    energy = np.sqrt(np.mean(audio_np**2))
    return energy > threshold
```

- [ ] **Step 2: Update Chat Router to handle streaming chunks**
  Modify `websocket_chat` and `_handle_audio` to accept incremental chunks instead of a full file.

- [ ] **Step 3: Test VAD with mock data**
  Create a test to verify the energy threshold detection.

---

### Task 2: Frontend Chunked Audio Capture

**Files:**
- Modify: `web/app/page.tsx`
- Modify: `web/hooks/useAmelieWebSocket.ts`

- [ ] **Step 1: Transition MediaRecorder to use `timeslice`**
  Modify the `startRecording` logic to emit chunks every 100ms.

```typescript
// web/app/page.tsx modification
mediaRecorder.start(100); // Send 100ms chunks
```

- [ ] **Step 2: Update WebSocket hook to send raw chunks**
  Change `sendAudio` to handle the continuous stream of base64 data.

- [ ] **Step 3: Verify chunk delivery in browser console**
  Add logging to ensure the backend receives `audio_chunk` messages.

---

### Task 3: Soul Orb State and Emotion Sync

**Files:**
- Modify: `web/components/ui/orb.tsx`
- Modify: `backend/routers/chat.py`

- [ ] **Step 1: Add emotion detection to LLM response**
  Update the LLM service or chat router to extract a simple emotion tag (e.g., [happy]) from the response or use a simple heuristic.

- [ ] **Step 2: Map emotion tags to Orb colors**
  Modify the `Orb` component to accept an `emotion` prop and update its gradient colors accordingly.

- [ ] **Step 3: Test state transitions**
  Verify the Orb shifts from Idle -> Listening -> Thinking -> Speaking correctly.

---

### Task 4: End-to-End Latency Optimization

**Files:**
- Modify: `backend/services/tts.py`
- Modify: `backend/routers/chat.py`

- [ ] **Step 1: Implement parallel TTS synthesis**
  Modify the sentence buffer logic to start TTS synthesis for the *next* sentence while the *current* one is still being streamed.

- [ ] **Step 2: Measure and log end-to-end latency**
  Add timestamps to the WebSocket contract to track total round-trip time.

- [ ] **Step 3: Final validation**
  Conduct a live voice test to ensure the "Live Loop" feels responsive (< 1.2s total delay).
