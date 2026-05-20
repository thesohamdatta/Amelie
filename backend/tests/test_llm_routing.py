import asyncio
import os
import pytest
from unittest.mock import patch, AsyncMock
from backend.services import llm
from backend.soul import Soul

@pytest.mark.asyncio
async def test_stream_response_routing():
    """
    Test that stream_response correctly routes to the selected provider.
    """
    soul = Soul(personality="Test personality", language="English")
    messages = [{"role": "user", "content": "Hello"}]

    # Mock the helper function directly to test routing
    with patch("backend.services.llm._stream_groq") as mock_groq_helper:
        async def mock_stream_gen(*args, **kwargs):
            yield "Hello"
            yield " from Groq"
        mock_groq_helper.side_effect = mock_stream_gen

        with patch.dict(os.environ, {"LLM_PROVIDER": "groq"}):
            tokens = []
            async for token in llm.stream_response(messages, soul):
                tokens.append(token)

            assert "".join(tokens) == "Hello from Groq"
            mock_groq_helper.assert_called_once()

@pytest.mark.asyncio
async def test_stream_response_gemini_routing():
    """
    Test that stream_response routes to Gemini when configured.
    """
    soul = Soul(personality="Test personality", language="English")
    messages = [{"role": "user", "content": "Hello"}]
    
    with patch("backend.services.llm._stream_gemini") as mock_gemini_helper:
        async def mock_stream_gen(*args, **kwargs):
            yield "Hello"
            yield " from Gemini"
        mock_gemini_helper.side_effect = mock_stream_gen
        
        with patch.dict(os.environ, {"LLM_PROVIDER": "gemini"}):
            tokens = []
            async for token in llm.stream_response(messages, soul):
                tokens.append(token)
            
            assert "".join(tokens) == "Hello from Gemini"
            mock_gemini_helper.assert_called_once()

