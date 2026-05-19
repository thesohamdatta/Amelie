# Skill: Frontend Voice UI
# Used by: @frontend
# Trigger: Any task involving mobile app, web PWA, voice orb, chat screen
# ─────────────────────────────────────────────────────────────────────

## Objective
Build the voice-first UI for Amélie — minimal, beautiful, human.
Design reference: "Physical Ambient" system. Zero UI friction.

## Mobile (React Native + Expo) — mobile/

### Screens
  index.tsx     → Voice home (The "Sentient Object" presence — just the orb)
  chat.tsx      → "Textfall" mode fallback (messages fade in and up)
  settings.tsx  → soul.md editor (name, language, voice, pace)

### Core Components
  SoulOrb.tsx          → Organic light form. Liquid-like animations. Reacts to frequency + emotion.
  AtmosphericCanvas.tsx → Background with slow-moving glows and volume-reactive brightness.
  Textfall.tsx          → Falling/fading text component for fallback mode.

### SoulOrb & Canvas States
  idle      → soft Amber/Peach glow, slow breathing rhythm
  listening → reactive radius, luminescence pulses to frequency
  thinking  → internal vortex/shimmer (Indigo/Green flicker if "witty")
  speaking  → liquid-like expansions, Saffron/Rose bloom if "Hinglish"


### Audio Handling (mobile/services/audio.ts)
  - Record: expo-av AudioRecorder
  - Send: base64 encoded audio over WebSocket
  - Receive: base64 WAV chunks → decode → play sequentially
  - Stream chunks as they arrive — never wait for full audio

### WebSocket (mobile/services/websocket.ts)
  - Connect on app open: ws://{BACKEND_URL}/ws/chat
  - Reconnect with exponential backoff on disconnect
  - Message types: { type: "audio"|"text", data: "..." }

### State (mobile/store/useAmelie.ts — Zustand)
  - isListening: boolean
  - isSpeaking: boolean
  - messages: Message[]
  - mode: "voice" | "text"
  - connectionStatus: "connected" | "disconnected" | "reconnecting"

### Styling
  - NativeWind only. No StyleSheet. No inline styles.
  - Dark theme default. Soft purples and whites.
  - Font: System default for now

## Web (Next.js 14 PWA) — web/

### Pages
  app/page.tsx          → Voice home (mirrors mobile)
  app/chat/page.tsx     → Text mode

### Rules
  - PWA manifest + service worker for offline capability
  - Web Speech API as STT fallback (no backend call needed)
  - Same WebSocket service as mobile
  - Tailwind CSS only

## Shared Rules

- No direct HTTP calls from frontend — WebSocket only
- Typing indicator visible while Amélie generates text response
- Text mode activated by: user says "switch to text" or taps icon
- No backend URLs hardcoded — use .env EXPO_PUBLIC_BACKEND_URL / NEXT_PUBLIC_BACKEND_URL
- Screen-off on mobile: keep WebSocket alive via background audio session
