"""
main.py — Amélie FastAPI application entry point.
"""
from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# Celery for background memory tasks (optional — requires Redis)
# Only initialised if CELERY_ENABLED=true in .env
import os as _os
if _os.getenv("CELERY_ENABLED", "false").lower() == "true":
    from celery import Celery
    celery_app = Celery(
        "amelie",
        broker=f"redis://{_os.getenv('REDIS_HOST', 'localhost')}:6379/0",
        backend=f"redis://{_os.getenv('REDIS_HOST', 'localhost')}:6379/0"
    )
else:
    celery_app = None  # type: ignore
    logger_pre = __import__("logging").getLogger(__name__)
    # Logged after basicConfig below

from backend.routers.chat import router as chat_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Amélie Backend",
    description="Voice-native AI companion — FastAPI WebSocket backend",
    version="0.1.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/health")
async def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "app": "Amélie", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
