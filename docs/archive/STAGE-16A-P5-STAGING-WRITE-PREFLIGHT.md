> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 16A-P5 — Staging write preflight and teardown contract

Date: 2026-07-05
Status: accepted as a guarded no-write preflight scaffold
Scope: local model, report generator, tests, audit and documentation only

## Purpose

This package completes **Stage 16A-P5 — Staging write preflight and teardown contract**.

It prepares the local preflight contract that a later staging seed write slice must satisfy before any live write path is allowed. It does not execute Supabase writes, does not create Auth users, does not seed predictions, does not read or print service-role credentials and does not create Migration 019.

The hard flags are:

```text
canStartWrite: false
requiresExplicitNextSliceApproval: true
```

The preflight version is:

```text
stage16a-staging-write-preflight-v1
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

Stage 16A-P5 adds:

```text
scripts/lib/stage16aSeedWritePreflight.mjs
scripts/generate-stage16a-p5-write-preflight.mjs
scripts/__tests__/stage16aSeedWritePreflight.test.js
scripts/check-stage16a-p5-write-preflight.mjs
```

It also wires:

```text
audit:stage16a-p5-write-preflight
stage16a:p5:write-preflight
```

## Required local environment names

The preflight records the environment variable names that a later explicitly approved write slice must provide locally:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STAGE16A_ALLOW_STAGING_SEED_WRITE
STAGE16A_SEED_TEARDOWN_CONFIRMATION
```

P5 records names only. It does not read, validate or print secret values.

## Teardown contract

Future teardown must require both synthetic markers:

```text
@synthetic.euro28.test
synthetic_euro28: true
```

Email domain alone is not enough. Metadata marker alone is not enough.

The confirmation phrase recorded for a future write/teardown slice is:

```text
I_UNDERSTAND_STAGE16A_SYNTHETIC_TEARDOWN_ONLY
```

Future acceptance must preserve this sequence:

```text
seed
validate
teardown
zero residue
reseed
validate again
```

Real accounts, real administrators, tournament configuration, staging controls and non-synthetic data must remain untouched.

## Hard safety boundary

Stage 16A-P5 is constrained as follows:

```text
No users created.
No profiles created.
No provisional teams written.
No prediction bundles written.
No leagues written.
No scoring runs.
No correction rehearsal writes.
No service-role credential use.
No service-role credential reading.
No service-role credential printing.
No Supabase write calls.
No UI route changes.
No resolver changes.
No scoring changes.
No database migration.
active migrations remain 18 and Migration 019 must not exist.
```

## Competition boundary

Original Predictor and KO Predictor remain separate.

The preflight carries both competition keys separately:

```text
original
ko_predictor
```

It also carries:

```text
combinesCompetitions: false
```

No Original points and KO Predictor points are added together.

## Production guard

The local model still fails closed against WC26 production.

The generator accepts an optional project reference argument for testing:

```bash
npm run stage16a:p5:write-preflight -- --project-ref=gcfdwobpnanjchcnvdco
```

Any WC26 production project reference is rejected before the report is produced.

## Acceptance gates

```bash
npm run audit:stage16a-scope-alignment
npm run audit:stage16a-p1-synthetic-identity
npm run audit:stage16a-p2-staging-effective-time
npm run audit:stage16a-p3-seed-manifest
npm run audit:stage16a-p4-seed-dry-run-sql
npm run audit:stage16a-p5-write-preflight
npm run audit:stage16a-p6a-write-acceptance-plan
npm run audit:tooling-wiring
npm run audit:governance-coherence
npm run audit:marker-hygiene

npm run stage16a:p5:write-preflight

npm test -- \
  scripts/__tests__/stage16aSeedWriteAcceptancePlan.test.js \
  scripts/__tests__/stage16aSeedWritePreflight.test.js \
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

16A-P6A — Seed write acceptance plan only is the accepted follow-on docs/audit/test-only package. It records `writesDatabase: false`, `canStartWrite: false`, `hasWriteExecutor: false`, exact local environment names, exact later-slice write flags, exact synthetic markers, exact teardown selector, zero-residue proof and reseed validation proof while still avoiding database writes, Auth user creation, prediction seeding, service-role credential use and Migration 019.

After Stage 16A-P6A, the next package may consider a default-off write-capable skeleton, but only with explicit approval. It must not bundle Auth user creation, profile rows, provisional teams, predictions, leagues, corrections, scoring oracle and teardown into one oversized package.
