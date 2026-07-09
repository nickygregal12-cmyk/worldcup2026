> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# STAGE-RULES-SCORING-LOCK-1 — Rules, scoring and tournament truth lock

## Status

Recorded as the next streamlined rules/scoring lock stage after `CONTRACTS-REF-LOCKED-SURFACES-3`.

This stage locks the product rules, edge-case decisions and public rules wording target before the next user-journey build. It is a docs/audit recording stage only. It does not change active runtime scoring, result-entry, resolver or database behaviour.

## Starting checkpoint

- Previous commit: `163c47a Record locked surfaces and planning docs`.
- Branch: `euro28-development`.
- Active migrations remain 18.
- Migration 019 is not created.
- WC26 production remains blocked.

## Hard boundaries

This stage does not include:

- product UI implementation;
- source route changes;
- Supabase schema changes;
- migrations;
- Auth changes;
- RLS changes;
- service-role tooling;
- official result-entry changes;
- fake-result writes;
- result/scoring engine rewrites;
- resolver behaviour changes.

The active runtime scoring ruleset remains the existing provisional implementation until a later explicitly scoped runtime-alignment stage updates the central app config and staging ruleset safely. This stage records the locked product contract that later work must implement.

## Locked Original Predictor scoring

Original Predictor points are locked as follows:

| Item | Points |
|---|---:|
| Correct group match result | 3 |
| Correct group match score | 5 total, not cumulative |
| Correct exact group position | 2 per team |
| All 4 group positions correct in one group | +5 bonus |
| Correct team in Round of 16 | 8 per team |
| Correct team in Quarter-final | 12 per team |
| Correct team in Semi-final | 15 per team |
| Correct team in Final | 20 per team |
| Correct Champion | +25 bonus |
| Exact group-goals total | 25 |
| Group-goals total within 5 | 15 |
| Group-goals total within 10 | 5 |
| Correct top scorer | 30 |

### Original Predictor scoring interpretations

- Correct group match score and correct group match result are not cumulative.
- Exact group score earns the higher exact-score award only.
- Champion scoring stacks with Final round-reached scoring.
- A correct champion team therefore earns Final points plus Champion bonus.
- Original Predictor and KO Predictor points must never combine.
- Original pre-tournament bracket picks do not use jokers.

## Locked KO Predictor scoring

KO Predictor points are locked as follows:

| Item | Points |
|---|---:|
| Correct 90-minute score | 10 total, not cumulative |
| Correct advancing team, without exact score | 5 |
| Correct 90-minute result | 5 for draw/advancement edge cases |
| Correct method of advancement | +3, requires correct advancing team |
| Correct first-goal time bracket | +3 provisional/API-dependent |

### KO Predictor scoring interpretations

- Correct 90-minute score and correct 90-minute result are not cumulative.
- KO method bonus requires the correct advancing team.
- KO Predictor has its own five jokers.
- KO Predictor points remain separate from the Original Predictor.
- The KO first-goal time bracket remains provisional and must only be included if reliable official/API data can confirm it automatically.

## Provisional / API-dependent items

The following items remain provisional/API-dependent and must not create manual admin burden:

- 5 points per goal by selected top scorer;
- KO first-goal time bracket +3.

If reliable official/API data cannot support them automatically, they must be deferred or removed before live scoring.

## Group goals rule

Group goals are auto-calculated only.

The group-goals total must always be calculated from the user's 36 predicted group-stage scores. It is not manually editable in Review.

Review should display either:

```text
Predicted group-stage goals: 84
Calculated from your 36 group match predictions.
```

or, while incomplete:

```text
Complete all group scores to calculate your group-stage goals total.
```

This supersedes earlier drafts that suggested manual group-goals editing.

## Predicted group-table tiebreakers

For predicted group tables, the app should apply supported score-derived tiebreakers before asking the user for help.

Supported calculable tiebreakers may include, depending on the final tournament rules:

1. points;
2. goal difference;
3. goals scored;
4. head-to-head points;
5. head-to-head goal difference;
6. head-to-head goals scored.

If two or more teams remain tied after all supported score-derived tiebreakers, the app must not silently choose the order.

The user must be offered:

- Change scores;
- Pick positions.

The selected tied-team order:

- applies only to predicted group tables;
- is used only after calculable score-derived rules fail;
- does not award extra points;
- must not override calculable tiebreakers;
- must not alter real official result tables;
- becomes read-only after lock.

## Best third-place resolver rule

If two or more third-place teams are tied across groups after all supported calculable ranking rules, and the tie affects qualification or bracket placement, the app must prompt the user.

The user must be offered:

- Change scores;
- Pick positions.

The selected third-place order:

- resolves the user's intended qualification/bracket order only when score-derived ranking rules cannot separate the teams;
- does not award extra points;
- does not affect official real tournament tables;
- must be included in the locked prediction snapshot if manually resolved.

