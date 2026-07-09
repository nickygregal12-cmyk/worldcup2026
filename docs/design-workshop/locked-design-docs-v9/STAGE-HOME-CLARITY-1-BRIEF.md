> **PACK SNAPSHOT — do not work from this copy.** Part of the locked v9 install pack, frozen at its 2026-07-06 state. If a canonical version exists it lives outside the pack (docs/ or docs/archive/); a filename search that lands here should follow the canonical copy.

# Stage brief — STAGE-HOME-CLARITY-1

## Goal

Home should answer:

> What should I do now?

Home should guide the user based on account state, prediction completion, lock state, matchday state and tournament phase.

## Scope

Home implementation only. No Supabase schema, migration, scoring, resolver or Auth changes.

## Required behaviours

### One countdown

Before the tournament starts, Home should show one main countdown:

Original Predictor locks when the first match kicks off.

Do not show separate Prediction lock and Tournament starts blocks if they are the same moment.

### No KO Predictor before readiness

Before KO Predictor readiness, Home should show zero KO Predictor presence.

Do not show a KO card, KO countdown, KO prompt, KO teaser, KO placeholder, lifecycle strip, or not-open-yet card.

KO discovery before readiness belongs in How to Play or More, not Home.

### Primary CTA

Home primary action should follow Original Predictor progress:

| State | Primary action |
|---|---|
| No picks started | Start Groups |
| Groups incomplete | Continue Groups |
| Groups complete, bracket incomplete | Continue to Bracket |
| Groups complete, bracket complete, Review incomplete | Review Picks |
| Review complete before lock | You’re ready / View leagues / Join league |
| Original Predictor locked | View your picks / View leagues |
| Tournament live | View today’s matches / View points / View leagues |

### Original Predictor completion summary

Supported fields should be shown without faking unsupported data:

- Groups complete count.
- Joker use.
- Original Bracket completion.
- Champion picked/missing.
- Top scorer picked/missing, once supported.
- Group goals auto-calculated/edited/missing, if used.
- Review complete/needs review.
- Lock open/locked.

### Matchday states

Home should support:

- signed out / first visit;
- guest with draft;
- signed in pre-tournament;
- Original complete before lock;
- Original locked before tournament starts;
- group-stage matchday before first match;
- group-stage live;
- between group matches;
- after today’s group matches are complete;
- rest day / no matches today;
- group stage complete before KO readiness;
- KO fixtures ready;
- knockout matchday;
- after knockout day complete;
- tournament complete.

### Matchday ordering

Rows should be ordered:

1. live;
2. upcoming;
3. finished.

Rows should link to Match Centre.

### Between matches

When no match is live but more matches are coming today, Home should show:

- points/rank strip where available;
- Next up today;
- earlier finished matches;
- later upcoming matches;
- link to Results or Match Centre.

### End of day

When all matches are finished, Home should show a calm recap:

- Today complete;
- points earned today where available;
- finished match rows;
- next match/tomorrow first match;
- link to Results.

### Rest day

If there are no matches today, Home should not fake urgency. It should show the next match and useful actions.

### Knockout stage

Home remains structurally consistent. Original Predictor remains priority. KO Predictor reminders appear only where action is needed and only after readiness.

## Result correction rule

Matches should not normally need corrected.

Result correction should not be treated as a planned everyday Home feature.

Correction handling may still exist as an admin/internal safety fallback, but Home should not promote “result corrected” as normal content.

Only if an exceptional correction has genuinely happened and affected visible points should the app calmly explain it in the most relevant place, such as Results, Match Centre or Points Breakdown.

Home does not need a standing result-correction card.

## No wrong-state flicker

Home must not flash:

- wrong CTA;
- signed-out state for signed-in users;
- guest warnings after guest transfer completes;
- unlocked copy after lock;
- KO Predictor state before readiness;
- wrong matchday order.

Use neutral loading/skeleton where canonical state is not known.

## Acceptance

Home stage is complete only if:

- Home uses one Original Predictor countdown;
- Home shows no KO Predictor presence before readiness;
- Home primary CTA matches actual user progress;
- Home does not flash wrong CTAs or states;
- matchday rows are ordered live → upcoming → finished;
- between-match, end-of-day and rest-day states are handled;
- Original and KO points remain separate;
- Original Predictor always keeps priority;
- existing gates pass.


## Correctness queue dependency note

Home Clarity may be implemented before the open 13G-C correctness rows because its scope is the Home journey/state model and it does not depend on predicted group standings or third-place table implementation. This must be recorded as an explicit sequencing decision, not an implied override of the correctness queue.

## Superseded note — group goals editability

Earlier drafts may have described group goals as editable on Review.

The v9 edge-case addendum supersedes that.

Group goals are auto-calculated only from the 36 group match predictions. Review should display the
calculated total or an incomplete state, not a manual edit control.
