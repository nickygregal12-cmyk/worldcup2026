# Stage 13F-G — Staging Time & Phase

Stage 13F-G adds an owner-only, audited staging clock. The control is stored separately from fixtures, results, locks and scoring. It applies only when the tournament remains provisional and the client build explicitly sets `VITE_APP_ENV=staging` and `VITE_ENABLE_TIME_TRAVEL=true`.

Migration 016 is approved because a shared, persistent and auditable clock cannot be implemented safely as browser-only state.
