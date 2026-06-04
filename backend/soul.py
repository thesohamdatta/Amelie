"""
soul.py — Parses soul.md personality config at startup.
Backend reads this once per session start.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import List

import yaml


SOUL_PATH = os.path.join(os.path.dirname(__file__), "..", "soul.md")


@dataclass
class Soul:
    name: str = "Amélie"
    personality: str = "witty, warm, slightly sarcastic"
    language: str = "Hinglish"
    tts_voice: str = "sarvam_bulbul"
    elevenlabs_voice_id: str = "Xb7hHahYTV7dWC5No688"
    elevenlabs_model_id: str = "eleven_flash_v2_5"
    sarvam_speaker: str = "meera"
    stt_engine: str = "sarvam_saaras"
    memory_depth: str = "high"
    speaking_pace: str = "natural"
    interests: List[str] = field(default_factory=list)
    default_mode: str = "voice"
    greeting_style: str = "time_of_day"

    @property
    def language_code(self) -> str:
        """Return Sarvam language code based on language field."""
        return "hi-IN" if self.language == "Hindi" else "en-IN"

    @property
    def pace_value(self) -> float:
        """Map speaking_pace string to Bulbul v3 numeric pace (0.5–2.0)."""
        return {"slow": 0.8, "natural": 1.0, "fast": 1.3}.get(self.speaking_pace, 1.0)

    def uses_sarvam(self) -> bool:
        return self.language in ("Hinglish", "Hindi")


    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "personality": self.personality,
            "language": self.language,
            "tts_voice": self.tts_voice,
            "elevenlabs_voice_id": self.elevenlabs_voice_id,
            "elevenlabs_model_id": self.elevenlabs_model_id,
            "sarvam_speaker": self.sarvam_speaker,
            "stt_engine": self.stt_engine,
            "memory_depth": self.memory_depth,
            "speaking_pace": self.speaking_pace,
            "interests": self.interests,
            "default_mode": self.default_mode,
            "greeting_style": self.greeting_style,
        }

def save_soul(soul: Soul) -> None:
    """Save Soul object back to soul.md as YAML."""
    path = os.path.abspath(SOUL_PATH)
    
    # Header comments to keep it human-readable
    header = """# soul.md — Amélie Personality Config
# Edit this file to customise how Amélie talks and sounds.
# Backend reads this at startup. Changes take effect on next session.
# ─────────────────────────────────────────────────────────────────────
"""
    
    data = soul.to_dict()
    yaml_content = yaml.dump(data, sort_keys=False, allow_unicode=True)
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(header + "\n" + yaml_content)

def load_soul() -> Soul:
    """Parse soul.md YAML (skip comment lines starting with #)."""
    path = os.path.abspath(SOUL_PATH)
    if not os.path.exists(path):
        return Soul()

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Strip comment lines so pyyaml doesn't choke
    lines = [ln for ln in content.splitlines() if not ln.strip().startswith("#")]
    data = yaml.safe_load("\n".join(lines)) or {}

    return Soul(
        name=data.get("name", "Amélie"),
        personality=data.get("personality", "witty, warm, slightly sarcastic"),
        language=data.get("language", "Hinglish"),
        tts_voice=data.get("tts_voice", "sarvam_bulbul"),
        elevenlabs_voice_id=data.get("elevenlabs_voice_id", "Xb7hHahYTV7dWC5No688"),
        elevenlabs_model_id=data.get("elevenlabs_model_id", "eleven_flash_v2_5"),
        sarvam_speaker=data.get("sarvam_speaker", "meera"),
        stt_engine=data.get("stt_engine", "sarvam_saaras"),
        memory_depth=data.get("memory_depth", "high"),
        speaking_pace=data.get("speaking_pace", "natural"),
        interests=data.get("interests", []),
        default_mode=data.get("default_mode", "voice"),
        greeting_style=data.get("greeting_style", "time_of_day"),
    )
