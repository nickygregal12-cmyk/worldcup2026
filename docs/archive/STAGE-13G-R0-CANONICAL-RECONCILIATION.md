# Stage 13G-R0 — Canonical Documentation Reconciliation and Truthful Ledger v1.21

**Starting checkpoint:** `b7f50de`  
**Branch:** `euro28-development`  
**Migration boundary:** exactly 18; Migration 018 latest; Migration 019 forbidden in this batch.

## Purpose

Correct the governing documents before further product work. This package is documentation-only and records Nicky's explicit approval of Ledger v1.21, the Original-bracket invalidation specification, the revised Stage 13G structure, C1 Option A and offline-player decision-pending status.

## Accepted corrections

- Admin fail-closed access remains functional.
- Admin section destinations/deep links are missing.
- Admin UI fit for purpose is incoherent.
- The complete Admin operations backbone is partial until 13G-A.
- The Stage 13F-F audit passed because it checked source strings/IDs/CSS markers, not rendered clicks, route state, direct links, refresh, history or protected fallback.
- Ledger history uses accepted commits consistently and updates in every future batch commit.
- The standalone 3 July addendum is removed after its valid decisions are consolidated into the canonical Register.

## Approved Original-bracket invalidation contract

Trigger only when an Original Bracket pick exists and a group-score edit changes predicted ordering, qualifying-third order/combination or a knockout occupant. The first affected edit per browser session warns that the bracket will change. Cancel saves nothing. Confirmation recalculates all dependent standings and slots, preserves incompatible previous picks visibly as invalid, excludes them from completion/scoring, never transfers them automatically, cascades downstream invalidity and links the user to the earliest affected tie. The Original entry cannot be complete until repaired. The KO Predictor remains entirely separate.

## Approved sequence

13G-R0 → 13G-A → 13G-B → 13G-C → 13G-D → 16A → 13G-E → 15E → 13P-A.

## Temporary Results Admin

The repository cannot prove the live assignment state. Do not revoke it in R0. After R0 acceptance, perform a read-only staging role check; if no K3 evidence remains outstanding, revoke only the temporary Results Admin with an append-only audit note and verify denial before 13G-A product work. Never revoke the owner.

## Exact document manifest

Changed:
- `docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md`
- `docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md`
- `docs/EURO28-AGENT-RULES-AND-ROADMAP.md`

Added:
- `docs/STAGE-13G-R0-CANONICAL-RECONCILIATION.md`

Removed after installation:
- `docs/EURO28-DECISION-REGISTER-ADDENDUM-2026-07-03.md`

## Acceptance

Acceptance requires exact payload verification, baseline checkpoint verification, confirmation of 18 migrations/no Migration 019, focused documentation checks, full `npm run check`, exact staged manifest, commit/push and deployed app-shell verification. The Ledger must be committed with the batch.
