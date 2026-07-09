> **PACK SNAPSHOT — do not work from this copy.** Part of the locked v9 install pack, frozen at its 2026-07-06 state. If a canonical version exists it lives outside the pack (docs/ or docs/archive/); a filename search that lands here should follow the canonical copy.

# v8 additions — Unresolved predicted group tiebreaker prompt

This v8 pack keeps the v9 locked visual-contract, safety and streamlined batch records intact, and adds
the unresolved predicted group tiebreaker decision.

## Decision

When a user completes all score predictions in a group, the app calculates the predicted group table using
all supported score-derived tiebreakers.

If two or more teams remain tied on every tiebreaker the app can calculate from the user's score
predictions, the app must ask the user to choose the intended order of the tied teams.

## Why this exists

This prevents the app from silently placing tied teams in an order the user did not intend.

It matters because predicted group order can affect:

- predicted group position;
- bracket path;
- qualification;
- Review Picks completion;
- Bracket Health;
- later comparison against the real tournament.

## Stage placement

Record the resolver/rules decision under:

`STAGE-RULES-SCORING-LOCK-1`

Implement the user prompt and completion behaviour under:

`STAGE-ENTRY-AND-REVIEW-JOURNEY-1`

This belongs across both stages because it affects the group-table resolver and the Groups/Review
completion journey.

## Hard constraints

- Applies to predicted group tables only.
- Does not award extra points.
- Does not create a public “fair play prediction”.
- Does not override calculable tiebreakers.
- Does not apply where the app can determine the order from supported score-based rules.
- Does not alter real result tables.
- Real official group tables must follow official result/tiebreaker data.

## Lock behaviour

Before lock, the user can change tied-team order if the underlying score predictions still create an
unresolved tie.

After lock, the selected tied-team order becomes read-only with the rest of the Original Predictor.

If the user changes a score and the tie no longer exists, the manual tied-team order no longer applies.
