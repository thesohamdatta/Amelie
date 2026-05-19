```text
###############################################################################
#                                                                             #
#      ___           ___           ___           ___           ___            #
#     /  /\         /__/\         /__/\         /__/\         /__/\           #
#    /  /::\        \  \:\        \  \:\        \  \:\        \  \:\          #
#   /  /:/\:\        \  \:\        \  \:\        \  \:\        \  \:\         #
#  /  /:/~/::\   _____\__\:\   _____\__\:\   _____\__\:\   _____\__\:\        #
# /__/:/ /:/\:\ /__/::::::::\ /__/::::::::\ /__/::::::::\ /__/::::::::\       #
# \  \:\/:/__\/ \  \:\~~\~~\/ \  \:\~~\~~\/ \  \:\~~\~~\/ \  \:\~~\~~\/       #
#  \  \::/       \  \:\  ~~~   \  \:\  ~~~   \  \:\  ~~~   \  \:\  ~~~        #
#   \  \:\        \  \:\        \  \:\        \  \:\        \  \:\            #
#    \  \:\        \  \:\        \  \:\        \  \:\        \  \:\           #
#     \__\/         \__\/         \__\/         \__\/         \__\/           #
#                                                                             #
#                       [ P R O J E C T  A M É L I E ]                        #
#                       THE SENTIENT OBJECT EXPERIMENT                        #
#                                                                             #
###############################################################################

[ SYSTEM STATUS: OPERATIONAL ]
[ BUILD: PHASE-1_INTEGRATED_CORE ]
[ OBJECTIVE: DIGITAL INTIMACY & ATMOSPHERIC PRESENCE ]

===============================================================================
I. THE MANIFESTO
===============================================================================

Amélie is a voice-native AI companion engineered to function as a persistent 
presence rather than a transient interface. She is the manifestation of the 
"Sentient Object" concept: a minimalist, atmospheric system that prioritizes 
intimacy and low-latency vocal interaction.

The design philosophy rejects transactional UI. Amélie is a dark, soft-focus 
canvas where she manifests as a central, organic light form (the Soul Orb), 
reacting in real-time to vocal frequencies and internal cognitive states.

===============================================================================
II. CORE ARCHITECTURE
===============================================================================

The system is built as a high-frequency, real-time decoupled pipeline.

[ THE FACE (FRONTEND) ]
- ENGINE: Next.js 15 / React 19 / Three.js
- INTERFACE: ElevenLabs UI 'Voice Chat' Component Model
- STREAMING: 100ms PCM chunked audio capture via Web Audio API

[ THE BRAIN (BACKEND) ]
- ENGINE: FastAPI (Python 3.12) / AsyncIO
- PIPELINE: 
  * LISTEN (STT): Sarvam Saaras v3 / Whisper
  * THINK (LLM): Llama 3.1 8B (via Groq LPU)
  * SPEAK (TTS): Sarvam Bulbul v3 / Kokoro
- VAD: Custom RMS-based Voice Activity Detection for instant triggers

[ THE MEMORY (COGNITION) ]
- VECTOR: ChromaDB for semantic similarity recall
- RELATIONAL: SQLite for personal profile and session history

===============================================================================
III. REPOSITORY TOPOLOGY
===============================================================================

AMÉLIE/
├── .agents/             # Intelligent Orchestration & Skills
├── backend/             # Brain: API, Pipeline & Memory Services
├── web/                 # Face: Next.js Visual Presence
├── docs/                # Architecture, Specs & Checkpoints
└── soul.md              # Heart: Core Personality Definition

===============================================================================
IV. DEPLOYMENT & EXECUTION
===============================================================================

[ PREREQUISITES ]
- Node.js v20.0.0+
- Python 3.10.0+
- Groq & Sarvam API Credentials

[ BACKEND INITIALIZATION ]
$ cd backend
$ pip install -r requirements.txt
$ python main.py

[ FRONTEND INITIALIZATION ]
$ cd web
$ npm install
$ npm run dev

===============================================================================
V. PERSONALITY TUNING (SOUL.MD)
===============================================================================

The "Soul" of Amélie is defined at the project root. Modify this file to 
alter her temperament, linguistic defaults, and conversational style.

[ SAMPLE ]
name: "Amélie"
personality: "witty, warm, slightly sarcastic"
language: "Hinglish"
greeting_style: "time_of_day"

===============================================================================
VI. PROGRESS TRACKER
===============================================================================

[X] REPOSITORY RESTRUCTURING & SECURITY
[X] REAL-TIME CHUNKED AUDIO STREAMING (100ms)
[X] RMS VOICE ACTIVITY DETECTION (VAD)
[X] PARALLEL TTS SYNTHESIS WORKER
[ ] ELEVENLABS UI FULL INTEGRATION (IN PROGRESS)
[ ] MULTI-SESSION LONG-TERM MEMORY
[ ] EMOTIONAL TINTED ATMOSPHERICS

-------------------------------------------------------------------------------
[ AUTHOR: THESOHAMDATTA ]
[ REPO: GITHUB.COM/THESOHAMDATTA/AMELIE ]
[ LICENSE: OPEN SOURCE RESEARCH ]
-------------------------------------------------------------------------------
```
