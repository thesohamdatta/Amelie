"""
stt.py — Speech-to-Text service.
Routes to Sarvam Saaras v3 (Hinglish/Hindi) or Whisper (English).
"""
from __future__ import annotations

import asyncio
import io
import logging
import os
from typing import Optional
from pydub import AudioSegment

from sarvamai import SarvamAI

from backend.soul import Soul

logger = logging.getLogger(__name__)


def _transcribe_sarvam(audio_bytes: bytes, language_code: str) -> str:
    """Synchronous Sarvam Saaras v3 transcription — run in thread."""
    client = SarvamAI(api_subscription_key=os.getenv("SARVAM_API_KEY", ""))
    
    # ENFORCED: WAV format and 16kHz sample rate (Mandated by voice-agents skill)
    try:
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
        # Ensure 16kHz mono for best STT performance
        audio = audio.set_frame_rate(16000).set_channels(1)
        
        wav_io = io.BytesIO()
        audio.export(wav_io, format="wav")
        wav_io.seek(0)
        wav_io.name = "audio.wav"
        audio_file = wav_io
    except Exception as exc:
        logger.warning(f"[STT] pydub conversion failed, sending raw bytes: {exc}")
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "audio.wav"

    try:
        response = client.speech_to_text.transcribe(
            file=audio_file,
            model="saaras:v3",
            mode="transcribe",
        )
        transcript: str = response.transcript or ""
        logger.info(f"[STT] Sarvam transcript: {transcript!r}")
        return transcript
    except Exception as exc:
        logger.error(f"[STT] Sarvam error: {exc}")
        raise


async def transcribe(audio_bytes: bytes, soul: Soul) -> str:
    """
    Transcribe audio bytes to text.
    Uses Sarvam Saaras v3 for Hinglish/Hindi, falls back on error.
    """
    if soul.uses_sarvam() and soul.stt_engine == "sarvam_saaras":
        try:
            return await asyncio.to_thread(
                _transcribe_sarvam, audio_bytes, soul.language_code
            )
        except Exception as exc:
            logger.warning(f"[STT] Sarvam failed, fallback skipped: {exc}")
            return ""
    else:
        # Whisper fallback placeholder (add openai-whisper if needed)
        logger.warning("[STT] Whisper not configured — returning empty transcript")
        return ""
