# Stage 2 — Reconciled prediction database design

Status: **approved blueprint; Migration 005 not yet created**

## Tables planned for Migration 005

- `scoring_rulesets`
- `prediction_sets`
- `match_predictions`
- `prediction_grace_windows`

## Key decisions

- One prediction set per user and tournament.
- `submitted_at` stores a reversible review state only.
- Match predictions store 90-minute scores, projected participants, knockout progression fields and `joker_applied`.
- Joker multiplier and caps live only on the versioned scoring ruleset.
- Grace windows are audited and scoped to one user and one match.
- Guest mode has no server storage.
- The database clock is authoritative.
- No direct browser table writes are introduced.
- The trusted atomic save operation remains deferred until after the canonical resolver is complete and tested.

## Security

RLS is enabled in the migration that creates each table. Owners can read their own data before lock. Controlled post-lock reads may reveal predictions. Anonymous access and raw authenticated writes remain denied.

## Migration boundary

Migration 005 creates storage and read security. It does not create authentication UI, profiles, leagues, point totals, result entry, provider sync or the final save route.
