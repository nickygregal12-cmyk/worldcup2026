# Stage 13G-BRACKET-1 — Original Bracket Responsive Wall-Chart Rebuild

Status: implementation package ready for local acceptance.  
Preceded by: `13G-BRACKET-REF` at commit `b7a8956 Record Stage 13G Bracket reference`.  
Scope: Original Bracket presentation and winner-pick state handling only.

## Implemented scope

This batch implements the signed-off Original Bracket destination rebuild from the adopted reference.

- Phones and narrow screens use the stacked vertical layout below 900px.
- Desktop and wide screens use the converging wall chart at 900px and above.
- Both arrangements use the same `OriginalBracketTie` and `OriginalBracketSlot` primitives.
- There is one rendered bracket surface; CSS controls the arrangement at the single 900px breakpoint.
- Slots show source references such as `1A`, `2B`, `3ABCD` and `W39`.
- Resolved slots retain the shared `TeamLabel` identity trigger and a separate progression action.
- Picked slots receive success treatment and a tick on the action.
- Unresolved slots are dashed placeholder chips and cannot be advanced.
- The champion strip remains above the bracket and the wall-chart champion box appears centred at wide sizes.

## Locked copy carried into implementation

Predicted-context banner:

`Your predicted bracket — built from your predicted tables, never blended with live results`

Champion strip sub-line and only KO Predictor mention inside the Original Bracket component:

`Winner picks only — scores and jokers live in the KO Predictor`

Re-pick flag:

`Re-pick — your tables changed this tie`

## Re-pick and downstream persistence behaviour

A stale stored pick is not silently kept and not silently dropped. If a stored pick no longer matches either feeding slot after predicted tables change, the affected tie renders amber treatment with the exact re-pick flag.

When a user changes an upstream bracket pick, disconnected downstream picks are pruned only where the stored winner is no longer fed by the updated path. Surviving downstream picks persist.

## Compliance by absence

Original Bracket remains winner-only. It includes no score inputs, method controls or joker controls.

The batch does not add connector lines. Share-card image rendering remains a follow-on batch.

## Files changed

- `src/journey/OriginalBracket.jsx`
- `src/journey/OriginalBracket.module.css`
- `src/journey/originalBracketPresentationModel.js`
- `src/journey/predictionJourneyModel.js`
- `src/journey/PredictionJourney.jsx`
- `src/journey/__tests__/OriginalBracket.test.jsx`
- `src/journey/__tests__/originalBracketPresentationModel.test.js`
- `src/journey/__tests__/predictionJourneyModel.test.js`
- `scripts/check-stage13g-bracket-responsive-wallchart.mjs`
- `docs/STAGE-13G-BRACKET-1-ORIGINAL-BRACKET-RESPONSIVE-WALLCHART.md`
- `package.json`

## Database and deployment constraints

No Supabase schema change is introduced. Active migrations remain 18. No Migration 019 is created. No secrets or service-role credentials are used or committed. WC26 production remains untouched.

## Acceptance commands

```bash
npm run audit:stage13g-bracket-responsive-wallchart
npm run audit:stage13g-bracket-reference-adoption
npm run audit:stage13g-groups-joker-control
npm run audit:h1-bypass-governance
node scripts/check-frontend-architecture.mjs
npm run check
npm run build
npm run verify:foundation-page
```
