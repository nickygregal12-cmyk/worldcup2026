# Stage 13G-C6 — Compact league page shell

## Why this exists

Stages 13G-C4 and C5 corrected the league table and moved member breakdowns into a row detail destination. Stage 13G-C6 reduces the surrounding page weight so the default mini-league experience feels closer to a simple running table.

## Product rule

The default league shell should lead with league selection, competition selection and the rank member points table.

Secondary information belongs after the table. League code is tucked away but remains copyable. Lifecycle copy, privacy copy, summary cards and shared-member notes sit behind details after the table.

## Delivered

- Shortened the page heading.
- Kept the compact standings table as rank, member and points.
- Tucked the league code into a disclosure control.
- Moved lifecycle copy and summary cards behind details after the standings table.
- Kept the row-driven member detail destination from Stage 13G-C5.
- Added compact shell CSS through the leagues CSS module.

## Boundaries

- Original Predictor and KO Predictor remain separate.
- No scoring logic changed.
- No RPC write contract changed.
- No database migration was required.
- Active migrations remain 18.
- Migration 019 was not created.
