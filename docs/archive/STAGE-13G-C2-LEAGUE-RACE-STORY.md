> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13G-C2 — League race-story polish

## Scope

Stage 13G-C2 adapts the WC26/FPL-style league reference as a pattern source only. It does not port the screen.

## Pattern decisions

- Glanceable rank story: adopt-improved. Rows now show a clearer rank marker and support top-three/current-user context.
- Viewer row anchoring: adopt-improved. The current user receives a designed `YOU` treatment.
- Top-three treatment: adopt-improved. The app uses designed chips rather than medal emoji or copied reference treatment.
- Gap to leader: adopt-improved. Rows expose small race context such as `17 behind leader`.
- Rank movement: adapt/defer. Rank movement waits for trustworthy previous-rank data. No fake movement is displayed.
- Direct reference layout copy: drop. The Euro design system owns the presentation.

## Boundaries

- Original Predictor and KO Predictor standings remain separate.
- No scoring logic changed.
- No league write contract changed.
- No database migration was required.
- Active migrations remain 18.
- Migration 019 was not created.
