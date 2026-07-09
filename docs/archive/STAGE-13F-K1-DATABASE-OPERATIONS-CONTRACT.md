> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Euro 2028 Predictor — Stage 13F-K1
## Database operations contract

### Status

Implementation package for the accepted Stage 13F-K0 server contract.

This batch adds Migration 018, its pgTAP acceptance suite, one dedicated repository audit, package-script wiring and governing-document alignment. It also updates the historical Stage 13F-J audit so Migration 017 must remain present and read-only without incorrectly requiring it to stay the latest migration. It changes no frontend component, route, scoring value, resolver rule, participant assignment or tournament-pick persistence.

### Starting checkpoint

- Branch: `euro28-development`
- Commit: `b6c7ddc`
- Active Supabase project: `gcfdwobpnanjchcnvdco`
- Blocked WC26 production project: `ouhxawizadnwrhrjppld`
- Active migrations before installation: 17
- Active migrations after accepted hosted application: 18
- Next implementation batch after acceptance: **Stage 13F-K2 — Euro control-room implementation**

## 1. Purpose

Stage 13F-K1 supplies the protected database operations required by the accepted complete Admin backbone:

1. revision-safe fixture date, kick-off, venue and schedule-status editing;
2. owner-only whole-tournament replacement scoring reconciliation;
3. expanded protected match and venue reads;
4. consolidated operational-readiness evidence;
5. append-only audit records for both operations.

The browser control-room user interface remains unchanged until Stage 13F-K2.

## 2. Migration identity

```text
202607030018_euro28_complete_admin_operations.sql
```

The migration is additive except for safe replacement of two existing read functions:

- `public.admin_list_tournament_matches(uuid)` is dropped and recreated because PostgreSQL cannot change a table-returning function's row type through `create or replace`;
- `public.admin_get_tournament_control_room(uuid)` retains its JSONB signature and is replaced in place.

## 3. Fixture revision

Migration 018 adds:

```text
public.matches.fixture_revision bigint not null default 1
```

with a positive-value constraint.

This revision governs only fixture schedule data:

- `scheduled_date`;
- `kickoff_at`;
- `venue_id`;
- `schedule_status`.

It is deliberately separate from `result_revision`.

All existing 51 Euro fixtures begin at fixture revision 1.

## 4. Protected read contracts

### 4.1 Expanded match list

`public.admin_list_tournament_matches(uuid)` retains every existing result and participant field and adds:

- fixture code;
- scheduled date;
- schedule status;
- participant status;
- venue ID;
- venue name;
- venue city;
- venue timezone;
- fixture revision.

The function remains available only through its internal Admin check.

### 4.2 Tournament venue list

Migration 018 adds:

```text
public.admin_list_tournament_venues(p_tournament_id uuid)
```

It returns only active venues assigned to the requested tournament through `public.tournament_venues`.

Both owner and results-admin roles may read this list. Neither role receives direct table access.

## 5. Owner-only fixture update

Migration 018 adds:

```text
public.admin_update_match_fixture(
  p_tournament_id uuid,
  p_match_id uuid,
  p_expected_fixture_revision bigint,
  p_scheduled_date date,
  p_kickoff_at timestamptz,
  p_venue_id uuid,
  p_schedule_status text,
  p_note text
)
```

The operation fails closed unless:

1. the caller is the active tournament owner;
2. expected fixture revision is positive and current;
3. the match belongs to the requested tournament;
4. match status is `scheduled` or `postponed`;
5. result status remains `pending`;
6. result revision remains zero;
7. schedule status is one of the existing three allowed values;
8. any selected venue is active and assigned to the tournament;
9. official date/venue status includes both date and venue;
10. official datetime status includes date, venue and kick-off;
11. any kick-off's venue-local calendar date matches `scheduled_date`;
12. the Admin note passes the existing five-to-500-character normalisation gate.

A successful update:

- changes only the four approved fixture fields;
- increments `fixture_revision` exactly once;
- updates `updated_at`;
- inserts one `fixture_schedule_updated` event;
- stores full before/after fixture snapshots;
- returns the resulting snapshot.

The operation cannot change participants, match number, fixture code, stage, group, matchday, resolver source or result data.

## 6. Whole-tournament scoring reconciliation

Migration 018 adds:

```text
public.admin_reconcile_tournament_points(
  p_tournament_id uuid,
  p_note text
)
```

The operation:

- requires active owner access;
- uses the existing Admin-note normaliser;
- respects the existing `scoring_recalculation` feature control;
- calls `private.euro28_recalculate_points(p_tournament_id, null)`;
- creates one normal canonical scoring run;
- rebuilds replacement point rows and prediction totals;
- retains one row per prediction set and competition;
- never combines Original and KO Predictor totals;
- inserts one `tournament_points_reconciled` event;
- returns the run ID, status, timestamps and canonical row counts.

