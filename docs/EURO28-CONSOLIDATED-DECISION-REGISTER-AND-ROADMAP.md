# EURO 2028 PREDICTOR
## Consolidated Decision Register and Build Roadmap
### Version 2.2 — Stage 11 leagues and shared predictions

> **Current authority:** agreed roadmap for the Euro 2028 rebuild.

## Current return point

- Migrations 001–013 are defined through the controlled Euro workflow.
- Canonical resolver, guest mode, authentication and atomic saving are complete.
- Original Predictor and KO Predictor are separate competitions.
- Joker limits are 5 group, 0 original bracket and 5 KO Predictor.
- Revisioned results, replacement scoring, live tables and separate leaderboards are complete.
- Service-managed admin result operations are complete.
- Stage 11 adds private leagues, an overall people/points table, two separate competition standings and lock-aware prediction comparison.
- Direct browser table writes remain unavailable.
- Guest predictions remain browser-only and unscored.

## Confirmed decisions

| Subject | Agreed position |
|---|---|
| Original Predictor | 36 group scores plus winner-only pre-tournament bracket |
| KO Predictor | Separate real knockout-match competition and winner |
| Points separation | Original and KO totals never combine, including within leagues |
| League membership | One private member list may view both separate competition tables |
| Overall leaderboard | Universal signed-in people/points table with post-lock clickable prediction viewing |
| Original prediction visibility | Private until the global prediction lock |
| KO prediction visibility | Fixture by fixture after the real match starts |
| Jokers | 5 group, 0 original bracket, 5 KO Predictor |
| Score meaning | 90 minutes plus added time |
| Results | One canonical current record plus append-only revisions |
| Scoring corrections | Replacement recalculation, never additive duplication |
| Live vs predicted | Separate resolver contexts, never blended |
| Guest mode | Browser-only and unscored |
| Result writes | Authenticated admin RPCs after service-managed access checks |
| League writes | Authenticated controlled RPCs; no direct browser table writes |
| Shared identity | Display name only; no email or auth metadata disclosure |

## Scoring model

### Original Predictor

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
10. Secure admin result operations — complete.
11. Leagues and controlled shared prediction viewing — current.
12. Expanded admin tournament control room: lock, grace, joker allocation and feature controls.
13. Shared design system and page rebuild.
14. Seeded full-tournament test.
15. Pre-tournament configuration and optional result-provider integration.

## Open decisions

- Final joker multiplier.
- Official Euro 2028 tie-break regulations.
- Final team identities, group positions and kick-off times.
- Result provider.
- Awards categories.
- Final leaderboard tie-break policy beyond shared rank on equal points.
