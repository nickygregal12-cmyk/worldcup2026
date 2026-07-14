> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET

Accepted as the second live UI slice under `STAGE-CORE-PAGE-ADOPTION-1`.

## Scope

This slice adopts the approved Original Bracket G contract on the live Original Bracket surface. It keeps the existing stacked mobile layout and uses a deterministic seven-lane bracket at 900px and above: left R16, left QF, left SF, final, right SF, right QF and right R16. The final remains centred in the middle lane.

The live surface remains winner-only. Players choose which team advances from each predicted knockout tie. No score inputs, method controls or joker controls are added to the Original Bracket. The live surface keeps no score inputs, method controls or joker controls. Scores, methods and knockout jokers remain part of the separate KO Predictor only.

## Implementation notes

- Native React/CSS only; no prototype HTML is ported.
- `OriginalBracket` now carries a live `data-contract="original-bracket-g"` marker.
- The bracket carries native markers for `data-wall-chart="seven-lanes"`, `data-wall-lanes="7"` and centred final placement.
- The final centred lane contains Match 51 with the champion reveal directly below it.
- The existing single `OriginalBracketTie` and `OriginalBracketSlot` primitive set still feeds stacked mobile and desktop wall-chart arrangements.
- Ties show plain match detail chips for kick-off and venue state on the stacked mobile view. The desktop wall-chart card is deliberately denser: a single muted date/venue summary line, the two teams with a `vs` divider, and the prediction state collapsed to an icon-only corner marker (its label stays screen-reader accessible) — match number, the kick-off/venue chips, the re-pick explainer and the "winner progresses" line are mobile-only.
- Desktop wall-chart team rows are the sole pick target (clicking anywhere on the row selects that team); the shared team-profile trigger is disabled in this context so it cannot be triggered by mistake while picking.
- Existing re-pick handling remains unchanged for cases where group-table edits make a saved bracket path stale.
- Unknown wall placements now fail loudly with the unknown match number instead of silently falling back to the centred final placement.
- The stage audit rejects `WallConnectors` and hardcoded SVG connector paths. Connector lines between rounds are implemented as CSS pseudo-elements anchored to each card's own box via `data-wall-side` (derived from the real column key), so they track actual card position rather than fixed coordinates.
- Original Bracket's CSS is split across three co-located scoped modules (`OriginalBracket.module.css` for the page shell, `OriginalBracketRounds.module.css` for the grid/lane structure, `OriginalBracketTie.module.css` for the match-card family and connectors), each independently under the 400-line scoped-stylesheet cap.

## Safety

This is a presentation/docs/audit/test slice only. It introduces no scoring change, resolver change, Supabase write, Auth change, service-role use, fake-result write, league write or migration. Original Predictor and KO Predictor remain separate. Active migrations remain 18 and no Migration 019 is created. No Migration 019 is created for this slice.

## Closure

This does not close the full `STAGE-CORE-PAGE-ADOPTION-1` row because KO Predictor F remains a planned follow-on slice.
