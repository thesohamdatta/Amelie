"""
tts.py — Text-to-Speech service.
Routes to Sarvam Bulbul v3 (Hinglish/Hindi) or Kokoro (English).
NOTE: Bulbul v3 does NOT support pitch or loudness — only pace (0.5–2.0).
"""
from __future__ import annotations

import asyncio
import logging
import os

from sarvamai import SarvamAI

from backend.soul import Soul

logger = logging.getLogger(__name__)

# Max chars per TTS call (Bulbul v3 HTTP stream limit)
_MAX_CHARS = 3000


def _synthesize_sarvam(text: str, soul: Soul) -> bytes:
    """Synchronous Sarvam Bulbul v3 HTTP-stream synthesis — run in thread."""
    client = SarvamAI(api_subscription_key=os.getenv("SARVAM_API_KEY", ""))

    # Truncate if over char limit
    text = text[:_MAX_CHARS]

    chunks: list[bytes] = []
    try:
        for chunk in client.text_to_speech.convert_stream(
            text=text,
            target_language_code=soul.language_code,
            speaker=soul.sarvam_speaker,
            model="bulbul:v3",
            pace=soul.pace_value,
            # DO NOT pass pitch or loudness — returns 400 on v3
        ):
            if chunk:
                chunks.append(chunk)

        audio = b"".join(chunks)
        logger.info(f"[TTS] Sarvam synthesized {len(audio)} bytes for {len(text)} chars")
        return audio
    except Exception as exc:
        logger.error(f"[TTS] Sarvam Bulbul error: {exc}")
        raise


async def synthesize(text: str, soul: Soul) -> bytes:
    """
    Synthesize text to WAV audio bytes.
    Uses Sarvam Bulbul v3 for Hinglish/Hindi.
    Returns empty bytes on failure.
    """
    if not text.strip():
        return b""

    if soul.uses_sarvam() and soul.tts_voice == "sarvam_bulbul":
        try:
            return await asyncio.to_thread(_synthesize_sarvam, text, soul)
        except Exception as exc:
            logger.warning(f"[TTS] Synthesis failed: {exc}")
            return b""
    else:
        # Kokoro TTS placeholder
        logger.warning("[TTS] Kokoro not configured — returning empty audio")
        return b""
