# Stage 2 rules reconciliation

Status: implementation complete when the reconciliation checks, tests and build pass.

## Why this batch exists

Earlier Stage 2 documents incorrectly excluded jokers, treated submission as absent and omitted exceptional grace windows. The owner clarified the intended behaviour before Migration 005 was applied. This batch corrects the contracts first, so the storage migration can be designed from agreed rules rather than patched afterwards.

## Resolved decisions

- Submit is a reversible review mode, not an eligibility gate.
- Autosave remains backed by an atomic full-bundle write.
- Jokers are included and remain movable only among unstarted matches.
- Exact joker caps remain provisional.
- Knockout score predictions always use the 90-minute score.
- Advancing team and decision method remain separate.
- Admin-granted grace is scoped to one user and one unstarted match and is audited.
- Guest/explore is part of the core architecture and has no server-side storage.
- Guest, predicted and live brackets use one canonical resolver and are never blended.
- Results API integration is deferred; manual result entry remains authoritative.

## Database consequence

The old Stage 2 Batch 4 package is superseded and must not be used. A new Migration 005 package must be generated after this reconciliation is committed.
