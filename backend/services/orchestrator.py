import asyncio
import logging
from typing import Coroutine, Dict

logger = logging.getLogger(__name__)

class VoiceOrchestrator:
    """
    Manages the lifecycle of voice response tasks.
    Supports cancellation (Barge-in) and session-based task tracking.
    """
    def __init__(self):
        self.active_tasks: Dict[str, asyncio.Task] = {}

    def start_response(self, session_id: str, coro: Coroutine) -> asyncio.Task:
        """
        Starts a new response task, cancelling any previous task for the session.
        """
        # Cancel previous task if it exists
        if session_id in self.active_tasks:
            task = self.active_tasks[session_id]
            if not task.done():
                task.cancel()
                logger.info(f"[Orchestrator] Cancelled active task for {session_id}")
        
        # Create new task
        new_task = asyncio.create_task(coro)
        self.active_tasks[session_id] = new_task
        
        # Cleanup when task is done
        new_task.add_done_callback(lambda t: self.active_tasks.pop(session_id, None))
        
        return new_task

    async def cancel_response(self, session_id: str) -> None:
        """
        Explicitly cancels the active task for a session.
        """
        if session_id in self.active_tasks:
            task = self.active_tasks[session_id]
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                logger.info(f"[Orchestrator] Explicitly cancelled task for {session_id}")
            # The done_callback will handle the pop from active_tasks
