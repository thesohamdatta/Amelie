"""
chat.py — WebSocket chat router.
Full voice pipeline: Audio → STT → LLM → TTS → Audio
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
import uuid
from typing import List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services import llm as llm_service
from backend.services import memory as mem_service
from backend.services import stt as stt_service
from backend.services import tts as tts_service
from backend.services import elevenlabs_service
from backend.services.vad import is_speech
from backend.soul import load_soul

from backend.services.orchestrator import VoiceOrchestrator

logger = logging.getLogger(__name__)
router = APIRouter()

# Sentence-boundary punctuation for TTS chunking
_SENTENCE_END = {".", "!", "?", "\n"}
# Chunk size for streaming audio bytes over WebSocket
_AUDIO_CHUNK = 8192

# Global orchestrator for response lifecycle (Barge-in, task tracking)
orchestrator = VoiceOrchestrator()

# In-memory store for active session audio buffers
_session_buffers = {}


async def _send(ws: WebSocket, payload: dict) -> None:
    """Helper — send JSON message with timestamp."""
    payload["timestamp"] = time.time()
    await ws.send_text(json.dumps(payload))


async def _stream_audio(ws: WebSocket, audio_bytes: bytes) -> None:
    """Send audio to client with status signals."""
    if not audio_bytes:
        return
    await _send(ws, {"type": "status", "state": "speaking"})
    # Send the whole audio block as a single message to ensure valid decoding on frontend
    await _send(ws, {"type": "audio_chunk", "data": base64.b64encode(audio_bytes).decode()})
    await _send(ws, {"type": "audio_end"})


async def _tts_and_stream(ws: WebSocket, text: str, soul) -> None:
    """Synthesize text and stream audio chunks + metadata."""
    if not text.strip():
        return
    
    if soul.tts_voice == "elevenlabs":
        # Path 2: Surgical Metadata — ElevenLabs WebSocket streaming
        await _send(ws, {"type": "status", "state": "speaking"})
        async for chunk in elevenlabs_service.stream_tts(text, soul.elevenlabs_voice_id, soul.elevenlabs_model_id):
            if chunk["type"] == "audio":
                await _send(ws, {"type": "audio_chunk", "data": chunk["data"]})
            elif chunk["type"] == "alignment":
                # Forward character-level timestamps to drive Soul Orb
                await _send(ws, {"type": "alignment", "data": chunk["data"]})
        await _send(ws, {"type": "audio_end"})
    else:
        # Fallback to legacy full-audio synthesis (Sarvam/Kokoro)
        audio = await tts_service.synthesize(text, soul)
        await _stream_audio(ws, audio)


async def _tts_worker(ws: WebSocket, queue: asyncio.Queue, soul) -> None:
    """Background worker to synthesize and stream audio in order."""
    while True:
        text = await queue.get()
        if text is None:
            break
        try:
            await _tts_and_stream(ws, text, soul)
        except Exception as exc:
            logger.error(f"[TTS Worker] Error: {exc}")
        finally:
            queue.task_done()


async def _handle_audio(ws: WebSocket, audio_b64: str, session_id: str, soul) -> None:
    """Full pipeline: audio → STT → LLM stream → TTS stream."""
    # Decode audio
    audio_bytes = base64.b64decode(audio_b64)

    # STT
    await _send(ws, {"type": "status", "state": "thinking"})
    transcript = await stt_service.transcribe(audio_bytes, soul)

    if not transcript.strip():
        await _send(ws, {"type": "status", "state": "idle"})
        return

    await _send(ws, {"type": "transcript", "data": transcript})
    mem_service.add_message(session_id, "user", transcript)

    # LLM streaming + sentence-chunked TTS worker
    history = mem_service.get_history(session_id)
    memory_block, hits = await mem_service.build_memory_block(session_id, query=transcript)
    
    if hits:
        await _send(ws, {"type": "status", "state": "thinking", "memory_hit": hits})

    full_response = ""
    sentence_buf = ""
    emotion = None
    
    sentence_queue = asyncio.Queue()
    worker_task = asyncio.create_task(_tts_worker(ws, sentence_queue, soul))

    async for token in llm_service.stream_response(history, soul, memory_block):
        full_response += token
        sentence_buf += token
        await _send(ws, {"type": "text_chunk", "data": token})

        # Detect emotion on first sentence
        if not emotion and sentence_buf and sentence_buf[-1] in _SENTENCE_END:
            emotion = llm_service.detect_emotion(sentence_buf)
            await _send(ws, {"type": "status", "state": "speaking", "emotion": emotion})

        # Fire TTS as soon as we hit a sentence boundary
        if sentence_buf and sentence_buf[-1] in _SENTENCE_END and len(sentence_buf) > 8:
            await sentence_queue.put(sentence_buf.strip())
            sentence_buf = ""

    # Flush remaining text
    if sentence_buf.strip():
        await sentence_queue.put(sentence_buf.strip())
    
    # Signal worker to finish
    await sentence_queue.put(None)
    await worker_task

    mem_service.add_message(session_id, "assistant", full_response)
    await _send(ws, {"type": "status", "state": "idle"})


async def _handle_audio_chunk(ws: WebSocket, audio_b64: str, session_id: str, soul) -> None:
    """Handle incremental audio chunks with simple VAD-based trigger."""
    audio_bytes = base64.b64decode(audio_b64)
    
    if session_id not in _session_buffers:
        _session_buffers[session_id] = {
            "bytes": b"",
            "is_speaking": False,
            "silence_chunks": 0
        }
    
    sess = _session_buffers[session_id]
    sess["bytes"] += audio_bytes
    
    if is_speech(audio_bytes):
        if not sess["is_speaking"]:
            sess["is_speaking"] = True
            await _send(ws, {"type": "status", "state": "listening"})
        sess["silence_chunks"] = 0
    else:
        if sess["is_speaking"]:
            sess["silence_chunks"] += 1
            # If 8 chunks of silence (approx 800ms if 100ms chunks), trigger processing
            if sess["silence_chunks"] > 8:
                full_audio = sess["bytes"]
                sess["bytes"] = b""
                sess["is_speaking"] = False
                sess["silence_chunks"] = 0
                orchestrator.start_response(session_id, _handle_audio(ws, base64.b64encode(full_audio).decode(), session_id, soul))


async def _handle_text(ws: WebSocket, text: str, session_id: str, soul) -> None:
    """Text-mode pipeline: text → LLM → TTS."""
    mem_service.add_message(session_id, "user", text)
    history = mem_service.get_history(session_id)
    memory_block, hits = await mem_service.build_memory_block(session_id, query=text)

    if hits:
        await _send(ws, {"type": "status", "state": "thinking", "memory_hit": hits})

    full_response = ""
    sentence_buf = ""
    emotion = None
    
    sentence_queue = asyncio.Queue()
    worker_task = asyncio.create_task(_tts_worker(ws, sentence_queue, soul))

    async for token in llm_service.stream_response(history, soul, memory_block):
        full_response += token
        sentence_buf += token
        await _send(ws, {"type": "text_chunk", "data": token})

        # Detect emotion on first sentence boundary (mirrors _handle_audio)
        if not emotion and sentence_buf and sentence_buf[-1] in _SENTENCE_END:
            emotion = llm_service.detect_emotion(sentence_buf)
            await _send(ws, {"type": "status", "state": "speaking", "emotion": emotion})

        if sentence_buf and sentence_buf[-1] in _SENTENCE_END and len(sentence_buf) > 8:
            await sentence_queue.put(sentence_buf.strip())
            sentence_buf = ""

    if sentence_buf.strip():
        await sentence_queue.put(sentence_buf.strip())
    
    await sentence_queue.put(None)
    await worker_task

    mem_service.add_message(session_id, "assistant", full_response)
    await _send(ws, {"type": "status", "state": "idle"})


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket) -> None:
    """Main WebSocket endpoint — full Amélie voice pipeline."""
    await websocket.accept()
    soul = load_soul()
    session_id = str(uuid.uuid4())
    logger.info(f"[WS] New session {session_id} | lang={soul.language}")

    # Send greeting
    try:
        await _send(ws=websocket, payload={"type": "status", "state": "thinking"})
        greeting = await llm_service.get_greeting(soul)
        await _send(websocket, {"type": "text_chunk", "data": greeting})
        mem_service.add_message(session_id, "assistant", greeting)
        await _tts_and_stream(websocket, greeting, soul)
        await _send(websocket, {"type": "status", "state": "idle"})
    except Exception as exc:
        logger.error(f"[WS] Greeting error: {exc}")

    # Main message loop
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type", "")

            if msg_type == "audio_chunk":
                # If user starts speaking while assistant is speaking, interrupt!
                if is_speech(base64.b64decode(msg["data"])):
                    await orchestrator.cancel_response(session_id)
                await _handle_audio_chunk(websocket, msg["data"], session_id, soul)

            elif msg_type == "interrupt":
                await orchestrator.cancel_response(session_id)
                await _send(websocket, {"type": "status", "state": "idle"})

            elif msg_type == "audio_data":
                orchestrator.start_response(session_id, _handle_audio(websocket, msg["data"], session_id, soul))

            elif msg_type == "text":
                orchestrator.start_response(session_id, _handle_text(websocket, msg["data"], session_id, soul))

            elif msg_type == "ping":
                await _send(websocket, {"type": "pong"})

    except WebSocketDisconnect:
        logger.info(f"[WS] Session {session_id} disconnected")
        # Persist session summary before cleanup
        history = mem_service.get_history(session_id)
        if history:
            transcript = " ".join(m["content"] for m in history)
            await mem_service.summarise_and_persist(session_id, transcript)
        mem_service.clear_session(session_id)
        if session_id in _session_buffers:
            del _session_buffers[session_id]
    except Exception as exc:
        logger.error(f"[WS] Session {session_id} error: {exc}")
        history = mem_service.get_history(session_id)
        if history:
            transcript = " ".join(m["content"] for m in history)
            await mem_service.summarise_and_persist(session_id, transcript)
        mem_service.clear_session(session_id)
        if session_id in _session_buffers:
            del _session_buffers[session_id]
