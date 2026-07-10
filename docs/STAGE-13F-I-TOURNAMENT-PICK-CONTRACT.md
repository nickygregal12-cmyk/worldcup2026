# Stage 13F-I — Tournament-Pick Contract

**Starting checkpoint:** `74c8dd3`
**Competition:** Original Predictor only
**Database:** no database migration in 13F-I (the scoring-value alignment is Stage DP-SCORING)

> **Amended by Stage DP-SCORING (2026-07-10):** the flat-20 values and the
> Highest-Scoring Team pick recorded in the original 13F-I are superseded by the
> locked scoring contract (CLAUDE.md §4). The current values are below.

## Approved pick set

| Pick | Value | Winning rule |
|---|---:|---|
| Total group-stage goals | 25 / 15 / 5 points | Auto-calculated from the user's 36 group-stage score predictions — never player-entered. Tiered by absolute distance from the official group-goals total: exact 25, within 5 → 15, within 10 → 5, otherwise 0. Bands are inclusive (exactly 5 off → 15, exactly 10 off → 5). |
| Top scorer | 30 points | The selected player must be among the official top-scorer winner set. Every official joint winner receives the full 30. |

Highest-Scoring Team has been dropped from the contract entirely — it is not a feature.

## Shared rules

- These are Original Predictor picks and never enter KO Predictor scoring.
- Both lock at the one global tournament lock.
- Jokers cannot be applied.
- Values come from the central versioned contract, not component calculations.
- No extra pick acts as the final leaderboard tiebreaker.
- Unresolved official outcomes show as pending and award no provisional points.
- Corrections to official outcomes must trigger correction-safe central recalculation and retain audit history.
- There is no standalone Awards destination. The eventual prediction journey, Home live-race card, points breakdown, H2H and player-insight surfaces consume the same canonical contract.

## Player-data boundary

The top-scorer contract is approved now, but the real selectable player pool activates only in Stage 17A after official squad/player data exists. Before then, production must not invent placeholder players or allow free-text identities.

## Delivery boundary

Stage 13F-I approved and tested the product/scoring contract only. The scoring-value alignment onto the locked contract, the group-goals scoring tiers, and the KO Predictor and group-position scoring runtime are Stage DP-SCORING.

## Acceptance evidence

- versioned contract constants and deterministic helpers;
- unit coverage for the tiered group-goals bands and official joint top-scorer winners;
- roadmap, decision register and Functional Completion Ledger reconciliation;
- automated `audit:tournament-picks` gate;
- full repository gate.
