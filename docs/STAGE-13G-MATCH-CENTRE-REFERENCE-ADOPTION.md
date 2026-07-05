# Stage 13G-MATCH-CENTRE-REF — Match Centre group-match reference adoption

Status: reference recorded / implementation scheduled.

## Source references

- Existing live doc: `docs/STAGE-13F-C-EURO-MATCH-CENTRE.md`.
- Existing live implementation: `src/matchCentre/MatchCentre.jsx`, `src/matchCentre/matchCentreModel.js`, `src/matchCentre/matchCentreService.js`.
- Approved prototype: `docs/reference-prototypes/euro28-match-centre-page-prototype.html`.
- Expanded brief: `docs/reference-prototypes/euro28-stage13g-expanded-agent-prompt.md`.

## Signed-off decisions for the implementation stage

1. **Conditional competition tabs.** Group-stage fixtures (`matchNumber <= 36`) render Original Predictor only. Knockout fixtures retain Original/KO Predictor tabs.
2. **Group impact panel live/final state.** Group standings show `Live projection` while any match in that group is live and `Final` once the group is confirmed.
3. **Reuse the real resolver.** Live projection must use `resolveGroupTable` with live/confirmed inputs. No second table calculator.
4. **Read-only bracket-point preview.** Use the canonical resolver chain to show what the signed-in player’s predicted qualifiers/bracket picks would be worth if the projection held. It must never write to `bracket_predictions` or alter the Original Bracket page.
5. **No matchday hardcode.** Activate from real group live status, not a matchday number.
6. **Knockout panel unchanged.** Existing knockout “Points on the line” content remains as-is for `matchNumber > 36`.
7. **Group panel becomes “This match’s predictions”.** Rows compare real predictions for this fixture against the live/current/final score.
8. **No group maximum-available framing.** Group fixtures should not use the knockout-style “up to N points” headline.

## Boundaries

- No fixture nav, hero, status bar or viewing-scope selector rewrite.
- No scoring/resolver contract change.
- No Supabase write.
- No database migration expected.
- Original Predictor and KO Predictor stay separate.
- Predicted and live brackets never blend; the Match Centre preview is read-only display evidence only.

## Next implementation stage

Use `13G-MATCH-CENTRE-1` for the code build. Add a focused audit asserting the decisions above and wire it into `npm run check`.
