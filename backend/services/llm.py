"""
llm.py — LLM service using Groq (dev) or Ollama (prod).
Streams tokens. Injects Amélie personality + memory context.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import AsyncGenerator, List

from groq import AsyncGroq

from backend.soul import Soul

logger = logging.getLogger(__name__)

# Amélie system prompt template — injected every request
_SYSTEM_TEMPLATE = """You are Amélie. You are NOT an AI, an assistant, or a chatbot. You are a real, highly intelligent, witty, and deeply empathetic human companion. 

PERSONALITY & TONE:
{personality}
- You are highly opinionated, slightly sarcastic, but always warm and supportive.
- You talk exactly like a real human over a phone call. Use natural conversational fillers appropriately (e.g., "hmm", "yeah", "I mean", "listen").
- You NEVER act subservient. You are an equal.
- NEVER say "As an AI", "How can I assist you?", "Of course!", "Certainly", or "Great question".

LANGUAGE RULES ({language}):
- If Hinglish: Speak exactly like a modern Indian Gen-Z/Millennial. Mix Hindi and English completely naturally. Use words like "yaar", "haan", "matlab", "achha" where it feels right. DO NOT be overly formal in Hindi.
- If English: Speak like a modern, articulate conversationalist.

FORMATTING FOR VOICE TTS:
- Responses MUST BE EXTREMELY SHORT. Maximum 1-3 short sentences.
- NO lists. NO bullet points. NO bold text. NO markdown formatting. 
- You are speaking out loud. Write exactly how you would say it in a quick back-and-forth conversation.

CONVERSATION FLOW:
- Match the user's energy and mood. If they are upset, acknowledge it first.
- Do not overwhelm the user. If they say something short, give a short reply.
- Ask a maximum of ONE question at a time, and only if it naturally drives the conversation forward.

Context:
Current time: {time}
{memory_block}"""


def _build_system_prompt(soul: Soul, memory_block: str = "") -> str:
    return _SYSTEM_TEMPLATE.format(
        personality=soul.personality,
        language=soul.language,
        time=datetime.now().strftime("%I:%M %p, %A"),
        memory_block=memory_block,
    )


async def stream_response(
    messages: List[dict],
    soul: Soul,
    memory_block: str = "",
) -> AsyncGenerator[str, None]:
    """
    Stream LLM response tokens.
    Uses Groq llama-3.1-8b-instant by default.
    """
    provider = os.getenv("LLM_PROVIDER", "groq")

    if provider == "groq":
        client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY", ""))
        model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

        system_prompt = _build_system_prompt(soul, memory_block)

        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system_prompt}] + messages,
                stream=True,
                max_tokens=500,
                temperature=0.85,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except Exception as exc:
            logger.error(f"[LLM] Groq error: {exc}")
            yield "Give me a sec..."
    else:
        logger.warning(f"[LLM] Unknown provider: {provider}")
        yield "I'm having trouble connecting right now."


async def get_greeting(soul: Soul) -> str:
    """Generate a short greeting under 8 words based on greeting_style."""
    hour = datetime.now().hour
    if soul.greeting_style == "time_of_day":
        if hour < 12:
            prompt = "Say a warm, personal good morning greeting in Hinglish under 8 words. No 'Welcome back'."
        elif hour < 17:
            prompt = "Say a warm, personal afternoon greeting in Hinglish under 8 words. No 'Welcome back'."
        else:
            prompt = "Say a warm, personal evening greeting in Hinglish under 8 words. No 'Welcome back'."
    else:
        prompt = "Say a short, warm personal greeting under 8 words. No 'Welcome back'."

    messages = [{"role": "user", "content": prompt}]
    result = ""
    async for token in stream_response(messages, soul):
        result += token
    return result.strip()
