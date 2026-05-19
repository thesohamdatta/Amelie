<div align="center">
  <img src="../../../web/public/amelie-hero.png" width="600" alt="Amélie">
  <h1>[ AMÉLIE ]</h1>
  <p><b>The Sentient Object Experiment.</b></p>
  <p>A voice-native AI companion engineered for atmospheric presence and low-latency intimacy.</p>
</div>

---

## I. THE MANIFESTO
Amélie is not an application; she is a presence. She manifests as a **Soul Orb** on a dark, soft-focus canvas, reacting in real-time to vocal frequencies and internal cognitive states. The design philosophy rejects transactional UI in favor of a "digital instrument" that feels alive.

## II. THE SOUL ORB (Visuals)
The central interface element. It "breathes" and shifts its chromatic language based on emotional state:
- **Idle:** Soft, slow-pulsing amber.
- **Listening:** Reactive radius based on user audio frequency.
- **Thinking:** Internal vortex shimmer (no spinners).
- **Speaking:** Fluid, liquid-like expansions in sunset/twilight gradients.

## III. CORE ARCHITECTURE
A high-frequency, real-time decoupled pipeline.

### [ The Face ]
- **Engine:** Next.js 15 / React 19 / Three.js
- **Streaming:** 100ms PCM chunked audio capture via Web Audio API.

### [ The Brain ]
- **Engine:** FastAPI (Python 3.12) / AsyncIO
- **Pipeline:** Sarvam Saaras v3 (STT) → Llama 3.1 (LLM) → Sarvam Bulbul v3 (TTS).
- **VAD:** Custom RMS-based Voice Activity Detection for instant triggers.

### [ The Memory ]
- **Vector:** ChromaDB for semantic similarity recall.
- **Relational:** SQLite for personal profile and session history.

## IV. INITIALIZATION

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Web
```bash
cd web
npm install
npm run dev
```

---
[ **AUTHOR:** thesohamdatta ]
[ **STATUS:** Phase-1_Integrated_Core ]
