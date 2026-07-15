> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.


# Stage 13G-C5 — League row detail destination

## Why this exists

Stage 13G-C4 corrected the default league table back to a compact running total. Stage 13G-C5 makes the deeper detail feel intentional without adding more table columns.

## Product rule

The league table stays as rank member points.

Breakdowns stay out of the league table. Member comparison, point splits, gap context and privacy/lock copy belong in the row detail destination below the table.

## Delivered

- Removed the extra compare picker from the league page.
- Kept the compact standings table as rank, member and points.
- Made member rows open the detailed comparison destination.
- Added a selected-row treatment when a member detail is open.
- Moved the existing Player Head-to-Head surface into an explicit league member detail destination.
- Added mobile-safe scroll-to-detail behaviour after opening a member.

## Boundaries

- Original Predictor and KO Predictor remain separate.
- No scoring logic changed.
- No RPC write contract changed.
- No database migration was required.
- Active migrations remain 18.
- Migration 019 was not created.
