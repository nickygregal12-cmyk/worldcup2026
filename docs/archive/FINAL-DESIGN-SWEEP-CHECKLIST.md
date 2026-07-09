> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Final design/content sweep checklist — before implementation and seeded testing

Run this before product implementation and before seeded-team/persona testing.

## Global visual consistency

- Every page still looks like the same app.
- Groups and Leagues remain the visual anchors.
- Bracket G and KO Predictor F remain major references.
- No page has drifted into a different visual identity.
- Mobile-first layout is strong before desktop polish.

## Remove non-user-facing content

Remove from public/user-facing surfaces:

- audit wording;
- spec wording;
- internal notes;
- prototype labels;
- implementation caveats;
- unnecessary provisional marks;
- fake debug text;
- admin-only explanations outside admin areas.

Unresolved details should live in docs/admin/internal places, not public UI.

## Dynamic-state smoothness

Check that dynamic pages do not flash:

- wrong CTA;
- wrong lock state;
- wrong account state;
- signed-out state for signed-in users;
- guest warnings after guest transfer is complete;
- KO Predictor state before readiness;
- unlocked copy after lock;
- wrong matchday ordering;
- wrong route/nav action.

Use shimmer/skeleton/settling states where canonical state is not known.

## Home-specific sweep

- One countdown before tournament: Original Predictor locks when first match kicks off.
- No KO Predictor presence before KO readiness.
- Primary CTA follows Original Predictor progress.
- Matchday rows ordered live → upcoming → finished.
- Next/current match obvious.
- Rows link to Match Centre.
- Between-match state present.
- End-of-day recap present.
- Rest-day state calm and useful.
- No standing result-correction card.

## Content notes carried forward

- Tournament Overview needs better final content later.
- Account must have no retired Account-page guest-import buttons.
- Home pre-tournament must not tease or explain KO Predictor; KO discovery belongs in How to Play or More until readiness.
- Support and Privacy must be clear before public signup opens.

## Contextual return

Every click-through detail must have return context:

- Home → Match Centre → Back to Home.
- Leagues → Match Centre → Back to Leagues.
- League row → Player View → Back to league.
- Leaderboards row → Player View → Back to Leaderboards.
- Player View → Points Breakdown → Back to Player View.
- Team Profile opened from Match Centre → return to Match Centre.
- Invite/join flow → return to Leagues after safe resolution.

## Competition boundaries

- Original Predictor stays first in hierarchy.
- KO Predictor is secondary and separate.
- Original and KO points are never combined.
- Original Bracket has no scores, methods or jokers.
- KO Predictor has real knockout fixtures, scores, advancing team, method, KO jokers and separate standings.
- Predicted bracket and live bracket never blend.

## Seeded-team testing readiness

Before seeded-team/persona testing, the UI should feel polished and real:

- no visible prototype wording;
- no placeholder caveats;
- no internal records shown to users;
- no fake provisional warnings where the seeded data is meant to simulate real tournament data;
- no dead chevrons or fake links;
- no click-through surface without a return path.


## Result corrections

- The corrected-result card in the Results contract is the drawing of the exceptional corrected-result state, not normal daily Home content. Do not remove it in any sweep.
- Remove any standing Home result-correction card.
- Keep correction wording out of normal daily Home content.
- Only show correction explanations when an exceptional correction has actually affected visible points, and place that explanation in Results, Match Centre or Points Breakdown.

## Prediction Trends detail

- Ensure post-lock, group-stage, knockout-stage and completed-tournament examples are rich enough to feel like a live tournament story.
- Keep Original Predictor trends primary.
- Keep KO Predictor trends clearly secondary and separately labelled.

## Simulation-state sweep guard

If Admin Scenario Runner is later implemented, final sweep must confirm:

- simulation labels are admin/staging/test-only;
- no simulated result appears as official on public/user-facing surfaces in normal mode;
- any staging-facing simulation mode indicator is obvious enough for testing;
- normal user pages do not inherit admin/test copy;
- reset/reapply controls are not presented as normal result-correction features.
