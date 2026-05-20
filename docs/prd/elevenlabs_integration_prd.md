# Product Requirement Document (PRD): ElevenLabs UI Integration & Rewiring

## Problem Statement

The user wants to replace the custom, hand-rolled control bar and message components in the Amélie React web frontend with official ElevenLabs UI components (`ConversationBar`, `Message`, `MessageContent`, `ShimmeringText`) to deliver a visual and interactive experience that feels like a polished "digital instrument" without breaking the existing backend WebSocket pipeline (STT, TTS, LLM) or introducing integration bugs.

## Solution

We will strip all dependencies on the `@elevenlabs/react` WebRTC SDK from the imported ElevenLabs components. Instead, we adapt and rewire the UI components as pure presentation components that accept callbacks and state directly from Amélie's custom `useAmelieWebSocket` Hook.

## User Stories

1. As an Amélie user, I want a sleek, floating Conversation Bar at the bottom of my screen, so that the voice interface feels integrated and cinematic.
2. As an Amélie user, I want a visual live audio waveform to display in the Conversation Bar when the call is active, so that I have immediate feedback that my voice is being received.
3. As an Amélie user, I want the status label below the Soul Orb to shimmer dynamically when the agent is speaking or thinking, so that the system feels alive and premium.
4. As an Amélie user, I want to be able to mute/unmute my mic using the mic toggle in the Conversation Bar, so that I have control over when Amélie hears me.
5. As an Amélie user, I want to toggle between Voice Mode and Text Input Mode seamlessly inside the Conversation Bar, so that I can type messages when speaking is not appropriate.
6. As an Amélie user, I want to press a clear Call/End Call button to connect or disconnect the companion conversation, so that I can start and stop sessions at will.
7. As an Amélie user, I want the text input box inside the Conversation Bar to automatically expand with a smooth transition when Text Mode is enabled, so that the layout changes feel natural and high-fidelity.
8. As an Amélie user, I want my submitted text messages to show up immediately in the chat history, so that I can track our conversation.
9. As an Amélie user, I want Amélie's response text to stream word-by-word inside the chat bubble, so that the conversation feels real-time and responsive.

## Implementation Decisions

- Rewire `ConversationBar` to take custom state props: `agentState`, `isMicMuted`, `isTextMode`, `inputText`, `setInputText`, `setIsTextMode`, `toggleMic`, `handleCall`, and `onSendMessage`.
- Fix import paths in ElevenLabs components to resolve correctly against `@/components/ui/...` rather than `@/registry/elevenlabs-ui/...`.
- Remove/comment out unused exports from the barrel file `web/components/elevenlabs/index.ts` (e.g. `VoicePicker`, `TranscriptViewer`) to avoid compilation failures due to missing nested dependencies.

## Testing Decisions

- We will use Test-Driven Development (TDD) principles.
- We will write tests verifying:
  1. The `ConversationBar` renders correctly.
  2. Clicking controls calls the injected handlers (`handleCall`, `toggleMic`, `setIsTextMode`).
  3. Form submission calls `onSendMessage`.
- Since `web/` is a Next.js TypeScript app, we will add a basic Vitest testing script and configuration to run these tests safely.

## Out of Scope

- Integrating other unused ElevenLabs UI components (like `VoicePicker` or `TranscriptViewer` which depend on missing registry files).
- Modifying the Python backend WebSocket implementation.

## Further Notes

None.
