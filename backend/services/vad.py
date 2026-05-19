# backend/services/vad.py
import io
import logging
import shutil
import numpy as np
from pydub import AudioSegment

logger = logging.getLogger(__name__)

# Check for ffmpeg at startup
_HAS_FFMPEG = shutil.which("ffmpeg") is not None
if not _HAS_FFMPEG:
    logger.warning("[VAD] ffmpeg not found. Audio normalization will be skipped. Raw PCM expected.")

def is_speech(audio_data: bytes, threshold: int = 500) -> bool:
    """Detect if audio chunk contains speech based on amplitude energy."""
    try:
        if _HAS_FFMPEG:
            # Try to load as WAV/WebM/MP3 using pydub
            audio = AudioSegment.from_file(io.BytesIO(audio_data))
            # Normalize to mono 16-bit 16kHz for VAD consistency
            audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
            audio_np = np.frombuffer(audio.raw_data, dtype=np.int16)
        else:
            # Fallback to assuming raw PCM
            audio_np = np.frombuffer(audio_data, dtype=np.int16)
    except Exception as exc:
        # Fallback to assuming raw PCM if pydub fails
        audio_np = np.frombuffer(audio_data, dtype=np.int16)

    if len(audio_np) == 0:
        return False
    
    # RMS (Root Mean Square) energy calculation
    energy = np.sqrt(np.mean(audio_np.astype(np.float32)**2))
    return energy > threshold
