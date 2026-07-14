# STAGE-CORE-PAGE-ADOPTION-1A-GROUPS

## Status

Implemented as the first slice under `STAGE-CORE-PAGE-ADOPTION-1`.

## Scope

This stage adopts the approved Groups Night Broadcast contract on the live Groups surface as a native React/CSS implementation. It is deliberately limited to the Groups page so the larger `STAGE-CORE-PAGE-ADOPTION-1` row can progress safely in slices.

The slice adds the Night Broadcast identity treatment to the existing Groups top dock, keeps the by-group/by-date switcher, keeps the sticky Tables fast path, and brings the shared predicted-tables and third-place components directly into the by-group surface. The same existing table model continues to feed the slide-up tables sheet and the bracket-shaping third-place ranking.

## Behaviour preserved

- Existing score entry, save, lock, grace and review behaviour is preserved.
- The five group-stage joker cap and per-match joker controls are preserved.
- Lucky Dip remains a local helper and does not touch jokers.
- Original Predictor and KO Predictor remain separate.
- Predicted/live contexts remain separate.
- The Groups view is rebuilt natively in the Euro design system, not by porting prototype HTML.

## Safety

This is a presentation-only React/CSS/docs/audit slice. It makes no scoring, resolver, Supabase write, service-role or migration change. It does not create users, prediction seeds, fake results, league writes or Auth changes.

Active migrations remain 18. No Migration 019 is created.

## Remaining under STAGE-CORE-PAGE-ADOPTION-1

This slice does not close the full `STAGE-CORE-PAGE-ADOPTION-1` row. Original Bracket G and KO Predictor F remain pending slices under the same parent adoption stage.
