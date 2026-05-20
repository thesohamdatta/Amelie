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
    This test verifies behavior (routing) through the public interface.
    """
    soul = Soul(personality="Test personality", language="English")
    messages = [{"role": "user", "content": "Hello"}]
    
    # Test Groq routing
    with patch("backend.services.llm.AsyncGroq") as mock_groq:
        # Mock the stream response
        mock_client = mock_groq.return_value
        mock_stream = AsyncMock()
        mock_stream.__aiter__.return_value = [
            AsyncMock(choices=[AsyncMock(delta=AsyncMock(content="Hello"))]),
            AsyncMock(choices=[AsyncMock(delta=AsyncMock(content=" from Groq"))])
        ]
        mock_client.chat.completions.create.return_value = mock_stream
        
        with patch.dict(os.environ, {"LLM_PROVIDER": "groq", "GROQ_API_KEY": "test-key"}):
            tokens = []
            async for token in llm.stream_response(messages, soul):
                tokens.append(token)
            
            assert "".join(tokens) == "Hello from Groq"
            mock_groq.assert_called_once()

@pytest.mark.asyncio
async def test_stream_response_openai_routing():
    """
    Test that stream_response routes to OpenAI when configured.
    (This will fail initially as OpenAI is not implemented).
    """
    soul = Soul(personality="Test personality", language="English")
    messages = [{"role": "user", "content": "Hello"}]
    
    with patch("openai.AsyncOpenAI") as mock_openai:
        mock_client = mock_openai.return_value
        mock_stream = AsyncMock()
        mock_stream.__aiter__.return_value = [
            AsyncMock(choices=[AsyncMock(delta=AsyncMock(content="Hello"))]),
            AsyncMock(choices=[AsyncMock(delta=AsyncMock(content=" from OpenAI"))])
        ]
        mock_client.chat.completions.create.return_value = mock_stream
        
        with patch.dict(os.environ, {"LLM_PROVIDER": "openai", "OPENAI_API_KEY": "test-key"}):
            tokens = []
            async for token in llm.stream_response(messages, soul):
                tokens.append(token)
            
            assert "".join(tokens) == "Hello from OpenAI"
            mock_openai.assert_called_once()
