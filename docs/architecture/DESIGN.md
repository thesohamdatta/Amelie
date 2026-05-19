# DESIGN.md — Amélie Physical Ambient System
# ─────────────────────────────────────────────────────────────────────────

## Concept: "The Sentient Object"
Amélie is not an app; she is a presence. The UI is a "dark, soft-focus canvas" where Amélie manifests as a central, organic light form (the **Soul Orb**). Every visual element exists to support the voice-native experience, reducing friction and maximizing intimacy.

## 1. Atmosphere: The Canvas
- **Background:** Deep obsidian/charcoal (`#080808`). 
- **Texture:** Global CSS noise overlay (0.05 opacity) + subtle, slow-moving atmospheric glows (large, blurred radial gradients at <10% opacity).
- **Depth:** No cards, no sharp borders. Elements fade into the background rather than being contained.

## 2. The Soul Orb
The central interface element. It "breathes" and reacts to audio input/output.

### States & Visuals
- **Idle:** A soft, slow-pulsing glow. Breathing rhythm.
- **Listening:** Reacts to the user's audio frequency (reactive radius and internal luminescence).
- **Thinking:** A subtle internal "vortex" or "shimmer" effect, signaling cognitive activity without being a "spinner."
- **Speaking:** Reacts to Amélie's TTS output. Fluid, liquid-like expansions.

## 3. Personality Palette (Chromatic Language)
The Orb's colors shift based on Amélie's emotional state and linguistic mode.

### Emotional Modes
- **Warm / Friend (Default):** Soft Amber / Peach (`#FDBA74`, `#FFEDD5`).
- **Witty / Sarcastic:** Electric Indigo / Signal Green flicker (`#818CF8`, `#4ADE80`).
- **Upset / Serious:** Deep Violet / Dim Crimson (`#4C1D95`, `#7F1D1D`).

### Linguistic Bloom (Hinglish/English)
- **Hinglish Mode (Sarvam Bulbul):** A warm "Sunset Bloom" (Saffron `#F97316` and Rose `#FB7185` gradients) overlaying the orb.
- **English Mode (Kokoro):** A cool "Twilight Frost" (Soft Blue `#60A5FA` and Silver `#E2E8F0`) secondary glow.

## 4. Typography: "Whisper Script"
- **Headings:** None. Use large, thin display sans-serif (tracking -2px) only for fleeting state labels.
- **Textfall:** In text mode, messages appear as "Textfall"—flowing down the screen with low contrast, disappearing as they go up.
- **Font:** Inter (Tight) or Sora for technical clarity with a human touch.

## 5. Interaction Model
- **Voice First:** No buttons. Tap the Orb or use the wake-word to trigger.
- **Haptics:** Precise, subtle haptic "ticks" for state transitions (listening -> thinking).
- **Ambient Feedback:** The background canvas brightness subtly shifts with her voice volume.

## 6. Layout Principles
- **Centric:** Everything radiates from the Soul Orb.
- **Transient:** UI elements (like text fallbacks) are temporary and fade out when not in use.
- **Borderless:** No navigation bars. Gestures (swipe up for history, swipe down for settings) are invisible but discoverable.
