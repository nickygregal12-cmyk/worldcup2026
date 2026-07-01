# Migration 005 — Prediction storage foundation

> **NON-EXECUTABLE DESIGN BLUEPRINT**
>
> This file is intentionally Markdown. It must be reviewed and converted into a new SQL migration only after the reconciled prediction contracts pass. It cannot be pushed to Supabase.

## Scope

Migration 005 will create storage, constraints, indexes and read security only. It will not create the trusted atomic save operation, authentication UI, leagues, scoring runs or admin result controls.

## Planned tables

### `scoring_rulesets`

One versioned ruleset for each scoring configuration.

Required concepts:

- stable code and version
- status: `provisional`, `locked` or `retired`
- match, knockout and bracket point values
- joker multiplier
- provisional group-stage joker cap
- provisional knockout joker cap
- immutable once locked
- created and updated timestamps

Prediction rows never copy point values or joker limits.

### `prediction_sets`

One row per user and tournament.

Required concepts:

- tournament owner
- authenticated user owner
- prediction contract version
- pinned scoring ruleset
- optimistic revision
- `submitted_at` for reversible review mode
- created and updated timestamps

`submitted_at` does not determine eligibility, create a snapshot or copy rows. Saved and unsubmitted predictions count identically at the global lock.

### `match_predictions`

One row per prediction set and tournament match.

Required concepts:

- predicted home and away tournament-team identities
- `home_score_90` and `away_score_90`
- advancing team and decision method for knockout matches
- `joker_applied`
- uniqueness by prediction set and match
- no copied point values

The predicted score always means the score after 90 minutes plus added time. Extra-time and penalty shoot-out scores belong to real match results, not prediction score fields.

### `prediction_grace_windows`

Audited exceptional access for one user and one match.

Required concepts:

- tournament, user and match
- granting administrator
- grant timestamp
- expiry timestamp
- optional reason
- target match must be unstarted when used
- expiry is automatic by database-time comparison

A grace row never changes or clears the global lock.

## Tournament columns

The tournament model will reference:

- `active_scoring_ruleset_id`
- `prediction_contract_version`
- `prediction_locked_at`

`prediction_locked_at` is monotonic. Once recorded, schedule corrections cannot reopen prediction content.

## Lock model

- Score predictions, group outcomes and knockout selections use the one global opening-match lock.
- Joker allocation uses each target match kick-off and may be moved only between unstarted matches.
- A valid grace window may permit one content edit for one user and one unstarted match.
- Database time is authoritative.

## Security

- RLS enabled on every new table in the creating migration.
- Anonymous prediction reads: none.
- Before global lock, an authenticated user may read only their own prediction data.
- After global lock, controlled authenticated reads may reveal other users' predictions.
- **no direct browser table writes**
- No authenticated insert, update or delete policies in Migration 005.
- The future save path is a reviewed atomic bundle operation with expected revision.

## Atomic write contract for a later migration

The future trusted save operation must validate, in one transaction:

- authenticated ownership
- expected revision
- global content lock or valid scoped grace
- match kick-off for joker changes
- joker caps from the pinned scoring ruleset
- participant and score shape
- canonical bracket path
- complete bundle consistency

It accepts the whole valid bundle or writes nothing.

## Guest context

**guest mode has no server-side prediction storage**.

Guest/explore predictions live in the browser, are unscored and use the same canonical resolver as signed-in and live brackets. A later pre-lock import must pass through the normal trusted atomic save operation.

## Explicit exclusions

Migration 005 must not add:

- browser writes
- final save RPC/function
- authentication screens
- profiles
- leagues
- score calculation or point totals
- admin result entry
- API-provider integration
