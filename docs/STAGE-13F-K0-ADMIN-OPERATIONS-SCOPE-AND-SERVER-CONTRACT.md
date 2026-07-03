# Euro 2028 Predictor — Stage 13F-K0
## Complete Admin operations backbone scope and server contract

### Status

Approved planning and server-contract batch. This batch changes governing documents only. It adds no product/runtime code, database object, migration or deployed asset.

### Starting checkpoint

- Branch: `euro28-development`
- Commit: `efce59f60429ffb0820144b1faee6f91fb8fddc0`
- Active Supabase project: `gcfdwobpnanjchcnvdco`
- Blocked WC26 production project: `ouhxawizadnwrhrjppld`
- Active migrations: 17
- Next implementation batch after acceptance: **Stage 13F-K1 — Database operations contract**

## 1. Purpose

Stage 13F-K completes the Euro-native Admin operations backbone before Stage 13G begins. The control room must support every approved launch and live-tournament operation without direct table editing, hidden inherited WC26 routes or unaudited recovery actions.

This scope preserves the existing fail-closed Admin model. It does not reopen product rules, scoring values, resolver rules, competition separation or navigation decisions.

## 2. Existing functional Admin foundation

The following capabilities are already functional and remain authoritative:

- server-authorised owner and results-admin access;
- Admin invisibility and fail-closed direct-route protection;
- official result entry and correction;
- void and manual-review result states;
- match-status updates;
- per-match replacement scoring recalculation;
- irreversible global Original Predictor lock;
- database-enforced feature controls;
- user/competition/match grace windows;
- staging Time & Phase controls;
- revision-safe Team Profile curation;
- result revision history and scoring-run history;
- health, joker-lock and knockout-allocation review;
- append-only Admin operation events.

Stage 13F-K extends this foundation. It does not rebuild or duplicate it.

## 3. Confirmed gaps

### 3.1 Fixture setup

Normal Admin operation currently cannot update a fixture's:

- scheduled date;
- confirmed kick-off timestamp;
- venue;
- schedule-certainty status.

Those fields already exist in `public.matches`, but no protected browser operation owns them.

### 3.2 Tournament-wide scoring recovery

The control room can recalculate one match. It cannot run a complete replacement reconciliation after a broad correction, stale run or rehearsal incident, although `private.euro28_recalculate_points(uuid, uuid)` already supports `null` as the all-matches scope.

### 3.3 Tournament-pick outcome readiness

The versioned tournament-pick contract exists, but Stage 17A still owns:

- tournament-pick persistence;
- official player data;
- executable Admin outcome entry;
- scoring activation and player-facing consumption.

Stage 13F-K must provide the single Admin home and readiness state without inventing premature text/JSON player identifiers or fake controls.

### 3.4 Operational readiness and audit usability

Existing health and audit data are fragmented. The control room needs one clear readiness summary and more usable filtering/detail while retaining the existing append-only source.

## 4. Stage 13F-K exact batch structure

### Stage 13F-K0 — Scope and server-contract approval

Documents only:

- approved operation inventory;
- exact Migration 018 contract;
- role and permission matrix;
- tournament-pick Stage 17A hand-off;
- acceptance matrix;
- ledger rows before implementation.

No product code or migration is added.

### Stage 13F-K1 — Database operations contract

- add Migration 018;
- add `018_complete_admin_operations.test.sql`;
- update database/Admin contract audits;
- run local and linked Euro-staging database acceptance;
- keep the frontend unchanged.

### Stage 13F-K2 — Euro control-room implementation

- fixture operations;
- whole-tournament scoring recovery;
- tournament-pick readiness home;
- consolidated operational-readiness model;
- improved audit presentation;
- model/service/schema tests;
- responsive light/dark baselines.

`AdminOperations.jsx` must be split rather than enlarged beyond the standing architecture cap.

### Stage 13F-K3 — Staging acceptance and close-out

- full repository gate;
- deployed Admin visibility verification;
- owner and results-admin permission walkthroughs;
- transactional fixture-validation evidence;
- complete reconciliation evidence;
- roadmap and ledger close-out;
- clean local/remote and local/linked migration alignment.

The real irreversible global lock must not be triggered. No invented kick-off time may be written to shared staging.

## 5. Fixture operations contract

### 5.1 Editable fields

The owner-only fixture operation may change only:

- `scheduled_date`;
- `kickoff_at`;
- `venue_id`;
- `schedule_status`.

Allowed schedule values remain:

- `provisional`;
- `official_date_venue`;
- `official_datetime`.

### 5.2 Non-editable fields

