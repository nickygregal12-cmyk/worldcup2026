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

## KO Predictor scoring

| Item | Points |
|---|---:|
| Correct 90-minute score | 10 total, not cumulative |
| Correct advancing team, without exact score | 5 |
| Correct 90-minute result | 5 for draw/advancement edge cases |
| Correct method of advancement | +3, requires correct advancing team |
| Correct first-goal time bracket | +3 provisional/API-dependent |

Rules:

- Exact 90-minute score and correct 90-minute result are not cumulative.
- Method bonus requires the correct advancing team.
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
