# Euro 2028 Predictor — Locked Rules and Scoring Contract

## Purpose

This is the concise owner-approved product contract for rules, scoring, tiebreaks and edge-case handling.
It is the source the next implementation stages should use when aligning the live Rules Hub, Review, Prediction Trends, scoring displays and acceptance checks.

## Status

Locked product target. Runtime implementation remains a later explicitly scoped alignment task where needed.

## Original Predictor scoring

| Item | Points |
|---|---:|
| Correct group match result | 3 |
| Correct group match score | 5 total, not cumulative |
| Correct exact group position | 2 per team |
| All 4 group positions correct in one group | +5 bonus |
| Correct team in Round of 16 | 8 per team |
| Correct team in Quarter-final | 12 per team |
| Correct team in Semi-final | 15 per team |
| Correct team in Final | 20 per team |
| Correct Champion | +25 bonus |
| Exact group-goals total | 25 |
| Group-goals total within 5 | 15 |
| Group-goals total within 10 | 5 |
| Correct top scorer | 30 |

Rules:

- Correct score and correct result are not cumulative.
- Champion scoring stacks with Final round-reached scoring.
- Group goals are auto-calculated only from the user's 36 group-score predictions.
- Original bracket picks do not use jokers.
- Original Predictor and KO Predictor points never combine.

### Highest-Scoring Team — DROPPED (owner ruling 2026-07-10)

Highest-Scoring Team does not exist and is not scored. It is a dead tournament
pick; it must not be entered, displayed, referenced or reintroduced anywhere.

### Top Scorer entry and ties (owner ruling 2026-07-10)

- Top Scorer is worth 30 and is entered on the Review surface (player pool
  pending Stage 17A).
- Top Scorer ties pay the full 30 to anyone who picked any tied official winner
  — nearest/joint winners all receive the full award, not a shared fraction.

### Joker multiplier (owner ruling 2026-07-10 — recorded amendment)

This contract previously defined joker caps but not the multiplier. The
multiplier is now recorded here:

- A joker **doubles that match's score points only**.
- It applies to **group matches and KO Predictor matches**.
- It never doubles position points, never doubles bonuses, and never applies to
  anything on the Original Bracket (bracket jokers do not exist).
- Caps are unchanged: 5 group / 0 bracket / 5 KO.

## KO Predictor scoring

Three additive components per match (owner ruling 2026-07-10; this supersedes the
earlier "draw-plus-advancer bonus, value TBD" amendment — the bonus **is** the
draw component):

| Item | Points |
|---|---:|
| Correct advancer, any method | 5 |
| Correct draw call (level at 90) | 5 |
| Exact 90-minute score | 5 |
| Regulation match maximum | 10 |
| Extra-time match maximum | 15 |

Rules:

- The three components are additive and independent: correct advancer (your
  picked team goes through by any method, including extra time or penalties);
  correct draw call (you predicted a level 90-minute score and it was level at
  90); and the exact 90-minute scoreline.
- A regulation game (decided inside 90 minutes) can earn advancer + exact only,
  so its maximum is 10. Only a game level at 90 can also earn the draw call, so
  an extra-time/penalties game maxes at 15.
- A joker doubles the whole match total.
- KO Predictor has its own five jokers and its own standings.
- Penalty shoot-out scores are never predicted for match-score points.

## API-dependent extras

These are not allowed to create manual admin burden:

- 5 points per goal by selected top scorer;
- KO first-goal time bracket +3.

They should only be enabled if reliable official/API data can confirm them automatically.

## Predicted-table unresolved ties

If the app cannot separate tied teams from the user's predicted scores after all supported score-derived tiebreakers, it must ask rather than silently choose.

User options:

- Change scores;
- Pick positions.

The selected order is not an extra prediction category and does not award points.

## Best third-place unresolved ties

If third-place teams remain tied after supported score-derived rules and the tie affects qualification or bracket placement, the app must ask the user to change scores or pick positions.

This applies only to the user's predicted bracket path. It must not affect official real tournament tables.

## Match states

Delayed, postponed, suspended, abandoned, replay-required and result-pending states do not score until the official result state is valid.

Predictions remain locked unless a separate rule explicitly approves unlocking.

## Final tied-rank ladders

Original Predictor final tied-rank ladder:

1. closest calculated group-stage goals total;
2. most exact group scores;
3. most correct group results;
4. knockout accuracy cascade;
5. shared rank.

KO Predictor final tied-rank ladder:

1. most exact KO scorelines;
2. most correct KO outcomes;
3. shared rank.

While the tournament is live, use shared ranks where final tiebreaks cannot yet be applied safely.
