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


def detect_emotion(text: str) -> str:
    """Simple keyword-based emotion detection."""
    text = text.lower()
    if any(w in text for w in ["haha", "lol", "awesome", "great", "yay", "happy"]):
        return "joy"
    if any(w in text for w in ["sorry", "sad", "upset", "miss", "bad"]):
        return "thoughtful"
    if "?" in text or any(w in text for w in ["curious", "why", "how", "what"]):
        return "curious"
    return "neutral"


_SEARCH_TRIGGERS = [
    "what is", "what are", "who is", "who are", "where is", "where are",
    "when is", "when did", "how do", "how does", "how much", "how many",
    "why does", "why is", "tell me about", "explain", "define",
    "weather", "news", "latest", "current", "today", "price of",
    "score", "result", "who won", "capital of", "population of",
]

def _needs_search(text: str) -> bool:
    """Return True if the message looks like a factual/internet query."""
    lowered = text.lower()
    return any(trigger in lowered for trigger in _SEARCH_TRIGGERS)


async def _stream_groq(messages: List[dict], soul: Soul, context: str) -> AsyncGenerator[str, None]:
    """Stream response from Groq."""
    from groq import AsyncGroq
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY", ""))
    model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    system_prompt = _build_system_prompt(soul, context)

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


async def _stream_openai(messages: List[dict], soul: Soul, context: str) -> AsyncGenerator[str, None]:
    """Stream response from OpenAI."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    system_prompt = _build_system_prompt(soul, context)

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
        logger.error(f"[LLM] OpenAI error: {exc}")
        yield "Give me a sec..."


async def _stream_gemini(messages: List[dict], soul: Soul, context: str) -> AsyncGenerator[str, None]:
    """Stream response from Gemini."""
    import google.generativeai as genai
    from google.generativeai.types import ContentDict
    
    genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    system_prompt = _build_system_prompt(soul, context)
    
    try:
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_prompt
        )
        
        # Convert messages to Gemini format
        chat_history: List[ContentDict] = []
        for m in messages[:-1]:
            role = "user" if m["role"] == "user" else "model"
            chat_history.append({"role": role, "parts": [m["content"]]})
        
        chat = model.start_chat(history=chat_history)
        response = await chat.send_message_async(messages[-1]["content"], stream=True)
        
        async for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as exc:
        logger.error(f"[LLM] Gemini error: {exc}")
        yield "Give me a sec..."


async def stream_response(
    messages: List[dict],
    soul: Soul,
    memory_block: str = "",
) -> AsyncGenerator[str, None]:
    """
    Stream LLM response tokens.
    Injects web search context for factual queries.
    """
    from backend.services.search import search_fact  # lazy import

    provider = os.getenv("LLM_PROVIDER", "groq")

    # ── Search augmentation ──────────────────────────────────────────────────
    search_context = ""
    if messages:
        last_user_msg = next(
            (m["content"] for m in reversed(messages) if m["role"] == "user"), ""
        )
        if last_user_msg and _needs_search(last_user_msg):
            try:
                result = await search_fact(last_user_msg)
                if result and "couldn't find" not in result and "fuzzy" not in result:
                    search_context = f"\n<SEARCH_RESULT>\n{result}\n</SEARCH_RESULT>"
                    logger.info(f"[LLM] Search augmented for: {last_user_msg[:50]}")
            except Exception as exc:
                logger.warning(f"[LLM] Search failed, proceeding without: {exc}")

    context = memory_block + search_context

    if provider == "groq":
        async for token in _stream_groq(messages, soul, context):
            yield token
    elif provider == "openai":
        async for token in _stream_openai(messages, soul, context):
            yield token
    elif provider == "gemini":
        async for token in _stream_gemini(messages, soul, context):
            yield token
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
