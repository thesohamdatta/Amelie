# Domain Documentation

Project Amélie follows a **Single-context** layout for domain and architectural documentation.

## Locations

- **Domain Language:** `CONTEXT.md` at the repo root (primary source of truth for terminology and business logic).
- **Architecture Decisions:** `docs/adr/` contains Architectural Decision Records (ADRs).

## Consumer Rules

- `improve-codebase-architecture`: Consults `CONTEXT.md` to ensure refactoring aligns with domain boundaries.
- `diagnose`: Checks ADRs to understand why specific architectural choices were made.
- `tdd`: Uses the domain language to name test cases and interfaces.
