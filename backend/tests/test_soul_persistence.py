import os
import yaml
import pytest
from backend.soul import Soul, save_soul, load_soul, SOUL_PATH

def test_soul_to_dict():
    soul = Soul(name="Test Amélie", personality="funny")
    d = soul.to_dict()
    assert d["name"] == "Test Amélie"
    assert d["personality"] == "funny"
    assert "tts_voice" in d

def test_soul_persistence():
    # Backup original soul.md if it exists
    original_content = None
    if os.path.exists(SOUL_PATH):
        with open(SOUL_PATH, "r", encoding="utf-8") as f:
            original_content = f.read()
    
    try:
        test_soul = Soul(
            name="Unit Test Amélie",
            personality="hyper-intelligent",
            interests=["testing", "persistence"]
        )
        save_soul(test_soul)
        
        # Verify file content
        with open(SOUL_PATH, "r", encoding="utf-8") as f:
            content = f.read()
            assert "Unit Test Amélie" in content
            assert "hyper-intelligent" in content
            
        # Load back and verify
        loaded = load_soul()
        assert loaded.name == "Unit Test Amélie"
        assert loaded.personality == "hyper-intelligent"
        assert "testing" in loaded.interests
        
    finally:
        # Restore original soul.md
        if original_content:
            with open(SOUL_PATH, "w", encoding="utf-8") as f:
                f.write(original_content)
