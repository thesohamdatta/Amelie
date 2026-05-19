"""
sqlite.py — Persistent storage for user profile and session logs.
"""
import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.getenv("SQLITE_DB_PATH", "amelie.db")

def init_db():
    """Initialise the database with required tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # User Profile table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_profile (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')
    
    # Session Logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS session_logs (
            session_id TEXT PRIMARY KEY,
            summary TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def set_profile_value(key: str, value: any):
    """Set a value in the user profile."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO user_profile (key, value) VALUES (?, ?)",
        (key, json.dumps(value))
    )
    conn.commit()
    conn.close()

def get_profile_value(key: str, default=None):
    """Get a value from the user profile."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM user_profile WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row[0])
    return default

def save_session_summary(session_id: str, summary: str):
    """Save a summary of a completed session."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO session_logs (session_id, summary) VALUES (?, ?)",
        (session_id, summary)
    )
    conn.commit()
    conn.close()

def get_all_summaries() -> str:
    """Return all session summaries concatenated for context."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT summary FROM session_logs ORDER BY timestamp DESC LIMIT 5")
    rows = cursor.fetchall()
    conn.close()
    return "\n".join([row[0] for row in rows])

# Auto-init on import
init_db()
