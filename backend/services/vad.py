# backend/services/vad.py
import numpy as np

def is_speech(audio_data: bytes, threshold: int = 500) -> bool:
    """Detect if audio chunk contains speech based on amplitude energy."""
    # Convert bytes to int16 array
    # Note: Assumes 16-bit PCM mono audio
    audio_np = np.frombuffer(audio_data, dtype=np.int16)
    if len(audio_np) == 0:
        return False
    # RMS (Root Mean Square) energy calculation
    energy = np.sqrt(np.mean(audio_np.astype(np.float32)**2))
    return energy > threshold
