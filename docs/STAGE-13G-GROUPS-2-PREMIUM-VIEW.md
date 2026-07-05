# Stage 13G-GROUPS-2 — Groups Premium View Switcher

Date: 5 July 2026  
Scope type: presentation/model/docs/audit-only Groups UI implementation

## Decision restored

The By group / By date toggle is a settled decision from the original Groups reference. It was accidentally dropped from the later premium draft. This slice restores that settled decision rather than creating a new product direction.

## New decision added

By-date mode is useful for matchday flow, but it removes the player's immediate group context. To keep the product frictionless:

- each by-date match ticket carries a visible group tag;
- the group tag opens the relevant predicted table;
- a sticky Tables pill remains available from anywhere in the by-date list;
- the Tables pill opens a slide-up sheet;
- the sheet has an A–F + third-place rail;
- the third-place rail uses the same predicted best-third ranking logic that shapes the bracket.

## Implementation record

- Existing Groups predictor destination only.
- No new route.
- `By group` remains the default view.
- `By date` sorts all 36 group fixtures by scheduled date and match number.
- Group tags are visible in date mode.
- The sticky Tables pill opens the predicted tables sheet.
- Group table rows and third-place rows are calculated from the current local/account draft predictions.
- Provisional tie-break fallback remains the existing resolver model behaviour; this slice does not officialise the final tie-break ladder.

## Guardrail

No scoring, resolver, Supabase write or migration change is included. The implementation consumes existing group table and best-third calculation helpers only. Original Predictor and KO Predictor remain separate. Predicted and live contexts do not blend.

Active migrations remain 18. No Migration 019.