## Bracket invalidation rule

If the user edits group scores after building the Original Bracket, the app must check whether predicted qualifiers or bracket paths have changed.

If they have changed, the app must not silently keep an impossible or stale bracket.

Required warning:

```text
Your group changes affected your bracket.
Some knockout picks need reviewed before lock.
```

Affected bracket sections should be marked as needing review or confirmation.

## Joker confirmation rule

When a user applies a joker to a group-stage or KO Predictor match, the app should show a confirmation modal.

Example:

```text
Add joker?

This joker will double the points you earn from this match.
You will have 4 group-stage jokers left after this.

Add joker
Cancel
```

Rules:

- Group-stage jokers and KO Predictor jokers remain separate.
- Original bracket picks do not use jokers.
- The modal uses the correct competition-specific allowance.
- If no jokers remain, show a clear unavailable state.
- If a joker is attached to an incomplete score, Review must flag it.

## Locked prediction snapshot rule

At the Original Predictor deadline, the app should preserve a clear locked snapshot of the user's submitted predictions.

The locked snapshot should include:

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

## Joining a league after lock

Joining a league after the Original Predictor lock should not remove or reduce a user's points, as long as the user submitted valid predictions before the deadline.

The important factor is whether predictions were locked before the deadline, not whether the user joined a league before the deadline.

User-facing copy:

```text
You joined this league after the prediction deadline.
Your locked predictions still count because they were submitted before the deadline.
```

If a league has special entry rules in future, those rules must be shown clearly.

## KO Predictor edge-case examples

The implementation stage must include example rows for these KO Predictor cases before live scoring is accepted:

| Case | Example principle |
|---|---|
| Correct 90-minute score | Exact 90-minute score earns the exact-score award only. |
| Correct 90-minute draw | 90-minute draw can earn the result award, but advancement/method still depend on selected advancing team. |
| Correct advancing team | Advancing-team points can be earned without exact score. |
| Correct method | Method bonus requires correct advancing team. |
| Extra time | Exact-score points still use 90-minute score, not after-extra-time score. |
| Penalties | Penalty shoot-out score is never predicted for match-score points. |
| Wrong advancing team | No advancing-team or method bonus. |
| Exact 90-minute score but wrong penalty winner | Exact-score points apply, but no advancing-team or method bonus. |
| Correct advancing team but wrong method | Advancing-team points apply, method bonus does not. |

## Non-standard match states

The app must support calm non-standard match states:

- delayed;
- postponed;
- suspended;
- abandoned;
- replay required;
- result pending.

Rules:

- Do not score a match until the official result state is valid.
- Do not unlock predictions just because a match is delayed unless a separate rule is approved.
- Match Centre, Results, Home and scoring must handle these states calmly.
- Admin should be able to see why a match has not scored yet.

Example copy:

```text
This match has been delayed.
Predictions remain locked, but points will update after the official result is confirmed.
```

## Final leaderboard and tied-rank display

While the tournament is live, tied positions should be displayed as shared ranks where the final tie-break data is not yet settled.

Final Original Predictor standings use this ladder:

1. closest calculated group-stage goals total;
2. most exact group scores;
3. most correct group results;
4. knockout accuracy cascade;
5. shared rank.

Final KO Predictor standings use this ladder:

1. most exact KO scorelines;
2. most correct KO outcomes;
3. shared rank.

Original Predictor and KO Predictor tied ranks remain separate.

## How to Play wording target

The How to Play / Rules Hub must eventually explain the locked values above in plain language. It must also explain:

- exact-score awards are not cumulative with correct-result awards;
- Original and KO Predictor are separate competitions;
- group goals are calculated automatically from group-score predictions;
- unresolved ties ask the user to change scores or pick positions;
- delayed/postponed/suspended/abandoned matches do not score until the official result is valid;
- real official tables follow official result/tiebreaker data, not user-selected prediction orders.

This stage records the wording target only. Runtime UI wording remains a later implementation step unless explicitly scoped.

## Acceptance criteria

This stage is complete when:

- the locked scoring values are recorded;
- group goals are recorded as auto-calculated only;
- in-group unresolved predicted tiebreakers are recorded;
- best third-place resolver prompts are recorded;
- KO Predictor edge-case examples are recorded;
- final tied-rank display rules are recorded;
- non-standard match states are recorded;
- How to Play wording target is recorded;
- active migrations remain 18;
- Migration 019 is not created;
- WC26 production remains blocked;
- no product source, Supabase schema, migration, scoring engine, resolver, Auth, RLS, official result-entry or fake-result write is changed.

## Audit-marker wording

This stage deliberately records the best-third resolver wording for auditability.

The unresolved best-third order must not affect official real tournament tables.

Delayed, postponed, suspended, abandoned, replay-required and result-pending states do not score until the official result state is valid.
