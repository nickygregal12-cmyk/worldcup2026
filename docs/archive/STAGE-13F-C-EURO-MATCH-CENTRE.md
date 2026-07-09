> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13F-C — Euro Match Centre

Start checkpoint: `4b81fb1`.

This batch adds a dedicated per-fixture Match Centre without reusing WC26 MatchStats and without adding a database migration.

## Delivered

- Direct `#/match-centre?match=` route with safe query parsing.
- Previous and next fixture navigation.
- Canonical fixture state, score, result revision and unresolved-slot handling.
- Entry from Home and every Results row.
- Separate Original Predictor and KO Predictor tabs.
- Overall or private-league scope selection.
- Community distribution from released selections only.
- Points-on-the-line rows with player identity, current rank/points, saved selection, joker state and maximum available points.
- Signed-out, loading, error, private, not-saved, unresolved and corrected-result states.

## Boundaries

Original and KO Predictor points never combine. Existing global-lock and fixture-start privacy RPCs remain authoritative. No weather, odds, new result source, new scoring calculation, new table, RPC or Migration 016 is included.
