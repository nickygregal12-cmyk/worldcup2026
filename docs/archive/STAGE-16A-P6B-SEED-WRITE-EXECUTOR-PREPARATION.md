> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 16A-P6B — Seed write executor preparation only

Date: 2026-07-06
Status: accepted as a no-write preparation, model, test, audit and documentation package
Scope: local model, tests, audit and documentation only

## Purpose

This package completes **Stage 16A-P6B — Seed write executor preparation only**.

It prepares the structure and acceptance boundaries for a future P6C write-capable executor without creating that executor in this package. It does not execute Supabase writes, does not create Auth users, does not seed predictions, does not read or print service-role credentials and does not create Migration 019.

The executor-preparation version is:

```text
stage16a-seed-write-executor-preparation-v1
```

The allowed branch remains:

```text
euro28-development
```

The allowed Euro staging project remains:

```text
gcfdwobpnanjchcnvdco
```

The blocked WC26 production project reference remains:

```text
ouhxawizadnwrhrjppld
```

## Hard no-write flags

Stage 16A-P6B is still no-write by design:

```text
writesDatabase: false
createsUsers: false
createsProfiles: false
seedsProvisionalTeams: false
seedsPredictions: false
seedsLeagues: false
usesServiceRoleCredential: false
readsServiceRoleCredential: false
envValuesRead: false
envValuesPrinted: false
canStartWrite: false
hasWriteExecutor: false
exposesWriteCommand: false
generatesSql: false
requiresExplicitNextSliceApproval: true
```

There is no `stage16a:p6b` command and no write-capable executor in this package.

## What changed

Stage 16A-P6B adds:

```text
scripts/lib/stage16aSeedWriteExecutorPreparation.mjs
scripts/__tests__/stage16aSeedWriteExecutorPreparation.test.js
scripts/check-stage16a-p6b-write-executor-preparation.mjs
docs/STAGE-16A-P6B-SEED-WRITE-EXECUTOR-PREPARATION.md
```

It wires:

```text
audit:stage16a-p6b-write-executor-preparation
```

## Planned executor modules for future P6C

P6B records the future executor module shape only. Each module is explicitly non-executable in P6B.

```text
context_guard
synthetic_user_writer
provisional_team_writer
prediction_seed_writer
league_seed_writer
seed_validator
synthetic_teardown
reseed_validator
```

Every planned module has:

```text
executableInP6B: false
```

## Blocked P6B commands

P6B must not expose these write-capable command names:

```text
stage16a:p6b:write
stage16a:p6b:seed
stage16a:p6b:teardown
stage16a:p6b:reseed
stage16a:p6b:execute
```

## Exact required local environment names

A later approved write slice must require these local environment names:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STAGE16A_ALLOW_STAGING_SEED_WRITE
STAGE16A_SEED_TEARDOWN_CONFIRMATION
```

P6B records names only. It does not read, validate or print values.

## Exact write enablement flags for a later slice

The later write slice must require both exact values before any write path exists:

```text
STAGE16A_ALLOW_STAGING_SEED_WRITE=true
STAGE16A_SEED_TEARDOWN_CONFIRMATION=I_UNDERSTAND_STAGE16A_SYNTHETIC_TEARDOWN_ONLY
```

Those values are not read by P6B. They are a future-slice acceptance contract only.

## Exact synthetic markers

All future synthetic data must carry both markers:

```text
@synthetic.euro28.test
synthetic_euro28: true
```

Email domain alone is not enough. Metadata marker alone is not enough.

## Exact teardown selector

Future teardown is only acceptable when the selector requires both markers:

```text
email ends with @synthetic.euro28.test AND metadata.synthetic_euro28 is true
```

Single-marker teardown is refused.

The selector must protect:

```text
real accounts
real administrators
tournament configuration
staging controls
non-synthetic prediction data
non-synthetic league data
```

## Exact zero-residue and reseed proof

P6B carries forward the P6A zero residue and reseed proof.

After teardown and before reseed, every P6A zero-residue target must prove zero synthetic residue. Zero residue is mandatory before reseed.

The future accepted rehearsal sequence remains:

```text
approve_p6c_write_executor
refuse_before_secret_read
load_local_secrets_without_logging
seed_dual_marker_synthetic_only
validate_first_seed
teardown_dual_marker_synthetic_only
prove_zero_residue
reseed_same_manifest
```

The first seed and the reseed must both prove the same manifest counts:

```text
19 synthetic personas
24 provisional team slots
11 resettable time-phase cases
3 league shapes
0 duplicate synthetic rows after reseed
```

Original Predictor and KO Predictor validation must remain separate. Original Predictor and KO Predictor remain separate. Original + KO points must never be combined.

## Refusal rules for the future P6C executor

A later write slice must refuse before any service-role credential is read when any of these are true:

```text
current branch is main or master
current branch is not euro28-development
project ref is ouhxawizadnwrhrjppld
project ref is anything except gcfdwobpnanjchcnvdco
STAGE16A_ALLOW_STAGING_SEED_WRITE is not exactly true
STAGE16A_SEED_TEARDOWN_CONFIRMATION does not exactly match I_UNDERSTAND_STAGE16A_SYNTHETIC_TEARDOWN_ONLY
teardown selector uses email-domain-only matching
teardown selector uses metadata-only matching
any secret value would be printed, logged or committed
future P6C write executor is not explicitly approved
```

## Hard safety boundary

Stage 16A-P6B is constrained as follows:

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
No SQL generation.
No write executor.
No write-capable npm command.
No UI route changes.
No resolver changes.
No scoring changes.
No database migration.
active migrations remain 18 and Migration 019 must not exist.
```

## Acceptance gates

```bash
npm run audit:stage16a-scope-alignment
npm run audit:stage16a-p6a-write-acceptance-plan
npm run audit:stage16a-p6b-write-executor-preparation
npm run audit:tooling-wiring
npm run audit:governance-coherence
npm run audit:marker-hygiene
npm run check
```

## Closing statement

Stage 16A-P6B is a preparation stage only. It records the future executor structure and the safety rules for the next explicitly approved P6C write-capable package. It does not create the executor, does not enable writes and does not open any service-role path.
