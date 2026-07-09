> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 16A-P4 — Seed SQL preview dry-run

Date: 2026-07-05
Status: accepted as a guarded dry-run scaffold
Scope: local generator, model, tests, audit and documentation only

## Purpose

This package completes **Stage 16A-P4 — Seed SQL preview dry-run**.

It introduces a local generator for a **read-only SELECT preview** of the Stage 16A seed plan. The preview proves the planned counts, project guard, teardown markers and competition separation before any live staging write path exists.

It is not seeded acceptance and it is not a data-writing package.

## Source of truth

Stage 16A-P4 consumes the accepted Stage 16A-P3 manifest dry-run.

The generated preview reports:

```text
24 provisional team slots
19 synthetic personas
11 resettable time-phase cases
3 league shapes
Original Predictor evidence count
KO Predictor evidence count
Dual-marker teardown guard
```

The preview version is:

```text
stage16a-seed-sql-dry-run-v1
```

The allowed project remains:

```text
gcfdwobpnanjchcnvdco
```

The blocked WC26 production project reference remains:

```text
ouhxawizadnwrhrjppld
```

## What changed

Stage 16A-P4 adds:

```text
scripts/lib/stage16aSeedDryRunSql.mjs
scripts/generate-stage16a-p4-seed-dry-run-sql.mjs
scripts/__tests__/stage16aSeedDryRunSql.test.js
scripts/check-stage16a-p4-seed-dry-run-sql.mjs
```

It also wires:

```text
audit:stage16a-p4-seed-dry-run-sql
stage16a:p4:sql:dry-run
```

## Generator behaviour

The generator prints a SQL preview that starts with:

```sql
select
```

The output is a read-only SELECT preview. It does not execute Supabase writes, does not create Auth users, does not seed predictions, does not require service-role credentials and does not create Migration 019.

The output intentionally exposes boundary flags such as:

```text
read_only_select_preview
writes_database
creates_users
seeds_predictions
requires_service_role
creates_migration
combines_competitions
original_competition_key
ko_predictor_competition_key
```

Those fields are evidence only. They do not mutate staging data.

## Hard safety boundary

Stage 16A-P4 is constrained as follows:

```text
No users created.
No profiles created.
No provisional teams written.
No prediction bundles written.
No leagues written.
No scoring runs.
No correction rehearsal writes.
No service-role credential use.
No Supabase write calls.
No UI route changes.
No resolver changes.
No scoring changes.
No database migration.
active migrations remain 18 and Migration 019 must not exist.
```

## Competition boundary

Original Predictor and KO Predictor remain separate.

The preview exposes both keys separately:

```text
original
ko_predictor
```

It also exposes:

```text
combines_competitions = false
```

No Original points and KO Predictor points are added together.

## Production guard

The local model still fails closed against WC26 production.

The generator accepts an optional project reference argument for testing:

```bash
npm run stage16a:p4:sql:dry-run -- --project-ref=gcfdwobpnanjchcnvdco
```

Any WC26 production project reference is rejected before SQL text is produced.

## Acceptance gates

```bash
npm run audit:stage16a-scope-alignment
npm run audit:stage16a-p1-synthetic-identity
npm run audit:stage16a-p2-staging-effective-time
npm run audit:stage16a-p3-seed-manifest
npm run audit:stage16a-p4-seed-dry-run-sql
npm run audit:tooling-wiring
npm run audit:governance-coherence
npm run audit:marker-hygiene

npm test -- \
  scripts/__tests__/stage16aSeedDryRunSql.test.js \
  scripts/__tests__/stage16aSeedManifest.test.js \
  scripts/__tests__/stage16aStagingEffectiveTime.test.js \
  scripts/__tests__/stage16aSyntheticIdentity.test.js \
  src/timePhase/__tests__/timePhaseModel.test.js

npm run check
npm run build
npm run verify:foundation-page
```

## Next allowed work

After Stage 16A-P4, the next package may prepare a narrow staging-only seed executor preflight, but the first real write path must remain separately approved and must not combine Auth user creation, profile rows, prediction rows, league rows, corrections, scoring and teardown into one oversized package.

## Stage 16A-P5 follow-on

16A-P5 — Staging write preflight and teardown contract is the accepted follow-on no-write preflight. It consumes the P3 manifest and P4 SQL preview evidence, records `canStartWrite: false`, `requiresExplicitNextSliceApproval: true`, local environment variable names only, dual synthetic teardown markers, zero-residue assertion and reseed validation while still avoiding database writes, Auth user creation, prediction seeding, service-role credential use and Migration 019.
