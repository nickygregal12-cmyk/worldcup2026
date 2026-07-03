# Stage 13F-I — Tournament-Pick Contract

**Starting checkpoint:** `74c8dd3`
**Competition:** Original Predictor only
**Database:** no database migration

## Approved pick set

| Pick | Value | Winning rule |
|---|---:|---|
| Total tournament goals | 20 points | Every prediction at the nearest absolute distance from the official final total receives the full value. Exact predictions naturally win when present. |
| Top scorer | 20 points | The selected player must be among the official top-scorer winner set. Every official joint winner is valid. |
| Highest-scoring team | 20 points | The selected team must be among the teams tied for the greatest official tournament goal total. Every joint winner is valid. |

## Shared rules

- These are Original Predictor picks and never enter KO Predictor scoring.
- All three lock at the one global tournament lock.
- Jokers cannot be applied.
- Values come from the central versioned contract, not component calculations.
- No extra pick acts as the final leaderboard tiebreaker.
- Unresolved official outcomes show as pending and award no provisional points.
- Corrections to official outcomes must trigger correction-safe central recalculation and retain audit history.
- There is no standalone Awards destination. The eventual prediction journey, Home live-race card, points breakdown, H2H and player-insight surfaces consume the same canonical contract.

## Player-data boundary

The top-scorer contract is approved now, but the real selectable player pool activates only in Stage 17A after official squad/player data exists. Before then, production must not invent placeholder players or allow free-text identities.

## Delivery boundary

Stage 13F-I approves and tests the product/scoring contract only. It does not add persistence, RPCs, admin outcome entry or live UI. Those require their owning implementation stages and a separately approved database design if current tables and operations cannot support them safely.

## Acceptance evidence

- versioned contract constants and deterministic helpers;
- unit coverage for nearest-total ties and official joint winners;
- roadmap, decision register and Functional Completion Ledger reconciliation;
- automated `audit:tournament-picks` gate;
- full repository gate;
- migration count remains 16.
