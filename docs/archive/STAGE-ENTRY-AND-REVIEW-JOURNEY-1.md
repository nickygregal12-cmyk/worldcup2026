# STAGE-ENTRY-AND-REVIEW-JOURNEY-1 — Entry and Review journey contract

## Status

Recorded as the next streamlined entry/completion journey stage after `STAGE-RULES-SCORING-LOCK-1`.

This stage locks the product journey contract for Home, Review Picks, Welcome and Invite/Join before implementation work changes active routes or prediction UI. It is a docs/audit recording stage only. It does not change runtime UI, source routes, scoring, resolver behaviour, Supabase, Auth, RLS, result entry or migrations.

## Starting checkpoint

- Previous commit: `77eb9d3 Record rules and scoring lock`.
- Branch: `euro28-development`.
- Active migrations remain 18.
- Migration 019 is not created.
- WC26 production remains blocked.

## Hard boundaries

This stage does not include:

- source UI implementation;
- source route changes;
- Supabase schema changes;
- migrations;
- Auth changes;
- RLS changes;
- service-role tooling;
- official result-entry changes;
- fake-result writes;
- result/scoring engine rewrites;
- resolver behaviour changes;
- Original/KO points combining.

Any later implementation patch must keep Original Predictor and KO Predictor separate and must prove that no new Migration 019 is required unless a real schema/read-contract gap is identified and explicitly approved.

## Journey principle

The entry journey must always answer one user question:

```text
What should I do now?
```

Home, Welcome, Review Picks and Invite/Join are one linked journey, not four isolated surfaces. The product should guide users from first arrival, through Groups and Original Bracket, into Review, and then into leagues without wrong-state flicker or contradictory calls to action.

## Home clarity contract

Home must show one primary Original Predictor action at a time.

The progress-aware CTA ladder is locked as:

| State | Primary CTA |
|---|---|
| No picks started | Start Groups |
| Groups incomplete | Continue Groups |
| Groups complete, bracket incomplete | Continue to Bracket |
| Groups complete, bracket complete, Review incomplete | Review Picks |
| Review complete before lock | You're ready / View leagues / Join league |
| Original locked | View your picks / View leagues |
| Tournament live | View today's matches / View points / View leagues |

Home must not show KO Predictor as a primary pre-tournament action before KO readiness. KO Predictor remains a separate competition and should not crowd the Original Predictor entry journey.

## No wrong-state flicker contract

Dynamic state must fail quiet while loading.

Required behaviour:

- use a skeleton or neutral loading state while prediction, session, league or lifecycle data is unknown;
- never flash "Start Groups" if saved progress is still loading;
- never flash signed-out invite copy if session state is unknown;
- never briefly show KO Predictor readiness before the real readiness signal is known;
- never claim Review is complete until unresolved tie prompts and required review checks are satisfied.

## Review Picks contract

Review Picks is the completion gate for the Original Predictor.

Preferred route:

```text
#/review
```

The implementation may initially route through the existing Original journey shell, but the destination must be treated as a real Review Picks destination in product copy and state models.

Review must include:

- 36 group score rows or grouped summaries;
- five group-stage joker allowance status;
- Original winner-only bracket summary;
- auto-calculated group-goals display;
- unresolved in-group tiebreaker prompts;
- best-third resolver prompts where needed;
- stale bracket warning after group-score edits;
- locked prediction snapshot display after lock;
- clear incomplete blockers before lock.

## Review completion blockers

Review is not complete while any required blocker remains.

Blockers:

- fewer than 36 group scores;
- incomplete Original bracket picks once the bracket is available;
- unresolved in-group tiebreaker prompt not answered;
- unresolved best-third prompt not answered;
- stale bracket section after group-score edits;
- joker attached to an incomplete score;
- saved local draft not successfully imported or saved for a signed-in user where required.

Review completion must be an explicit state and should not rely on row counts alone.

## Auto-calculated group-goals display

Group goals are auto-calculated only.

Review must show:

```text
Predicted group-stage goals: 84
Calculated from your 36 group match predictions.
```

When incomplete, Review must show:

```text
Complete all group scores to calculate your group-stage goals total.
```

Review must not include a manual group-goals input.

## Unresolved in-group tiebreaker prompt

If predicted group scores leave teams tied after all supported calculable score-derived tiebreakers, the app must prompt the user.

The prompt must offer:

- Change scores;
- Pick positions.

The chosen order:

- applies only to the user's predicted group table;
- does not award extra points;
- does not override calculable tiebreakers;
- does not affect official real tournament tables;
- becomes read-only after lock.

## Best-third prompt

If predicted third-place teams are still tied after supported calculable ranking rules and the tie affects qualification or bracket placement, the app must prompt the user.

The prompt must offer:

- Change scores;
- Pick positions.

The selected order resolves the user's intended bracket only when score-derived ranking cannot separate the teams. It must be included in the locked prediction snapshot if manually resolved.

## Bracket invalidation after group-score edits

If a user changes group scores after building the Original Bracket, the app must check whether predicted qualifiers or bracket paths changed.

Required warning:

```text
Your group changes affected your bracket.
Some knockout picks need reviewed before lock.
```

Affected Original Bracket sections should be marked for review. The app must not silently keep impossible or stale bracket picks.

## Joker confirmation modal

Applying a group-stage joker or KO Predictor joker must show a confirmation modal.

Example:

```text
Add joker?

This joker will double the points you earn from this match.
You will have 4 group-stage jokers left after this.

Add joker
Cancel
```

Rules:

- Group-stage jokers and KO Predictor jokers remain separate;
- Original bracket picks do not use jokers;
- the modal must use the correct competition-specific allowance;
- if no jokers remain, show a clear unavailable state;
- if a joker is attached to an incomplete score, Review must flag it.

## Locked prediction snapshot display

After the Original Predictor lock, the user must be able to view a clear locked prediction snapshot.

Snapshot display should include:

- group scores;
- group jokers;
- auto-calculated group-goals total;
- manual unresolved tie choices where used;
- Original bracket picks;
- saved/locked timestamp where available;
- account/device wording that does not overpromise server persistence for guest-only state.

The snapshot is read-only after lock.

## Welcome route contract

Preferred route:

```text
#/welcome
```

Welcome should be a lightweight first-run explainer, not a separate app mode.

It should explain:

- predict group scores;
- build the Original Bracket;
- review before lock;
- join or create a league;
- sign in to save and score;
- KO Predictor is separate and arrives when real knockout fixtures are ready.

Welcome must not block returning users with saved progress.

## Invite/Join contract

Invite and join states belong with the entry journey because league entry often happens before completion.

Required states:

- valid invite;
- invalid invite;
- expired invite;
- already joined;
- league full;
- signed-out user;
- guest user with local predictions;
- account required;
- successful join;
- return to Leagues.

Joining a league after lock follows the locked rules/scoring contract: valid pre-deadline predictions can count, subject to league rules, but the join action must not reopen or alter locked predictions.

## Acceptance for later implementation

The later implementation stage can close only when:

- Home uses the progress-aware CTA ladder;
- Review has a dedicated destination or route-equivalent entry;
- Review completion includes unresolved tie and stale bracket blockers;
- group goals are displayed as calculated-only;
- joker confirmation exists for group and KO contexts;
- locked snapshot is visible after lock;
- Welcome and Invite/Join states are modelled;
- no wrong-state flicker is introduced;
- `npm run check` passes;
- deployed verification passes.
