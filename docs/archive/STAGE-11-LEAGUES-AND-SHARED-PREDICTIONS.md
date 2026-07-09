> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 11 — Leagues and shared prediction viewing

Stage 11 adds private Euro leagues above the already separated Original Predictor and KO Predictor scoring systems.

## One membership list, two tables

A private league has one member list and one join code. The same people appear in both competition tabs, but every standings read requires one explicit competition key:

- `original` — group scores plus the pre-tournament winner-only bracket;
- `ko_predictor` — real knockout-match predictions only.

Points are never added together across those tabs.

## Trusted league operations

Authenticated users use security-definer RPCs to:

- create a league;
- join by private code;
- list their leagues;
- leave as an ordinary member;
- delete as the owner;
- read one competition-specific league table;
- read another member's predictions only when the relevant lock permits it.

`leagues` and `league_members` have RLS enabled and no browser table grants or write policies.

## Overall and league viewing

The overall leaderboard is also a universal people/points table. Signed-in users can select another predictor after the relevant lock through `get_member_predictions_after_lock()`. Private-league comparisons add a membership check through `get_league_member_predictions()`. Both wrappers use the same lock-aware bundle builder.

## Shared prediction privacy

### Original Predictor

The whole original bundle stays private until `tournaments.prediction_locked_at` has been persisted. After that global lock, league members may compare:

- the 36 group scores and jokers;
- the 15 winner-only bracket picks.

### KO Predictor

KO Predictor visibility is rolling. A league member can see only fixtures that have individually started, based on canonical kick-off/status data. Future knockout picks remain hidden.

## Head to head

Clickable league members open a comparison using the same controlled RPC for both users. The browser calculates display-only comparison counts:

- exact scores in common;
- original bracket winners in common;
- KO advancing teams in common;
- KO decision methods in common.

This comparison does not change points or store a merged bracket.

## Deliberate exclusions

Stage 11 does not add:

- league-specific scoring rules;
- combined Original and KO totals;
- public league browsing;
- email or account identity disclosure;
- result-provider integration;
- the full final visual redesign.
