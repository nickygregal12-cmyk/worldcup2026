> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage 13F-G — Staging Time & Phase

Stage 13F-G adds an owner-only, audited staging clock. The control is stored separately from fixtures, results, locks and scoring. It applies only when the tournament remains provisional and the client build explicitly sets `VITE_APP_ENV=staging` and `VITE_ENABLE_TIME_TRAVEL=true`.

Migration 016 is approved because a shared, persistent and auditable clock cannot be implemented safely as browser-only state.