The browser control room must not edit:

- match number;
- fixture code;
- stage or group;
- group membership;
- actual participating teams;
- `participants_status`;
- knockout slot source rules;
- resolver output.

Provisional-team replacement and confirmed draw assignment remain guarded Stage 16A/Stage 17 data operations. Knockout participants remain resolver-owned.

### 5.3 Mutation safety

A fixture update is accepted only when all conditions pass:

1. the caller is the active tournament owner;
2. the match belongs to the requested tournament;
3. match status is `scheduled` or `postponed`;
4. result status is `pending`;
5. result revision is zero;
6. expected fixture revision equals the persisted fixture revision;
7. the venue is active and belongs to the tournament;
8. `official_date_venue` has a date and venue;
9. `official_datetime` has a date, venue and kick-off;
10. the selected venue-local calendar date represented by `kickoff_at` agrees with `scheduled_date`;
11. the explanatory note is non-empty.

A successful update increments `fixture_revision`, updates `updated_at` and records before/after values in the append-only Admin timeline.

## 6. Approved Migration 018 contract

### 6.1 Migration identity

Suggested filename:

```text
202607030018_euro28_complete_admin_operations.sql
```

Migration 018 is approved by this document but is not created or applied in Stage 13F-K0. The active migration count remains 17 until Stage 13F-K1 owner acceptance.

### 6.2 Schema addition

Add to `public.matches`:

```text
fixture_revision bigint not null default 1
```

with a positive-value check. Existing rows begin at revision 1.

### 6.3 Admin event types

Extend the existing operation-type constraint with exactly:

- `fixture_schedule_updated`;
- `tournament_points_reconciled`.

No existing event value is removed or renamed.

### 6.4 Read contracts

Rebuild `public.admin_list_tournament_matches(uuid)` to retain its existing fields and additionally return:

- `fixture_code`;
- `scheduled_date`;
- `schedule_status`;
- `participants_status`;
- `venue_id`;
- `venue_name`;
- `venue_city`;
- `venue_timezone`;
- `fixture_revision`.

Add owner/results-admin-readable venue support:

```text
public.admin_list_tournament_venues(p_tournament_id uuid)
```

It returns only active venues assigned through `public.tournament_venues`, including venue ID, name, city, country code, timezone, capacity, provisional flag and display order.

### 6.5 Fixture update RPC

Add owner-only:

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

The RPC must:

- call `private.euro28_require_tournament_owner`;
- lock the target match row;
- enforce every rule in section 5.3;
- update only the approved fields;
- increment `fixture_revision` once;
- insert one `fixture_schedule_updated` event with full before/after JSON;
- return the resulting fixture snapshot.

### 6.6 Complete scoring-reconciliation RPC

Add owner-only:

```text
public.admin_reconcile_tournament_points(
  p_tournament_id uuid,
  p_note text
)
```

The RPC must:

- call `private.euro28_require_tournament_owner`;
- require a non-empty note;
- respect the existing `scoring_recalculation` feature control;
- call `private.euro28_recalculate_points(p_tournament_id, null)`;
- retain replacement-based/idempotent scoring behaviour;
- preserve separate Original and KO totals;
- preserve prior failed and completed run history;
- insert one `tournament_points_reconciled` event containing the new scoring-run ID and summary;
- return the scoring-run ID and canonical summary.

No manual point editing is introduced.

### 6.7 Operational-readiness output

Extend the existing control-room overview/read model rather than creating a new mutable readiness table. It must expose counts/status for:

- fixtures missing date;
- fixtures missing venue;
- fixtures missing confirmed kick-off;
- provisional, official-date/venue and official-datetime fixtures;
- provisional and confirmed participants;
- pending, confirmed, manual-review and void results;
- completed, failed and stale-running scoring runs;
- complete and incomplete Team Profiles;
- global-lock and feature-control state;
- tournament-pick contract readiness with Stage 17A activation dependency.

### 6.8 Permissions and browser boundary

- Revoke every new or replaced function from `public` and `anon`.
- Grant protected entry functions to `authenticated` only where the function performs its own Admin/owner check.
- Keep private scoring and owner-check helpers unavailable to browser roles.
- Add no direct browser table write.
- Add no service-role secret to the frontend.

## 7. Role matrix

