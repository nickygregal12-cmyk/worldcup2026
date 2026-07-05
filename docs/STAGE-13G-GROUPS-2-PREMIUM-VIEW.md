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

## Stage 13G-GROUPS-2B — Groups Chrome Repair

Post-deploy eye test found three presentation regressions:

- the Groups page still exposed the old internal Groups / Bracket / Review section switcher, which duplicated the main navigation;
- the old device-draft import strip still appeared on the prediction surface;
- the top of the Groups page carried too much explanatory chrome before the actual match cards.

Repair decision:

- Groups and Bracket are route-owned Groups and Bracket destinations. The internal section switcher is hidden on those surfaces so the main navigation owns movement between Groups and Bracket.
- The old device-draft import strip is retired from the prediction surface. Device transfer remains handled by the signed-in account transfer flow, not by a large in-page banner.
- Prediction status, lock, bracket and competition-boundary copy move into a compact disclosure.
- Lucky Dip moves behind a slim disclosure so it remains available without dominating the page.
- The group jump rail is restyled as compact premium chips rather than large block buttons.

This is a presentation/chrome repair only. It does not change scoring, resolver logic, saved prediction contracts, Supabase writes, service-role usage, routes or migrations.
