> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13G-A — Central Configuration and Shared Primitive Groundwork

**Starting checkpoint:** `c8a5cf3`  
**Scope:** configuration and interaction primitive slice only.  
**Database:** no migration; Migration 019 must not exist.

## Delivered

- Central provisional Euro 2028 tournament lifecycle values in `TOURNAMENT_CONFIG`:
  - prediction lock: `2028-06-09T19:00:00.000Z`;
  - tournament start: `2028-06-09T20:00:00.000Z`.
- `resolveTournamentLifecycle()` as the single frontend lock resolver for the Original Predictor.
- Account autosave no longer fails closed merely because shared staging has no database `prediction_lock_at`; it uses the central provisional config until the database provides a value.
- The resolver prefers database values over central provisional values and treats a persisted `prediction_locked_at` as irreversible.
- Shared `ConfirmDialog` primitive and first adoption for sign-out.
- Shared `SelectField` primitive and first adoption for League/member pickers.
- `REFRESH_POLICY` groundwork with manual-refresh defaults disabled and mutation invalidation intent recorded.
- Focused `audit:shared-primitives` added to `npm run check`.

## Boundaries

- The central provisional lock does not apply the real irreversible global lock.
- No database value is written.
- No migration is added.
- Remaining destructive actions, Admin selectors and refresh consumers migrate incrementally under the ledger rows left partial.
