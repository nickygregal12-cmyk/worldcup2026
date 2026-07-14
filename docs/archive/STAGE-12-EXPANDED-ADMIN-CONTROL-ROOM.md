> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage 12 — Expanded admin tournament control room

## Purpose

Complete the operational controls needed to run Euro 2028 safely without weakening the existing result, prediction, league or scoring boundaries.

## Delivered

### Irreversible global lock

Tournament owners may persist `prediction_locked_at` through a protected RPC. The action requires an audit note, appends one operation event and cannot be undone from the browser or database API.

### Prediction grace

Owners may search by display name and grant an exception for:

- one authenticated user;
- one competition;
- one unstarted match;
- one explicit expiry before kick-off.

Active, expired and revoked grace windows remain visible. Revocation requires a second note and creates another append-only operation event.

### Feature controls

Five browser kill-switches are revisioned and owner-managed:

- prediction saving;
- KO Predictor;
- league creation and joining;
- manual result entry;
- explicit scoring recalculation.

The database enforces each control. UI state alone is never trusted. Service-role recovery is deliberately not blocked.

### Operational health

The control room reports:

- fixture and participant completeness;
- missing kick-off times;
- live/paused matches;
- confirmed, manual-review and void results;
- failed or stale scoring runs;
- active and expired grace;
- disabled features;
- per-match joker lock state and allocation count;
- all 30 knockout source slots and their current resolution.

### Combined audit timeline

Admin grants, result changes, status updates, recalculation, feature changes, grace and the global lock use one append-only operational timeline.

### Lint correction

Migration 014 removes the redundant Stage 11 loop declaration and uses `statement_timestamp()` in the stable shared-prediction builder.

## Security boundary

- Owner controls require an active `owner` assignment.
- Results administrators may read operational status but cannot change owner-only controls.
- Browser roles receive no direct writes to feature controls, grace or audit tables.
- Admin access remains service-managed.
- There is no global unlock route.
- WC26 production is untouched.

## Deliberately deferred

- External score-provider integration.
- Final shared visual design system.
- Seeded full-tournament rehearsal.
- Final tournament configuration and tie-break policy.
