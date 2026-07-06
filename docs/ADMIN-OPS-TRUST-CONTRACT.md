# Admin Ops Trust Contract

## Purpose

`STAGE-ADMIN-OPS-TRUST-1` defines the trust contract for Admin operations before any further Admin UI implementation.

The goal is to make owner/admin actions understandable, safe and clearly separated from public prediction play.

## Required trust surfaces

Implementation must provide or preserve clear wording for:

- admin control-room trust wording;
- result-entry guardrails;
- correction/recalculation audit explanation;
- fixture schedule/edit trust wording;
- admin roles explanation;
- fake/simulated scenario separation;
- owner-only dangerous action wording;
- operation history clarity;
- public/admin trust boundaries;
- public signup remains closed until implementation gates are complete.

## Admin role explanation

Admin surfaces must distinguish:

- ordinary signed-in member;
- results administrator;
- owner/admin with elevated control-room actions;
- public/guest user with no admin capability.

Hiding a link is not the security boundary. Database permissions, route guards and server/RPC checks remain the security boundary.

## Result-entry guardrails

Result-entry guardrails must explain that official results are controlled operations, require appropriate role access, require audit notes where applicable, and should not silently overwrite prior canonical evidence.

Admin result entry must not be confused with fake/simulated scenario testing.

## Correction/recalculation audit explanation

Corrections and recalculations must explain:

- what changed;
- who ran the operation;
- when it ran;
- whether Original Predictor points were recalculated;
- whether KO Predictor points were recalculated;
- whether leaderboards are fresh, recalculation pending or recalculation complete.

Correction/recalculation audit explanation must be visible enough that a normal user can understand why points changed without needing database knowledge.

## Fixture schedule/edit trust wording

Fixture schedule/edit trust wording must explain that fixture changes affect display timing, lock timing and match-state context, and that fixture edits are audited owner/admin operations.

Fixture schedule edits must not imply that predictions are being changed on behalf of users.

## Owner-only dangerous action wording

Owner-only dangerous action wording must be explicit before any irreversible or high-impact action.

Examples include global lock, tournament reconciliation, large correction runs, feature kill-switches, staging seed writes, teardown or any future operation that can affect many users.

Dangerous action copy must state the action, the scope, whether it is reversible, and what audit evidence will be created.

## Operation history clarity

Operation history clarity must include enough detail for support and user trust:

- operation category;
- actor role;
- timestamp;
- before/after evidence when available;
- notes/reason;
- affected competition;
- status such as started, completed, failed or rolled back.

## Fake/simulated scenario separation

Admin Scenario Runner output, fake scores, synthetic seed runs and simulated results must be isolated from official results.

Fake/simulated scenario separation means simulated results must:

- never be confused with official results;
- never award real points;
- never pollute production;
- never write to canonical official results;
- be clearly labelled as test/simulation output;
- be prevented from appearing as user-facing official results.

## Public/admin trust boundaries

Public/admin trust boundaries must explain that users see trusted result and scoring outputs, while admin surfaces show controlled operations, audit trails and owner-only tools.

Public copy must not expose secrets, service-role details, private user data or implementation-only admin controls.

## Competition boundaries

Original Predictor and KO Predictor are separate competitions.

Admin copy must never imply that an admin correction combines Original and KO points. If a recalculation affects both competitions, it must say so as two separate recalculation scopes.

## Signup and migration boundaries

Public signup remains closed until implementation gates are complete.

This stage does not introduce runtime UI, route, Auth, Supabase, fixture-write, result-write, admin-operation write, scoring, resolver or migration changes.

Active migrations remain 18. No Migration 019 is created. This contract also uses the explicit no Migration 019 marker.
