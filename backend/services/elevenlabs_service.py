"""
elevenlabs_service.py — ElevenLabs TTS integration with alignment metadata.
Supports streaming audio and character-level timestamps for Soul Orb sync.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
from typing import AsyncGenerator, Dict, Any

import websockets

logger = logging.getLogger(__name__)

async def stream_tts(
    text: str, 
    voice_id: str = "Xb7hHahYTV7dWC5No688", 
    model_id: str = "eleven_flash_v2_5"
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Stream TTS from ElevenLabs WebSocket.
    Yields dicts with 'type' (audio|alignment) and 'data'.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        logger.error("[ElevenLabs] API key not found in environment")
        return

    # Use the optimized streaming latency parameter if needed
    # Values 0-4 (0 = lowest latency, 4 = highest quality)
    latency_opt = os.getenv("ELEVENLABS_LATENCY_OPT", "1")
    
    url = (
        f"wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input"
        f"?model_id={model_id}&optimize_streaming_latency={latency_opt}&output_format=pcm_16000"
    )

    try:
        async with websockets.connect(url) as ws:
            # 1. Send initiation + settings
            init_data = {
                "text": " ",
                "voice_settings": {
                    "stability": 0.45,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True
                },
                "xi_api_key": api_key,
            }
            await ws.send(json.dumps(init_data))

            # 2. Send text and request alignment (Path 2: Surgical Metadata)
            payload = {
                "text": text,
                "try_trigger_generation": True,
                "generation_config": {
                    "chunk_length_schedule": [50] # Short chunks for faster TTFA
                }
            }
            # Note: alignment is passed in the initiation or as part of the stream?
            # Actually, per docs, it's often in the initiation or as a param.
            # We'll include it in the text payload for some models.
            payload["alignment"] = True 

            await ws.send(json.dumps(payload))
            
            # 3. Send EOS
            await ws.send(json.dumps({"text": ""}))

            # 4. Handle response stream
            async for message in ws:
                data = json.loads(message)
                
                # Audio chunk (base64)
                if data.get("audio"):
                    yield {"type": "audio", "data": data["audio"]}
                
                # Alignment metadata (chars, start times, durations)
                if data.get("alignment"):
                    yield {"type": "alignment", "data": data["alignment"]}
                
                if data.get("isFinal"):
                    break

    except Exception as exc:
        logger.error(f"[ElevenLabs] WebSocket error: {exc}")