| Operation | Results admin | Owner |
|---|---:|---:|
| View control room/readiness/audit | Yes | Yes |
| Enter or correct results | Yes | Yes |
| Update match status | Yes | Yes |
| Recalculate one match | Yes | Yes |
| View tournament venues | Yes | Yes |
| Edit fixture date/time/venue/status | No | Yes |
| Reconcile all tournament points | No | Yes |
| Trigger global lock | No | Yes |
| Change feature controls | No | Yes |
| Manage grace | No | Yes |
| Curate Team Profiles | No | Yes |
| Use staging Time & Phase | No | Yes |
| Enter future tournament-pick outcomes | No | Yes, from Stage 17A |

No new Admin role is added.

## 8. Tournament-pick Admin hand-off

Stage 13F-K2 creates a dedicated Tournament Picks section inside the existing control room. It renders the approved central contract:

- total tournament goals;
- top scorer;
- highest-scoring team;
- 20 points each;
- Original Predictor only;
- global lock;
- no joker;
- no KO Predictor points.

Before Stage 17A it shows a clear dependency state and no fake outcome controls.

Stage 17A owns:

- prediction/outcome tables;
- official player references;
- outcome-entry RPC;
- tournament-pick scoring;
- player-facing save/review/live-race/points consumption.

Stage 17A must attach executable outcome entry to this existing Admin section rather than create a second Admin destination.

## 9. Audit presentation contract

Stage 13F-K2 keeps `admin_operation_events` as the single append-only source and adds:

- operation-category filters;
- expandable payload detail;
- fixture before/after snapshots;
- scoring-run identifiers;
- actor, target, match and timestamp context;
- access to up to the existing server maximum of 200 events.

No event may be edited or deleted.

## 10. Explicit exclusions

Stage 13F-K does not add or change:

- scoring values or joker rules;
- tournament resolver logic;
- group or knockout participant assignment;
- external result providers;
- official player data;
- tournament-pick persistence/scoring;
- manual points adjustment;
- Admin role hierarchy;
- player-facing information architecture;
- inherited WC26 Admin code;
- Stage 16 synthetic data;
- Stage 13G implementation.

## 11. Acceptance matrix

### Stage 13F-K1 database acceptance

- migration safety and fresh backup pass;
- local and remote migration history align after explicit owner application;
- results admin cannot call owner-only fixture/reconciliation operations;
- owner fixture update passes valid transitions and rejects every invalid state;
- stale fixture revision fails without mutation;
- venue outside the tournament fails closed;
- fixture event stores exact before/after values;
- complete reconciliation creates one new run and one audit event;
- Original and KO totals remain separate;
- no direct browser table write exists;
- active migration count becomes 18 only after hosted acceptance.

### Stage 13F-K2 frontend acceptance

- owner sees fixture and reconciliation controls;
- results admin sees neither owner-only action;
- signed-out and ordinary users remain unaware of Admin;
- all loading, empty, validation, conflict, success and failure states exist;
- no raw date/time value is shown;
- Tournament Picks displays readiness, not fake functionality;
- audit filters and detail remain read-only;
- responsive light/dark baselines pass at 380, 768 and 1200 pixels.

### Stage 13F-K3 close-out

- full `npm run check` passes;
- linked database tests pass;
- deployed Admin verification passes;
- owner and results-admin walkthroughs match the role matrix;
- no real global lock is triggered;
- no invented kick-off time is persisted;
- checkpoint, remote and migration history are clean and aligned;
- ledger rows move only with owner Terminal evidence.

## 12. Ledger movement

### Stage 13F-K0

| Row | Status after acceptance |
|---|---|
| Stage 13F-K operation inventory | ✅ FUNCTIONAL |
| Migration 018 server contract | ✅ FUNCTIONAL |
| Fixture operations | 🕓 SCHEDULED |
| Tournament-wide scoring reconciliation | 🕓 SCHEDULED |
| Tournament-pick Admin readiness home | 🕓 SCHEDULED |
| Tournament-pick outcome persistence | 🕓 SCHEDULED — Stage 17A |
| Complete Admin operations backbone | 🕓 SCHEDULED |

### Stage 13F-K1

Fixture operations and tournament-wide reconciliation move to 🟠 PARTIAL after database acceptance because the owner-facing UI is not yet present.

### Stage 13F-K3

The complete Admin operations-backbone row moves to ✅ FUNCTIONAL only after database, frontend, deployed and owner-role acceptance. Tournament-pick persistence remains scheduled for Stage 17A.

## 13. Sequence after Stage 13F-K

1. Accept Stage 13F-K0.
2. Build and accept Stage 13F-K1.
3. Build and accept Stage 13F-K2.
4. Close Stage 13F-K3.
5. Begin Stage 13G-A.
6. Continue the approved Stage 13G/Stage 16A interleaving.

Stage 13G-A, Stage 16A execution and Stage 13P-A must not begin early.
