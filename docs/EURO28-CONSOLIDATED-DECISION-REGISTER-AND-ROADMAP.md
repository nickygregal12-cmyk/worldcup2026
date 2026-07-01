# EURO 2028 PREDICTOR
## Consolidated Decision Register and Build Roadmap
### Version 2.1 — Stage 10 admin results and tournament operations

> **Current authority:** agreed roadmap for the Euro 2028 rebuild.

## Current return point

- Migrations 001–012 are defined through the controlled Euro workflow.
- Canonical resolver, guest mode, authentication and atomic saving are complete.
- Original predictor and KO Predictor are separate competitions.
- Joker limits are 5 group, 0 original bracket and 5 KO Predictor.
- Stage 9 adds revisioned canonical results, correction audits, idempotent scoring, live tables, a live bracket and separate leaderboards.
- Stage 10 adds service-managed administrator access, revision-safe manual result entry, status controls, correction history and explicit recalculation.
- Direct browser writes to predictions, results and scoring tables remain unavailable.
- Guest predictions remain browser-only and unscored.

## Confirmed decisions

| Subject | Agreed position |
|---|---|
| Original predictor | 36 group scores plus winner-only pre-tournament bracket |
| KO Predictor | Separate real knockout-match competition and winner |
| Points separation | Original and KO totals never combine |
| Jokers | 5 group, 0 original bracket, 5 KO Predictor |
| Score meaning | 90 minutes plus added time |
| Advancement | Separate team field |
| Method | Normal time, extra time or penalties |
| Results | One canonical current record plus append-only revisions |
| Scoring corrections | Replacement recalculation, never additive duplication |
| Live vs predicted | Separate resolver contexts, never blended |
| Guest mode | Browser-only and unscored |
| Result writes | Authenticated admin RPCs after service-managed access checks |
| Admin assignment | Service-role or trusted SQL only; never self-service in the browser |
| Admin audit | Required notes and append-only operation events |

## Scoring model

### Original predictor

- Exact group score: 30.
- Correct group outcome: 10.
- Group joker: provisional 2×.
- Original bracket: points by team reaching each milestone.

### KO Predictor

- Exact 90-minute score: 30.
- Correct 90-minute outcome: 10.
- Correct advancing team: 10.
- Correct decision method: 5 when the advancing team is also correct.
- KO joker: provisional 2×.

## Roadmap

1. Reconciliation — complete.
2. Prediction storage — complete.
3. Canonical resolver — complete.
4. Guest foundation — complete.
5. Authentication and profiles — complete.
6. Atomic saving — complete.
7. Prediction journey — complete.
8. Competition split, jokers and grace — complete.
9. Results, scoring, live tables and separate leaderboards — complete.
10. Admin result and tournament control room — current.
11. Leagues and controlled shared prediction viewing.
12. Shared design system and page rebuild.
13. Seeded full-tournament test.
14. Pre-tournament configuration and optional result-provider integration.

## Open decisions

- Final joker multiplier.
- Official Euro 2028 tie-break regulations.
- Final team identities, group positions and kick-off times.
- Result provider.
- Awards categories.
- Final leaderboard tie-break policy beyond shared rank on equal points.
