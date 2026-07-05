# Stage 16A-P2 — Staging-effective Database Time

## Status

This package completes **Stage 16A-P2 — Staging-effective database time** as a guarded planning, model and audit package.

It does not seed data, create users, change product components, change resolver logic, change scoring logic, alter routes, apply database policies, create Supabase write paths, run service-role operations or create a migration.

The purpose is to prove that Stage 16A seeded acceptance can exercise privacy, lock and release phases through the existing staging Time & Phase control without applying the irreversible real global prediction lock.

## Scope boundary

P2 prepares the effective-time contract that later Stage 16A seed and validation scripts must use.

P2 is deliberately limited to:

- one canonical local effective-time acceptance catalogue;
- one Euro-staging project guard reused from Stage 16A-P1;
- one explicit WC26 production block;
- one assertion that all phase cases use existing `TIME_PHASE_PRESETS`;
- one assertion that no phase case applies the real global prediction lock;
- unit tests and repository audit markers.

## Required project boundary

- Euro staging project: `gcfdwobpnanjchcnvdco`.
- Blocked WC26 production project: `ouhxawizadnwrhrjppld`.
- Any future Stage 16A time-phase operation must refuse any project ref except Euro staging.
- WC26 production must be rejected with a specific fail-closed error.

## Existing time-control contract reused

P2 reuses the already-approved Stage 13F-G Time & Phase mechanism:

- `tournament_time_controls`;
- `get_tournament_time_control`;
- `admin_set_tournament_time_control`;
- `admin_reset_tournament_time_control`;
- `TIME_PHASE_PRESETS`;
- `VITE_APP_ENV=staging`;
- `VITE_ENABLE_TIME_TRAVEL=true`.

The existing control changes application time only. It does not mutate fixtures, results, prediction rows, lock records, scoring records, league rows or tournament picks.

## Effective-time acceptance phases

The exact existing phase keys covered by this package are:

```text
pre_lock
global_lock
grace_period
group_live
group_complete
knockout_unresolved
knockout_known
ko_open
fixture_locked
match_live
correction_review
tournament_complete
```


The approved Stage 16A-P2 phase catalogue covers:

1. Original Predictor before lock with shared picks still private.
2. Simulated global-lock view with Original shared-prediction release exercised without applying the irreversible real global lock.
3. Grace-period evidence for authorised unstarted-match exception checks.
4. Group-stage live evidence for live results, tables, Match Centre and privacy-safe comparison states.
5. Group-stage complete evidence while knockout slots are still unresolved.
6. Knockout fixtures known evidence before KO Predictor fixtures have kicked off.
7. KO Predictor open evidence with separate KO standings still independent from Original totals.
8. Fixture-locked evidence for an individual KO match.
9. Match-live evidence for fixture-by-fixture KO release.
10. Correction-review evidence for recalculation/correction-sensitive persona checks.
11. Tournament-complete evidence for final read-only states.

Each phase is an application-time view over staging data. No phase writes the global prediction-lock record, changes fixture status, records results or recalculates points by itself.

## Irreversible lock rule

The real global prediction lock remains an irreversible product operation and must not be used for Stage 16A phase rehearsal.

Stage 16A acceptance may simulate a post-lock date by setting the existing staging time-control row. That is not the same as applying the real lock. The simulator must be resettable and audited through the existing time-control audit event path.

## Competition rules

Original Predictor and KO Predictor stay separate in every phase case.

The phase catalogue may ask for evidence from both competitions, but it must not create combined totals, blended leaderboards or cross-competition scoring evidence.

## Explicit non-goals

This package does not include:

- Supabase Admin API calls;
- service-role credential handling;
- Auth user creation;
- profile row creation;
- provisional team seeding;
- prediction seeding;
- league seeding;
- result correction execution;
- score oracle implementation;
- teardown implementation;
- UI badges or component changes;
- database functions, policies or migrations.

Active migrations remain 18 and Migration 019 must not exist.

## Acceptance checks

`audit:stage16a-p2-staging-effective-time` proves:

- the P2 doc exists and records the staging-only boundary;
- the local phase catalogue covers privacy, lock, release, correction and complete evidence;
- every phase key maps to the existing `TIME_PHASE_PRESETS` catalogue;
- every phase case is resettable and explicitly does not apply the real global prediction lock;
- the tooling refuses WC26 production and any non-Euro staging project;
- package scripts wire the audit into `npm run check`;
- active migrations remain 18 and Migration 019 is absent.

## Next package

With Stage 16A-P1 and Stage 16A-P2 complete, Stage 16A-P3 — Seed manifest dry-run is the seed-manifest dry-run checkpoint before any staging write path exists. The first later implementation slice should remain staging-only and should not combine provisional teams, user creation, predictions, scoring oracle, leagues, correction rehearsal and teardown in one oversized patch.
