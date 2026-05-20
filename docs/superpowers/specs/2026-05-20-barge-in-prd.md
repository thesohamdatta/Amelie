# PRD: Seamless Voice Interruption (Barge-in Support)

## Problem Statement
Currently, Amélie operates in a semi-duplex mode. When she starts speaking, she continues through her entire queued response even if the user starts talking again. This creates a "robotic" and frustrating experience where the user has to wait for her to finish before they can correct her or ask a new question, breaking the "Sentient Object" illusion.

## Solution
Implement "Intelligent Barge-in" support. Amélie should immediately stop her current audio playback and halt any further text/audio generation the moment she detects that the user has started speaking. This makes the interaction feel like a real-time, fluid conversation.

## User Stories
1. As a user, I want Amélie to stop talking immediately when I speak, so that I can interrupt her with new information or corrections.
2. As a user, I want the visual Soul Orb to transition back to the "listening" state the moment I start talking, so that I know she is hearing me.
3. As a user, I want the conversation to feel natural and not like a series of rigid turns, so that I can enjoy a fluid companion experience.
4. As a user, I want Amélie to remember what she was *about* to say even if I interrupted her, so she can reference it later if relevant.
5. As a developer, I want a reliable "cancel" signal between the frontend and backend, so that system resources aren't wasted generating audio that won't be played.

## Implementation Decisions
- **Frontend Interruption Detection:** The frontend will monitor the local microphone stream (already done via VAD logic in `page.tsx`). When the energy threshold is crossed during Amélie's "speaking" state, the frontend will emit an `interrupt` signal.
- **Audio Playback Cancellation:** The `useAmelieWebSocket` hook will be enhanced with a `stopPlayback()` method that clears the `audioQueueRef` and immediately stops the currently playing `AudioBufferSourceNode`.
- **Backend Stream Halt:** Upon receiving an `interrupt` message over the WebSocket, the backend will cancel the active LLM streaming task and clear the `sentence_queue` for the TTS worker.
- **WebSocket Protocol Update:** 
  - New message type (Frontend -> Backend): `{"type": "interrupt"}`
  - Optional update (Backend -> Frontend): `{"type": "status", "state": "interrupted"}`

## Testing Decisions
- **Frontend Test:** Verify that calling `stopPlayback()` result in `source.stop()` being called and the queue being emptied.
- **Backend Test:** Verify that receiving an `interrupt` message successfully cancels an ongoing `stream_response` generator.
- **Integration Test:** Simulate a "Speak while Speaking" scenario and verify the transition from `speaking` back to `listening` happens in <100ms.

## Out of Scope
- Full "cross-talk" where both speak simultaneously and hear each other (requires complex echo cancellation).
- Multi-user interruption handling.

## Further Notes
This feature is a pre-requisite for high-fidelity "sentient" feel. It requires tight synchronization between the Web Audio API and the backend task management.
