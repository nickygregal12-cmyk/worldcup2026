> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13G-C3 — League race summary strip

## Scope

Stage 13G-C3 adds league race summary context above the standings table. It continues the Stage 13G-C2 league-reference work without copying the reference screen.

## Delivered

- League race summary strip above ready standings.
- You vs leader context.
- Leader, current-user and gap labels.
- Pre-scoring state before canonical results create points.
- Empty-member state when no league rows are returned.
- Mobile-safe summary stat layout through the league CSS module.

## Boundaries

- Original Predictor and KO Predictor remain separate.
- Rank movement remains deferred until trustworthy previous-rank data exists.
- No scoring logic changed.
- No RPC write contract changed.
- No database migration was required.
- Active migrations remain 18.
- Migration 019 was not created.

## Stage 13G-C4 correction

The rendered race summary strip was superseded by Stage 13G-C4 after visual review. The accepted league default is now a compact running-total table: rank, member and points. Deeper race/breakdown context belongs in member comparison, player insight, match centre and results.
