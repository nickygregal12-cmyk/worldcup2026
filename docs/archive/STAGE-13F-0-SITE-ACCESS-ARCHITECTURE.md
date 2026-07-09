> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13F-0 — Site-wide information architecture and access
## Batch scope from checkpoint `7261888`

## Objective

Make the current functional product deliberately accessible before adding further player-experience features.

## Ledger rows

This batch is intended to move:

- Results and leaderboards access: `PARTIAL` → `FUNCTIONAL`;
- Core player information architecture: `PARTIAL` → `FUNCTIONAL`.

Admin invisibility remains a separate missing row owned by Stage 13F-E and is not represented as complete by this batch.

## Delivered scope

- dedicated `leaderboards` route rather than a Results alias;
- separate Results and Leaderboards page modes;
- full Original/KO competition selector;
- matching points breakdown on the leaderboard destination;
- Leaderboards entry in More;
- direct Home leaderboard access, including competition-specific rank cards;
- canonical site-access map;
- site-access audit in `npm run check`;
- corrected and adopted Project Constitution.

## Safeguards

- no database change;
- no Migration 016;
- no scoring change;
- no privacy change;
- no lock change;
- no combined Original/KO total;
- no predicted/live bracket blending;
- no sixth permanent mobile navigation position;
- no WC26 source activation.

## Deferred

- non-admin destination invisibility: Stage 13F-E;
- universal player identity/H2H: Stage 13F-B;
- Match Centre route: Stage 13F-C;
- Bracket Health entry: Stage 13F-D;
- mount inversion and Foundation retirement: Stage 13F-H.