No manual point adjustment is introduced.

## 7. Operational readiness

The existing `admin_get_tournament_control_room` JSONB read model is extended with:

### Fixtures

- missing dates;
- missing venues;
- missing confirmed kick-offs;
- provisional schedule count;
- official date/venue count;
- official datetime count.

### Participants

- provisional fixture participants;
- confirmed fixture participants;
- unresolved match slots.

### Results and scoring

- pending, confirmed, manual-review and void results;
- completed scoring runs;
- failed scoring runs;
- stale running scoring runs.

### Content

- fully populated Team Profiles;
- incomplete Team Profiles.

A complete profile currently means all four approved curated fields are present:

- ranking;
- qualifying route;
- best Euro finish;
- editorial note.

### Tournament Picks

The read model exposes:

- contract version `euro28-tournament-picks-v1`;
- contract ready: true;
- executable outcome activation ready: false;
- activation dependency: `stage_17a`.

No tournament-pick table or outcome write is added.

## 8. Audit-event constraint correction

Migration 015 introduced `team_profile_updated`.

Migration 016 later replaced the operation-type constraint but accidentally omitted that accepted value while adding Time & Phase values.

Migration 018 restores the complete accepted union:

- all existing result/Admin/safeguard values;
- `team_profile_updated`;
- `time_control_updated`;
- `time_control_reset`;
- new `fixture_schedule_updated`;
- new `tournament_points_reconciled`.

This is a historical constraint correction, not new product scope.

## 9. Permission boundary

Migration 018:

- grants no browser table write;
- keeps `public.matches` and `public.admin_operation_events` directly unwritable;
- revokes every new protected function from `public` and `anon`;
- grants entry-function execution to `authenticated`;
- performs server-side Admin or owner checks inside every function;
- keeps all private authorisation and scoring helpers unavailable to browser roles;
- adds no service-role secret to application code.

## 10. Database acceptance suite

`018_complete_admin_operations.test.sql` proves:

- schema and function presence;
- no direct authenticated fixture or audit write;
- anonymous execution denial;
- results-admin protected reads;
- results-admin denial for both owner-only mutations;
- valid owner fixture transition;
- exact revision increment;
- append-only before/after evidence;
- stale-revision rejection;
- outside-tournament venue rejection;
- venue-local date mismatch rejection;
- live-state rejection;
- result-processing rejection;
- preservation of `team_profile_updated`;
- complete reconciliation run and event;
- distinct Original and KO totals;
- scoring feature-switch enforcement;
- readiness keys;
- Tournament Picks Stage 17A dependency.

Every pgTAP mutation runs inside a transaction and rolls back.

## 11. Explicit exclusions

Stage 13F-K1 does not add or change:

- frontend Admin controls;
- participant identities or assignments;
- group membership;
- match numbering, fixture code, stage or group;
- resolver logic;
- scoring values;
- joker rules;
- tournament-pick prediction or outcome storage;
- official players;
- manual point editing;
- external result providers;
- Admin role hierarchy;
- synthetic data;
- Stage 13G interface work.

## 12. Acceptance sequence

1. Verify checkpoint, branch, clean tree and package checksum.
2. Create and verify a hosted Euro staging backup.
3. Install the exact package manifest.
4. Run repository audits and the complete local gate.
5. Apply Migration 018 only to `gcfdwobpnanjchcnvdco`.
6. Verify local/remote migration history alignment.
7. Run the linked Migration 018 pgTAP suite.
8. Run linked database lint.
9. Stage the exact manifest.
10. Commit and push.
11. Verify the deployed application remains healthy.
12. Close Stage 13F-K1 and begin Stage 13F-K2.

## 13. Ledger movement

After linked database acceptance:

| Item | Status |
|---|---|
| Migration 018 server/database contract | ✅ FUNCTIONAL |
| Fixture schedule operations | 🟠 PARTIAL — database complete; UI pending |
| Tournament-wide scoring reconciliation | 🟠 PARTIAL — database complete; UI pending |
| Operational readiness summary | 🟠 PARTIAL — database complete; UI pending |
| Tournament-pick Admin readiness home | 🕓 SCHEDULED — Stage 13F-K2 |
| Admin audit filters and detail | 🕓 SCHEDULED — Stage 13F-K2 |
| Complete Admin operations backbone | 🕓 SCHEDULED — Stage 13F-K3 |

## 14. Next task

After Stage 13F-K1 is accepted at a clean 18-migration checkpoint, build:

**Stage 13F-K2 — Euro control-room implementation**

Stage 13G-A, Stage 16A execution and Stage 13P-A remain blocked.
