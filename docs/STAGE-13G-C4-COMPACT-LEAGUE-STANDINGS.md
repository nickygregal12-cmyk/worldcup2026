# Stage 13G-C4 — Compact league standings correction

## Why this correction exists

Stage 13G-C2/C3 technically passed, but the league page became too data-heavy. A mini-league should read like a simple running total, especially when a player belongs to more than one league.

## Corrected product rule

The default league table is:

- rank
- member
- points

This is the FPL-style running total pattern. Breakdown detail belongs in deeper destinations such as member comparison, player insight, match centre and results.

## Delivered

- Removed the rendered race summary strip from the league page.
- Removed Groups / Bracket / Scored / Match points columns from the default league standings table.
- Removed extra row chips and gap labels from the default table.
- Kept a subtle current-user row treatment.
- Shows no rank before scoring has started, avoiding false tied-leader noise.

## Boundaries

- Original Predictor and KO Predictor remain separate.
- No scoring logic changed.
- No RPC write contract changed.
- No database migration was required.
- Active migrations remain 18.
- Migration 019 was not created.

## Audit wording

The default table is rank member points only.

Breakdowns belong in deeper destinations such as member comparison, player insight, match centre and results.
