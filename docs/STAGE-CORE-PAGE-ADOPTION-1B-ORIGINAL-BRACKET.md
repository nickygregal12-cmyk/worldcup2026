# STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET

Accepted as the second live UI slice under `STAGE-CORE-PAGE-ADOPTION-1`.

## Scope

This slice adopts the approved Original Bracket G contract on the live Original Bracket surface. It keeps the existing stacked mobile layout and reinforces the desktop wall chart at 900px and above, with Round of 16 columns on the outside edges, quarter-finals and semi-finals stepping inward, and the final centred.

The live surface remains winner-only. Players choose which team advances from each predicted knockout tie. No score inputs, method controls or joker controls are added to the Original Bracket. The live surface keeps no score inputs, method controls or joker controls. Scores, methods and knockout jokers remain part of the separate KO Predictor only.

## Implementation notes

- Native React/CSS only; no prototype HTML is ported.
- `OriginalBracket` now carries a live `data-contract="original-bracket-g"` marker.
- The wall chart carries native markers for `data-wall-chart="converging"`, outside-edge Round of 16 placement and centred final placement.
- The existing single `OriginalBracketTie` and `OriginalBracketSlot` primitive set still feeds stacked mobile and desktop wall-chart arrangements.
- Ties show plain match detail chips for kick-off and venue state without exposing implementation language.
- Existing re-pick handling remains unchanged for cases where group-table edits make a saved bracket path stale.

## Safety

This is a presentation/docs/audit/test slice only. It introduces no scoring change, resolver change, Supabase write, Auth change, service-role use, fake-result write, league write or migration. Original Predictor and KO Predictor remain separate. Active migrations remain 18 and no Migration 019 is created. No Migration 019 is created for this slice.

## Closure

This does not close the full `STAGE-CORE-PAGE-ADOPTION-1` row because KO Predictor F remains a planned follow-on slice.
