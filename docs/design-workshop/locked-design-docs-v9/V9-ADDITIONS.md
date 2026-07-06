# v9 additions — Edge-case rules addendum

This v9 pack keeps the v9 locked visual-contract, safety, streamlined batch and unresolved-tiebreaker
records intact, and adds the Edge-Case Rules Addendum.

These additions are not separate new standalone stages. They must be folded into the existing
streamlined batches.

## Additions recorded

1. Unresolved in-group tiebreaker prompt.
2. Best third-place resolver prompt.
3. Bracket invalidation after group-score edits.
4. Joker confirmation modal.
5. Group goals total is auto-calculated only.
6. Locked prediction snapshot.
7. Joining a league after lock.
8. KO Predictor edge-case scoring examples.
9. Postponed, delayed, suspended, abandoned, replay-required and result-pending match states.

## Placement in the streamlined plan

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

## Key principles

When the app cannot calculate the user's intended order from scores alone, it should ask the user rather
than silently choosing.

The user's locked prediction state should be auditable after the deadline.

## Important correction to earlier docs

Group goals should now be treated as auto-calculated only.

Do not make group goals manually editable in Review Picks. Review should show the calculated total from
the 36 group match predictions, or a clear incomplete state if one or more group scores are missing.
