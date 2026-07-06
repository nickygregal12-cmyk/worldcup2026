# Unresolved Group Tiebreaker Prompt

## Status

Locked decision for the Euro 2028 Predictor.

## Summary

The app should support an unresolved group tiebreaker prompt for predicted group tables.

When a user completes all score predictions in a group, the app calculates the predicted group table using
all supported score-derived tiebreakers.

If two or more teams remain tied on every tiebreaker the app can calculate from the user's score
predictions, the app should ask the user to choose the intended order of the tied teams.

## Purpose

This prevents the app from silently placing tied teams in an order the user did not intend.

The feature is especially important where the difference between first and second, second and third, or
third and fourth affects:

- predicted group position;
- bracket path;
- qualification;
- Review Picks;
- Bracket Health;
- later comparison against the real tournament.

## User-facing behaviour

When a group is complete and an unresolved tie remains, show a calm prompt.

Example:

> Scotland and Austria are tied in your Group A prediction. Their order cannot be decided from your score
> predictions alone. Choose which team you want to finish higher.

For two teams, use a simple choice:

- Scotland above Austria
- Austria above Scotland

For three or more tied teams, use an ordered selection or drag/reorder control:

```text
Choose your intended order:
1. Scotland
2. Austria
3. Hungary
```

## Scoring rule

This choice does not award extra points.

It only records the user's intended order where the app cannot determine the order from predicted scores
alone.

Unresolved tiebreaker choices affect predicted group ordering only. They do not create additional points.

## Resolver rule

The predicted group resolver should use this order only after all supported calculable tiebreakers have
failed to separate the teams.

It must not override normal calculable tiebreakers.

Supported calculable tiebreakers may include, depending on the final tournament rules:

- points;
- goal difference;
- goals scored;
- head-to-head points;
- head-to-head goal difference;
- head-to-head goals scored.

If the remaining order would depend on non-score-derived criteria such as fair play, disciplinary record,
rankings or drawing of lots, the user's selected intended order should resolve the prediction.

## Review Picks behaviour

Review Picks should flag unresolved group tiebreakers.

Example:

> Group A has one unresolved tie. Choose tied-team order before locking your picks.

A user should not be shown as fully complete if an unresolved tied-team order is still required.

## Lock behaviour

Before lock:

- the user can change tied-team order if the underlying score predictions still create an unresolved tie.

After lock:

- the selected tied-team order becomes read-only along with the rest of the Original Predictor.

If the user changes a score and the tie no longer exists, the manual tied-team order should no longer
apply.

## Important constraints

Do not use this as a shortcut around calculable tiebreaks.

Do not award separate points for the choice.

Do not expose this as a public “fair play prediction”.

Do not require this if the app can determine the order from supported score-based rules.

Do not let this alter real result tables.

This applies to predicted group tables only.

Real official group tables must follow official results/tiebreaker data.

## Stage placement

Record the rule under:

`STAGE-RULES-SCORING-LOCK-1`

Implement the user flow under:

`STAGE-ENTRY-AND-REVIEW-JOURNEY-1`
