# Euro 2028 Predictor — Edge-Case Rules Addendum

## Status

Locked rules/planning addendum for future implementation stages.

These are small but important trust and usability protections. They should not become separate isolated
jobs. Fold them into the existing streamlined batches.

## 1. Unresolved in-group tiebreaker prompt

If a predicted group table has two or more teams tied after all supported score-derived tiebreakers have
been applied, the app should not silently choose the order.

The user should be prompted with two clear options:

- Change scores.
- Pick positions.

### Change scores

Returns the user to the relevant group matches so they can alter one or more predicted scores and resolve
the tie naturally.

### Pick positions

Lets the user choose the intended order of the tied teams.

For two tied teams:

- Scotland above Austria.
- Austria above Scotland.

For three or more tied teams:

```text
Drag or select the intended order:
1. Scotland
2. Austria
3. Hungary
```

### Scoring rule

This does not award extra points.

It only records the user's intended predicted order where score-derived tiebreakers cannot separate the
teams.

It must not override calculable tiebreakers.

It applies to predicted group tables only.

## 2. Best third-place resolver prompt

If two or more third-place teams are tied across groups after all supported calculable ranking rules, and the
tie affects qualification or bracket placement, the app should prompt the user.

This is separate from an in-group tie.

The prompt should offer:

- Change scores.
- Pick positions.

### Change scores

Returns the user to the relevant group scores that created the unresolved third-place tie.

### Pick positions

Lets the user choose the intended third-place ranking order.

Example:

```text
These third-place teams are tied in your prediction.
Choose the order you want to use for your predicted knockout bracket:

1. Group B third-place team
2. Group E third-place team
3. Group F third-place team
```

### Scoring rule

This does not award extra points.

It only resolves the user's intended qualification/bracket order where the app cannot separate the teams
using supported score-derived rules.

It must not affect official real tournament tables.

## 3. Bracket invalidation after group-score edits

If the user edits group scores after building the Original Bracket, the app must check whether the predicted
qualifiers or bracket paths have changed.

If they have changed, the app should not silently keep an impossible or stale bracket.

Required warning:

> Your group changes affected your bracket. Some knockout picks need reviewed before lock.

Affected bracket sections should be marked as needing review or confirmation.

This may already be partly implemented, but it should be explicitly checked during the next implementation
pass.

## 4. Joker confirmation modal

When a user applies a joker to a group-stage or KO Predictor match, the app should show a confirmation
modal.

Example copy:

```text
Add joker?

This joker will double the points you earn from this match.
You will have 4 group-stage jokers left after this.

Add joker
Cancel
```

Rules:

- Group-stage jokers and KO Predictor jokers remain separate.
- Original pre-tournament bracket picks do not use jokers.
- The modal should use the correct competition-specific allowance.
- If the user has no jokers left, the app should show a clear unavailable state.
- If a joker is attached to an incomplete score, Review should flag it.

## 5. Group goals total is auto-calculated only

Group goals should use Option A.

The group-goals total should always be auto-calculated from the user's predicted group-stage scores.

It should not be manually editable.

Reason:

If the user predicts every group score, the group-stage goals total is already known. Allowing a manual
override would create unnecessary confusion and possible disputes.

Review Picks should show:

```text
Predicted group-stage goals: 84
Calculated from your 36 group match predictions.
```

If one or more group matches are incomplete, Review should show:

```text
Complete all group scores to calculate your group-stage goals total.
```

## 6. Locked prediction snapshot

At the Original Predictor deadline, the app should preserve a clear locked snapshot of the user's submitted
predictions.

Snapshot should show:

- lock timestamp;
- Groups completion;
- group match predictions;
- jokers;
- group table order, including any manual unresolved-tiebreak choices;
- best third-place order if manually resolved;
- Original Bracket picks;
- champion;
- top scorer;
- calculated group-goals total;
- league entries/snapshot context where relevant.

Example:

```text
Locked at: 10 June 2028, 19:45
Groups: Complete
Jokers: 5/5 used
Bracket: Complete
Champion: Scotland
Top scorer: Kylian Mbappé
Predicted group-stage goals: 84
```

## 7. Joining a league after lock

Joining a league after the Original Predictor lock should not remove or reduce a user's points, as long as
the user submitted their predictions before the deadline.

The important factor is whether the predictions were locked before the deadline, not whether the user
joined a league before the deadline.

Rule:

> If a user completed and locked valid predictions before the deadline, those predictions can count after
> joining a league later, subject to normal league visibility/membership rules.

User-facing copy:

```text
You joined this league after the prediction deadline.
Your locked predictions still count because they were submitted before the deadline.
```

If a league has its own special entry rules in future, those should be shown clearly.

## 8. KO Predictor edge-case scoring examples

KO Predictor scoring needs explicit examples before implementation.

The app should define how points are awarded for:

- correct 90-minute score;
- correct 90-minute draw;
- correct advancing team;
- correct method of advancement;
- extra time;
- penalties;
- wrong advancing team;
- exact 90-minute score but wrong penalty winner;
- correct advancing team but wrong method.

Important existing rules:

- Correct score and correct result are not cumulative.
- KO method bonus requires the correct advancing team.

The scoring lock stage should include example rows showing prediction, actual result and points awarded.

## 9. Postponed, delayed, suspended or abandoned match state

The app should support non-standard match states.

Required states may include:

- delayed;
- postponed;
- suspended;
- abandoned;
- replay required;
- result pending.

User-facing example:

```text
This match has been delayed.
Predictions remain locked, but points will update after the official result is confirmed.
```

Rules:

- Do not score a match until the official result state is valid.
- Do not unlock predictions just because the match is delayed unless a separate rule is approved.
- Match Centre, Results, Home and scoring should handle these states calmly.
- Admin should be able to see why a match has not scored yet.

## Placement in streamlined plan

| Addition | Batch |
|---|---|
| In-group unresolved tiebreaker prompt | Batch 1 rules + Batch 2 implementation |
| Best third-place resolver prompt | Batch 1 rules + Batch 2 implementation |
| Bracket invalidation after score edits | Batch 2 |
| Joker confirmation modal | Batch 2 |
| Group goals auto-calculated only | Batch 1 + Batch 2 Review |
| Locked prediction snapshot | Batch 2 |
| Joining league after lock rule | Batch 2 / Batch 5 |
| KO scoring examples | Batch 1 |
| Postponed/delayed/abandoned match states | Batch 1 rules + Batch 10 acceptance |
