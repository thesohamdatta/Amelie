# Agent Coordination Protocol

To ensure efficient development without conflicts, the Frontend and Backend agents follow this protocol:

## 1. Directory Ownership
- **Frontend Agent:** Controls `web/`
- **Backend Agent:** Controls `backend/`
- **Shared:** `docs/`, `soul.md`, `CONTEXT.md`

## 2. Communication via Docs
- **API Changes:** Any change to the WebSocket or REST contract MUST be updated in `docs/superpowers/specs/` first.
- **Feature Requests:** 
  - Frontend needs data? Write to `docs/architecture/API_REQUESTS.md`.
  - Backend needs a toggle? Write to `docs/architecture/FRONTEND_REQUESTS.md`.

## 3. Integration Testing
- Both agents must verify that the `/health` endpoint passes after any core change.
- Backend agent is responsible for the Python test suite (`backend/tests/`).
- Frontend agent is responsible for the React components and E2E hooks.
