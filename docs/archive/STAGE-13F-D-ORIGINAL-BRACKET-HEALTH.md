# Stage 13F-D — Original Bracket Health

## Accepted scope

Stage 13F-D adds a read-only comparison layer to the locked Original bracket. The saved prediction is never mutated. Canonical real fixtures are used only when both participants are known; unresolved future fixtures continue to show the original predicted matchup.

## Delivered behaviour

- round-by-round health and alive/out counts;
- secured and maximum remaining bracket points;
- exact-matchup, changed-opponent, saved-winner-alive, survived, lost and route-conflict explanations;
- known real fixtures linked to the existing Match Centre;
- unresolved fixtures retained as the user’s original prediction;
- loading and error states;
- shared TeamLabel and semantic-token presentation in both themes.

## Boundaries

- Original and live bracket states remain independently resolved;
- KO Predictor points remain separate;
- no scoring, lock, privacy, resolver, RPC, data-model or migration change;
- migration count remains 15 and Migration 016 is absent.
