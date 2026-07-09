> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 16A-P6A — Seed write acceptance plan only

Date: 2026-07-05
Status: accepted as a docs/audit/test-only acceptance plan
Scope: local model, tests, audit and documentation only

## Purpose

This package completes **Stage 16A-P6A — Seed write acceptance plan only**.

It defines the exact acceptance contract that a later explicitly approved staging seed write slice must satisfy before any real staging write happens. It does not execute Supabase writes, does not create Auth users, does not seed predictions, does not read or print service-role credentials and does not create Migration 019.

The acceptance-plan version is:

```text
stage16a-seed-write-acceptance-plan-v1
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

Stage 16A-P6A is still no-write by design:

```text
writesDatabase: false
createsUsers: false
seedsPredictions: false
usesServiceRoleCredential: false
readsServiceRoleCredential: false
envValuesRead: false
envValuesPrinted: false
canStartWrite: false
hasWriteExecutor: false
requiresExplicitNextSliceApproval: true
```

There is no `stage16a:p6a` write command and no write-capable executor in this package.

## What changed

Stage 16A-P6A adds:

```text
scripts/lib/stage16aSeedWriteAcceptancePlan.mjs
scripts/__tests__/stage16aSeedWriteAcceptancePlan.test.js
scripts/check-stage16a-p6a-write-acceptance-plan.mjs
docs/STAGE-16A-P6A-SEED-WRITE-ACCEPTANCE-PLAN.md
```

It wires:

```text
audit:stage16a-p6a-write-acceptance-plan
```

## Exact required local environment names

A later approved write slice must require these local environment names:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STAGE16A_ALLOW_STAGING_SEED_WRITE
STAGE16A_SEED_TEARDOWN_CONFIRMATION
```

P6A records names only. It does not read, validate or print values.

## Exact write enablement flags for a later slice

The later write slice must require both exact values before any write path exists:

```text
STAGE16A_ALLOW_STAGING_SEED_WRITE=true
STAGE16A_SEED_TEARDOWN_CONFIRMATION=I_UNDERSTAND_STAGE16A_SYNTHETIC_TEARDOWN_ONLY
```

Those values are not read by P6A. They are a future-slice acceptance contract only.

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

## Exact zero-residue proof

After teardown and before reseed, every target must prove zero synthetic residue:

| Target | Selector | Expected after teardown |
|---|---|---:|
| `auth.users` | dual synthetic markers | 0 |
| `public.profiles` | synthetic auth user ids | 0 |
| `public.prediction_sets` | synthetic auth user ids | 0 |
| `public.match_predictions` | synthetic prediction set ids | 0 |
| `public.bracket_predictions` | synthetic prediction set ids | 0 |
| `public.prediction_match_points` and `public.prediction_bracket_points` | synthetic prediction set ids | 0 |
| `public.prediction_totals` | synthetic auth user ids | 0 |
| `public.leagues` and `public.league_members` | synthetic owner/member user ids and Stage 16A league names | 0 |
| `public.tournament_teams` synthetic Stage 16A slots | synthetic Stage 16A team-slot marker | 0 |

Zero residue is mandatory before reseed.

## Exact reseed validation proof

The later accepted rehearsal sequence must be:

```text
refuse unsafe context
confirm local env names
confirm write enablement flags
seed synthetic only
validate first seed
teardown synthetic only
prove zero residue
reseed same manifest
validate reseed
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

## Refusal rules

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
```

## Hard safety boundary

Stage 16A-P6A is constrained as follows:

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
No write executor.
No UI route changes.
No resolver changes.
No scoring changes.
No database migration.
active migrations remain 18 and Migration 019 must not exist.
```

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

After Stage 16A-P6A, a later package may consider a default-off write-capable skeleton only if Nicky/Jenna explicitly approves that future slice.

That later package must still fail closed by default, must not commit or print service-role credentials, must not touch WC26 production/main, and must not bundle the entire seed, scoring, correction and teardown workflow into one oversized package.

## Stage 16A-P6B forward pointer

16A-P6B — Seed write executor preparation only is the next no-write preparation slice after this acceptance plan. It may record planned executor modules and blocked command names, but it must remain no-write preparation with `writesDatabase: false`, `canStartWrite: false`, `hasWriteExecutor: false`, no database writes, no user creation, no prediction seeding and no Migration 019.
