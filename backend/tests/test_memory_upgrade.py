import pytest
import os
from unittest.mock import patch, AsyncMock
from backend.services import memory
from backend.db import sqlite

def test_store_fact_persistence():
    """
    RED: Test that store_fact successfully saves a new fact to the database.
    """
    test_key = "user_facts"
    test_fact = "User likes black coffee."
    sqlite.set_profile_value(test_key, "")
    memory.store_fact(test_fact)
    saved_facts = sqlite.get_profile_value(test_key, "")
    assert test_fact in saved_facts

def test_store_fact_append():
    """
    RED: Test that store_fact appends to existing facts rather than overwriting.
    """
    test_key = "user_facts"
    sqlite.set_profile_value(test_key, "User has a dog.")
    memory.store_fact("User is moving to London.")
    saved_facts = sqlite.get_profile_value(test_key, "")
    assert "User has a dog." in saved_facts
    assert "User is moving to London." in saved_facts

@pytest.mark.asyncio
async def test_extract_and_store_facts():
    """
    RED: Test that extract_and_store_facts correctly identifies a fact 
    from a transcript and calls store_fact.
    """
    transcript = "User: I love drinking black coffee in the morning.\nAmélie: That's good to know!"
    
    with patch("backend.services.llm.get_raw_response", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = "User likes black coffee."
        
        with patch("backend.services.memory.store_fact") as mock_store:
            await memory.extract_and_store_facts(transcript)
            mock_store.assert_called_with("User likes black coffee.")

@pytest.mark.asyncio
async def test_extract_and_store_facts_no_fact():
    """
    RED: Test that it doesn't store anything if no facts are found.
    """
    transcript = "User: Hello.\nAmélie: Hi there!"
    
    with patch("backend.services.llm.get_raw_response", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = "NONE"
        
        with patch("backend.services.memory.store_fact") as mock_store:
            await memory.extract_and_store_facts(transcript)
            mock_store.assert_not_called()

@pytest.mark.asyncio
async def test_build_memory_block_with_hyde():
    """
    RED: Test that build_memory_block uses HyDE (LLM-generated hypothetical answer)
    to search ChromaDB.
    """
    session_id = "test-session"
    user_query = "What did I say about coffee?"
    hyde_answer = "The user mentioned they love black coffee in the morning."
    
    with patch("backend.services.llm.get_raw_response", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = hyde_answer
        
        with patch("backend.db.chroma.query_memory") as mock_chroma:
            mock_chroma.return_value = ["User loves black coffee."]
            
            with patch("backend.db.sqlite.get_profile_value") as mock_sqlite:
                mock_sqlite.return_value = "User lives in Goa."
                
                # We need to make build_memory_block async to use LLM
                memory_block = await memory.build_memory_block(session_id, user_query)
                
                assert "User loves black coffee." in memory_block
                # Verify Chroma was searched with the HyDE answer, not the user query
                mock_chroma.assert_called_with(hyde_answer)
                mock_llm.assert_called()
