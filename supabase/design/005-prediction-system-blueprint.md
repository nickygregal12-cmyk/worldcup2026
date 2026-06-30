# NON-EXECUTABLE DESIGN BLUEPRINT — Migration 005

This file is a review blueprint. It is deliberately Markdown rather than SQL.
It must not be executed, moved into `supabase/migrations`, or pushed to the
hosted database.

## Migration 005 boundary

Migration 005 will add the storage and read-security foundation only. It will
not add authentication screens, profiles, leagues, scored points, admin result
editing, an RPC save endpoint or direct browser table writes.

A later Migration 006 or later will add the atomic bundle write path only after
the canonical group-table and knockout-bracket resolver is implemented and
tested.

## Tournament additions

Add these columns to `public.tournaments`:

- `active_scoring_ruleset_id uuid` — the one ruleset used by the tournament;
- `prediction_contract_version text` — expected to begin as `euro28-v1`;
- `prediction_locked_at timestamptz` — the persisted, monotonic global lock.

The existing `prediction_lock_at` remains the scheduled opening-match lock.
Writes are allowed only when it is non-null, `prediction_locked_at` is null and
the database time is strictly before `prediction_lock_at`.

Once `prediction_locked_at` is set it cannot be cleared or moved. Changing the
fixture schedule must never reopen predictions.

## `public.scoring_rulesets`

One row represents one version of all scoring values. Point values are not
copied into prediction rows or page components.

Planned columns:

- `id uuid primary key`;
- `tournament_id uuid not null`;
- `version text not null`;
- `status text not null` — `provisional`, `locked` or `retired`;
- `contract_version text not null`;
- nine non-negative integer point columns matching the central rule codes;
- `locked_at timestamptz`;
- server-controlled `created_at` and `updated_at`.

Constraints:

- unique `(tournament_id, version)`;
- unique `(id, tournament_id)` for composite references;
- exact-score points cannot be lower than correct-outcome points;
- `locked_at` is required only for a locked ruleset;
- a locked ruleset is immutable;
- the tournament's active ruleset must belong to that tournament.

Only trusted maintenance code may insert or change rulesets. Published
rulesets may be read with the public tournament reference data.

## `public.prediction_sets`

One row exists per authenticated user and tournament. There is no separate
submit button: saves remain editable drafts until the single global lock.
Completeness is derived from the saved match rows rather than stored as a user
controlled flag.

Planned columns:

- `id uuid primary key`;
- `tournament_id uuid not null`;
- `user_id uuid not null references auth.users(id)`;
- `contract_version text not null`;
- `scoring_ruleset_id uuid not null`;
- `revision integer not null default 0`;
- server-controlled `created_at` and `updated_at`.

Constraints:

- unique `(tournament_id, user_id)`;
- unique `(id, tournament_id)`;
- scoring ruleset must belong to the same tournament;
- revision is non-negative and only the trusted save path increments it;
- user, tournament, contract version and ruleset are not browser-editable.

## `public.match_predictions`

Each complete saved row represents one user's prediction for one official
match number. Partial score inputs remain in the interface until the row has a
valid pair of scores.

Planned columns:

- `id uuid primary key`;
- `prediction_set_id uuid not null`;
- `tournament_id uuid not null`;
- `match_id uuid not null`;
- `predicted_home_tournament_team_id uuid not null`;
- `predicted_away_tournament_team_id uuid not null`;
- `home_score_90 integer not null`;
- `away_score_90 integer not null`;
- `advancing_tournament_team_id uuid`;
- `decision_method text`;
- server-controlled `created_at` and `updated_at`.

Constraints:

- unique `(prediction_set_id, match_id)`;
- match, prediction set and all team IDs belong to the same tournament;
- predicted home and away teams are different;
- scores are integers from 0 to 99;
- group rows have no advancing team or decision method;
- knockout rows require an advancing team and `normal_time`, `extra_time` or
  `penalties`;
- normal-time knockout decisions require the score winner to advance;
- extra-time or penalty predictions require a normal-time draw;
- no point values, awarded points or league IDs are stored here.

The predicted participant IDs are required because knockout participants are a
snapshot of the user's own projected bracket before the real tournament has
resolved those slots.

## Trusted atomic bundle write model

There will be no direct browser table writes.

A later trusted database API will save one atomic bundle containing the user's
current set of complete rows. It will:

1. obtain the authenticated user ID from the request, never the payload;
2. use database time and fail closed if the scheduled lock is missing;
3. reject every write at or after the scheduled or persisted lock;
4. require `expected_revision` and reject stale tabs;
5. set the active contract and scoring ruleset server-side;
6. validate every match belongs to the tournament;
7. validate official group participants;
8. derive and validate the predicted group standings, best-third allocation
   and complete knockout path;
9. replace the saved bundle in one transaction, deleting omitted draft rows;
10. increment the set revision and set timestamps server-side.

Migration 005 will not implement this API. That prevents a write route being
opened before the canonical bracket resolver exists.

## RLS and grants

RLS is enabled on all three new tables.

`scoring_rulesets`:

- published tournament rules may be selected by `anon` and `authenticated`;
- no browser insert, update or delete grants.

`prediction_sets` and `match_predictions`:

- anonymous access is denied;
- an authenticated owner can select their own rows before lock;
- after the global lock, authenticated users may select other users' rows;
- no direct insert, update or delete grants to `authenticated` in Migration 005;
- `service_role` retains trusted maintenance access.

Lock and visibility helpers belong in a non-exposed private schema, use an
explicit empty `search_path`, fully qualify relations, and use database time.

## Deliberately deferred

- Authentication and profile UI;
- canonical group-table and best-third resolver;
- atomic save RPC/API;
- prediction completion/progress view;
- locked-publication view and display-name joins;
- scoring runs and points tables;
- leagues;
- admin corrections and their audit log;
- result confirmation changes to `matches`.
