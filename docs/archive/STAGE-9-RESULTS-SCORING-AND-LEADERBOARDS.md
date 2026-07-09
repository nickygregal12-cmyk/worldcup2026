> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 9 — Results, scoring and separate leaderboards

## Purpose

Stage 9 introduces one canonical result state, revisioned result corrections, idempotent point recalculation, live tables, a live bracket and two separate overall leaderboards.

The original predictor and KO Predictor remain different competitions. No query, total or leaderboard combines them.

## Canonical result state

`public.matches` remains the single current result record. Migration 011 adds:

- `result_status`: pending, confirmed, void or manual review;
- `result_revision`: a monotonic correction revision;
- result source and confirmer metadata;
- `match_result_events`: an append-only snapshot for every revision.

Only `completed + confirmed` results are scoreable. Live pending scores may appear in live tables, but they do not create points.

Penalty shoot-out kicks remain separate from the 90-minute and after-extra-time football scores.

## Trusted result writes

`private.euro28_record_match_result()` is service-role only. It:

1. locks and validates the target match;
2. validates resolved participants and the decision method;
3. increments the result revision;
4. writes an immutable audit event;
5. resolves downstream winner/loser slots where applicable;
6. calls idempotent recalculation.

No browser role can record, correct, void or confirm a result. The admin UI remains a later stage.

## Idempotent scoring

`private.euro28_recalculate_points()` deletes and rebuilds the affected point rows. A correction therefore replaces the old award rather than adding another award.

### Original predictor

- Group match: 30 exact or 10 correct outcome.
- Group joker: configured 2× multiplier.
- Original bracket: milestone points by team reaching the round, not by exact predicted path.
- No score, method or joker points from the original bracket.

### KO Predictor

- Real knockout match: 30 exact or 10 correct 90-minute outcome.
- Correct advancing team: 10.
- Correct method: 5, available only when the advancing team is correct.
- KO joker: configured 2× multiplier.
- No original bracket points.

## Separate totals and leaderboards

`prediction_totals` stores one total per prediction set and competition. The two authenticated read RPCs are:

```text
public.get_competition_leaderboard()
public.get_my_competition_points()
```

The original leaderboard contains group and original-bracket points. The KO Predictor leaderboard contains only real knockout-match points.

## Live tournament

`src/results/` reads canonical match results and resolves a `live` context through the same canonical resolver used by guest and predicted contexts. These contexts are never mixed.

- Pending live scores may update live group tables.
- Only confirmed completed winners progress the live knockout bracket.
- Void or manual-review scores are excluded.

## Deliberate exclusions

Stage 9 does not add:

- browser result-entry controls;
- private leagues;
- member prediction comparison;
- an external results provider;
- final official Euro 2028 tie-break regulations.

## STAGE-RULES-SCORING-LOCK-1 supersession note

The Stage 9 scoring values documented above describe the then-active provisional scoring implementation.

The later locked product target is now recorded in `docs/RULES-SCORING-LOCKED-CONTRACT.md` and `docs/STAGE-RULES-SCORING-LOCK-1.md`.

Do not treat this Stage 9 historical document as the final scoring source when planning future UI, Review, Prediction Trends or acceptance work.
