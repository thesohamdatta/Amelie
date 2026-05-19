# backend/tests/test_vad.py
import numpy as np
from backend.services.vad import is_speech

def test_is_speech_silence():
    # 100ms of silence at 16kHz
    silence = b"\x00\x00" * 1600
    assert is_speech(silence, threshold=500) == False

def test_is_speech_loud():
    # 100ms of loud noise
    # Create a 16-bit PCM array with high values
    audio_np = (np.sin(np.linspace(0, 100, 1600)) * 10000).astype(np.int16)
    audio_bytes = audio_np.tobytes()
    assert is_speech(audio_bytes, threshold=500) == True

if __name__ == "__main__":
    try:
        test_is_speech_silence()
        print("test_is_speech_silence: PASS")
        test_is_speech_loud()
        print("test_is_speech_loud: PASS")
    except AssertionError as e:
        print(f"Test failed: {e}")
