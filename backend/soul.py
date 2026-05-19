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
        sarvam_speaker=data.get("sarvam_speaker", "meera"),
        stt_engine=data.get("stt_engine", "sarvam_saaras"),
        memory_depth=data.get("memory_depth", "high"),
        speaking_pace=data.get("speaking_pace", "natural"),
        interests=data.get("interests", []),
        default_mode=data.get("default_mode", "voice"),
        greeting_style=data.get("greeting_style", "time_of_day"),
    )
