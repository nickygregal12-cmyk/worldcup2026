> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

> **Superseded by Stage 8:** Stage 7 temporarily represented knockout score rows inside the original 51-row bundle. Stage 8 corrects this: the original bracket is winner-only with no jokers, while real knockout score predictions belong to a completely separate KO Predictor competition.

# Stage 7 — Prediction Journey and Autosave UX

## Status

Implemented on `euro28-development` after Stage 6 atomic saving.

Stage 7 is an application-layer batch only. It adds no migration and keeps the active migration count at nine.

## Delivered journey

The active Euro foundation now provides:

- six group prediction panels covering all 36 fixtures;
- score inputs with immediate guest browser persistence;
- one canonical predicted knockout bracket covering matches 37–51;
- separate 90-minute score, advancing-team and decision-method controls;
- automatic normal-time winner alignment for non-draw knockout scores;
- completeness guidance across groups, knockout and the whole tournament;
- quiet signed-in autosave after an 800 ms pause;
- visible queued, saving, saved, conflict and locked states;
- optimistic revision handling through Migration 009;
- explicit complete guest-to-account import;
- reversible Submit Predictions and Edit Predictions review mode;
- stale knockout diagnosis and controlled clearing;
- portable guest JSON import and export.

## Storage boundaries

Guest edits remain in browser `localStorage`. Signing in does not upload them.

Signed-in edits call only:

```text
public.save_my_prediction_bundle()
```

No direct browser `INSERT`, `UPDATE`, `UPSERT` or `DELETE` operation is added.

## Canonical progression

The Stage 3 resolver remains the only bracket engine. Group scores determine group ordering, best-third allocation and Round of 16 participants. Every advancing-team choice progressively resolves the later knockout matches.

Live and predicted contexts remain separate.

## Review mode

Submit is a presentation state, not a scoring gate:

- no rows are copied;
- `submitted_at` is reversible before the global lock;
- saved and unsubmitted predictions remain equally eligible;
- Edit Predictions returns the user to the editor before lock.

## Jokers

Joker storage and server enforcement already exist, but Stage 7 deliberately hides joker controls because both exact caps remain unresolved. The interface fails closed rather than exposing an option the server would reject.

## Deliberate exclusions

Stage 7 does not add:

- Migration 010;
- scoring runs or points calculations;
- live results or live tables;
- leagues or leaderboards;
- admin result entry;
- visible grace-window administration;
- result-provider integration.

## Verification

```bash
npm run audit:journey
npm run check
```

The focused audit verifies:

- nine active migrations and no Migration 010;
- the integrated groups, knockout and review views;
- guest-local and account-RPC storage boundaries;
- the 800 ms quiet autosave delay;
- reversible review controls;
- no direct browser table writes;
- no scoring, league or result implementation.
