# Stage 2 Batch 3 — Prediction database and RLS design

**Status:** complete — the database design has been reviewed and approved. No Migration 005 exists and no database change has been applied.

## Purpose

This batch translates the approved prediction contract into a database design
without opening a write route. It is intentionally a review gate between pure
application rules and an executable migration.

Design version: `euro28-prediction-db-v1`.

## Approved decisions

1. There is one prediction set per authenticated user and tournament.
2. A prediction set has no separate submit button. Valid rows auto-save as a
   draft and become immutable at the one global opening-match lock.
3. Completeness and progress are derived from saved rows rather than trusted
   from a user-controlled flag.
4. Every match prediction stores the user's projected home and away teams as a
   snapshot. This is essential for pre-tournament knockout predictions, where
   the real participants are not yet known.
5. Scores always mean the result after 90 minutes plus added time.
6. Knockout rows additionally store the advancing team and decision method.
7. Scoring values live in a versioned `scoring_rulesets` row. Prediction rows
   never copy point values.
8. Every prediction set pins the contract and scoring-ruleset version used.
9. Saves eventually use one atomic bundle with an expected revision. This
   prevents partial bracket updates and stale tabs overwriting newer work.
10. Migration 005 creates storage and read-security only. It creates no direct
    browser table writes. The trusted save API comes later, after the canonical
    predicted group-table, best-third and knockout resolver is tested.

## Planned schema

### Tournament columns

The existing `tournaments.prediction_lock_at` remains the scheduled lock. The
following are added:

- `active_scoring_ruleset_id`;
- `prediction_contract_version`;
- `prediction_locked_at`.

`prediction_locked_at` is the persisted monotonic lock. Once set, it cannot be
cleared or moved. Database time remains authoritative even if the persistence
job is late.

### `scoring_rulesets`

One row contains all current scoring values and a version/status. The points
can be changed centrally while provisional. A locked ruleset is immutable. The
tournament points to its active ruleset, and each prediction set records the
ruleset it uses.

This is the future database equivalent of the current central
`src/config/scoringConfig.js` file. It avoids separate components, pages or
jobs carrying their own copies of point values.

### `prediction_sets`

One row identifies a user's Euro prediction set. It records:

- tournament and owner;
- prediction contract version;
- scoring ruleset version;
- an integer revision;
- server-controlled timestamps.

There is no user-editable lock, submitted flag, points total or league ID.

### `match_predictions`

One complete row stores:

- its prediction set and official match;
- projected home and away tournament teams;
- home and away normal-time score;
- advancing team and method for knockout matches;
- server-controlled timestamps.

The unique key is one row per prediction set and official match. Team, match
and prediction-set references must all belong to the same tournament.

## Why the projected teams are stored

The tournament locks before any knockout participant is known. A user's Round
of 16 participants come from their own predicted group tables and UEFA's fixed
best-third rules. Later knockout participants come from the user's predicted
winners.

The database therefore needs the projected participant snapshot for every
knockout row. Storing only `match_id` and a score would lose the meaning of the
prediction.

## Atomic future write path

A whole prediction bundle will eventually be saved in one transaction. The
trusted validator will:

- obtain ownership from the authenticated request;
- check database time against scheduled and persisted locks;
- reject a missing lock time rather than guessing;
- require the client's expected revision;
- reject duplicate or foreign matches;
- validate official group participants;
- rebuild predicted group standings;
- apply the official best-third combination;
- validate every knockout participant and winner path;
- replace omitted draft rows safely;
- increment the revision and timestamps server-side.

This avoids the WC26 failure mode where separate features updated related
parts of a bracket independently and left contradictory data.

## RLS model

All new tables use RLS.

Before lock:

- anonymous users cannot read predictions;
- an authenticated user can read only their own prediction set and rows;
- no direct browser insert, update or delete grant exists.

After lock:

- authenticated users may read other users' frozen predictions;
- predictions remain immutable;
- anonymous access is still denied unless a later deliberately limited public
  view is approved.

Rulesets may be read with published tournament reference data but may be
changed only by trusted maintenance code.

The lock and visibility helpers will live in a non-exposed private schema.
They will use an explicit empty search path, fully qualified relation names and
the database clock.

## Migration split

### Migration 005

Planned:

- `scoring_rulesets`;
- `prediction_sets`;
- `match_predictions`;
- the three tournament columns;
- constraints, indexes, timestamp triggers, RLS and read grants;
- no browser writes and no data migration from WC26.

### Migration 006 or later

Deferred until the resolver is tested:

- trusted atomic bundle save API;
- bracket-path validation;
- stale-revision handling;
- controlled lock persistence;
- any safe post-lock publication view.

## Explicitly outside this batch

- creating Migration 005;
- applying anything to local or hosted Supabase;
- login, registration or profiles;
- leagues;
- scoring-run and points tables;
- result-entry or admin correction tools;
- changing the current foundation page;
- changes to WC26 `main` or its Supabase project.

## Automated protection

`npm run audit:db-design` confirms:

- exactly four active migrations remain;
- no prediction migration has been created prematurely;
- the non-executable blueprint remains under `supabase/design`;
- no direct browser table writes are planned;
- one versioned ruleset remains the point-value source;
- writes are atomic and revision-controlled;
- lock and privacy rules fail closed.

## Technical references

The design follows Supabase's current guidance that exposed tables should use
RLS, authenticated ownership policies should use `auth.uid()`, and security
definer helpers should stay outside exposed schemas. It also follows
PostgreSQL's distinction between row-local checks and cross-row validation,
which requires trusted functions or triggers rather than pretending a `CHECK`
constraint can inspect other table rows.

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions
- https://www.postgresql.org/docs/current/ddl-constraints.html

## Review point

Stage 2 Batch 3 is complete. The next batch will turn only the Migration 005 portion into executable SQL, run it against a clean local database, and keep browser writes disabled.
