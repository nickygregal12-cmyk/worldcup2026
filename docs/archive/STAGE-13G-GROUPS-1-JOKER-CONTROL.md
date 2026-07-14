> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage 13G-GROUPS-1 — Joker Pill and Shared Joker Meter

Status: implementation package.
Scope: Groups joker control and shared joker meter only.

## Implemented

- Replaces the retired bare `J` circle on the Groups predictor surface with the approved `JokerPill` primitive.
- Adds a shared `JokerMeter` primitive with the approved five-dot gold meter pattern.
- Shows the visible `Joker` label on every joker pill.
- Shows `2×` only when a joker is armed.
- Keeps disabled cap treatment explicit when the five-group-joker cap is reached.
- Keeps the existing five group jokers, zero Original Bracket jokers and five separate KO Predictor jokers contract unchanged.
- Keeps the existing save, grace, lock, started-match and review-mode behaviour unchanged.

## Not in this slice

- No match-card venue meta-line implementation.
- No score-stepper implementation.
- No view switcher rebuild.
- No predicted table or third-place table rebuild.
- No bracket rebuild.
- No league or Player View rebuild.
- No Supabase write change.
- No resolver or scoring change.
- No migration and no Migration 019.

## Acceptance

- `npm run audit:stage13g-groups-joker-control`
- `npm test -- src/design-system/__tests__/JokerControl.test.jsx`
- `npm run check`
- `npm run build`

## Next recommended task

`13G-GROUPS-2 — Groups view switcher, phase default and context banner implementation`
