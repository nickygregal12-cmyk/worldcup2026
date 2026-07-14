> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage 16A-P3 — Seed manifest dry-run

## Status

This package completes **Stage 16A-P3 — Seed manifest dry-run** as a manifest dry-run only.

It does not create Auth users, does not write to Supabase, does not seed predictions, does not create profiles, does not create leagues, does not create provisional teams, does not touch fixture or result rows, does not run scoring, does not require service-role credentials, does not change product components, does not change resolver logic, does not change routes and does not create a migration.

The purpose is to freeze the local dry-run manifest that later Stage 16A implementation slices must follow before any staging write path exists.

## Manifest identity

```text
stage16a-seed-manifest-dry-run-v1
```

The manifest is intentionally a planning artefact and local model only. It proves the intended shape can be validated, counted, failed closed and wired into the normal check chain before any database operation is allowed.

## Required project boundary

- Euro staging project: `gcfdwobpnanjchcnvdco`.
- Blocked WC26 production project: `ouhxawizadnwrhrjppld`.
- The dry-run manifest must refuse any project ref except Euro staging.
- WC26 production must fail closed with a specific blocked-project error.

## Planned dry-run scope

The manifest records these planned groups without writing them:

1. 24 provisional team slots.
2. 19 synthetic personas.
3. Synthetic profile rows for the same 19 personas.
4. Original Predictor prediction-bundle coverage derived from the persona catalogue.
5. KO Predictor prediction-bundle coverage derived from the persona catalogue.
6. Three synthetic private-league shapes.
7. 11 resettable time-phase cases from Stage 16A-P2.
8. One correction scenario marker.
9. Dual-marker teardown selectors.

The dry-run operation list uses only `dry_run_only` write modes and every operation has `wouldWrite: false`.

## Provisional team slot rules

P3 uses 24 synthetic provisional team slots rather than real football teams.

The slots are deliberately neutral:

```text
team_a1 team_a2 team_a3 team_a4
team_b1 team_b2 team_b3 team_b4
team_c1 team_c2 team_c3 team_c4
team_d1 team_d2 team_d3 team_d4
team_e1 team_e2 team_e3 team_e4
team_f1 team_f2 team_f3 team_f4
```

Each slot is marked provisional and dry-run only. The exact group shape is six groups with four slots each. This avoids pretending that current qualification is official and keeps Stage 17 free to replace provisional entries through the approved official-data path.

## Synthetic persona rules

The manifest consumes the already-approved Stage 16A-P1 catalogue of 19 synthetic personas.

Every future account operation remains bound to both reserved markers:

- email domain: `@synthetic.euro28.test`;
- metadata marker: `synthetic_euro28: true`.

Email domain alone is not enough. Metadata marker alone is not enough. Future teardown must require both. The future acceptance rehearsal remains seed → validate → teardown → zero residue → reseed.

## Time-phase rules

The manifest consumes the Stage 16A-P2 catalogue of 11 resettable time-phase cases.

It does not apply the irreversible real global prediction lock. Simulated post-lock evidence remains a resettable application-time view through the existing Time & Phase control.

## League dry-run shapes

The manifest records three league shapes:

```text
large_table
tiny_h2h
multi_league_check
```

Together they cover:

- one large league with at least fourteen members;
- one tiny league with two or three members;
- at least one multi-league persona;
- at least one no-league persona.

The league shapes carry both Original Predictor and KO Predictor evidence, but the two competitions remain separate.

## Competition boundary

Original Predictor and KO Predictor remain separate.

The manifest may plan evidence for both competitions, but it must not create combined totals, blended leaderboards, shared scoring rows or cross-competition winner evidence.

## Explicit non-goals

This package does not include:

- Supabase Admin API calls;
- service-role credential handling;
- Auth user creation;
- profile row creation;
- provisional team insertion;
- prediction insertion;
- league insertion;
- result insertion;
- correction execution;
- scoring-oracle implementation;
- teardown execution;
- UI badges or component changes;
- database functions, policies or migrations.

Active migrations remain 18 and Migration 019 must not exist.

## Acceptance checks

`audit:stage16a-p3-seed-manifest` proves:

- the P3 doc exists and records the dry-run-only boundary;
- the manifest includes 24 provisional team slots across six groups;
- the manifest consumes the 19-persona Stage 16A-P1 catalogue;
- the manifest consumes the 11-case Stage 16A-P2 effective-time catalogue;
- large, tiny, multi-league and no-league membership evidence is planned;
- every dry-run operation has `wouldWrite: false` and `dry_run_only` mode;
- no service-role credential is required for this package;
- WC26 production fails closed;
- Original Predictor and KO Predictor remain separate;
- active migrations remain 18 and Migration 019 is absent.

## Next package

After Stage 16A-P3, the next package may begin a narrow staging-only implementation slice. It should still avoid combining provisional teams, Auth user creation, profile writes, prediction writes, league writes, scoring oracle, correction rehearsal and teardown into one oversized package.

A sensible next slice is a local seed SQL or command manifest generator that still prints planned operations and checks local environment guards before any write command exists.


## Stage 16A-P4 follow-on

16A-P4 — Seed SQL preview dry-run is the accepted follow-on read-only SQL preview package. It consumes this manifest to print SELECT-only evidence and still avoids database writes, Auth user creation, prediction seeding, service-role credential use and Migration 019.

## Stage 16A-P5 follow-on

16A-P5 — Staging write preflight and teardown contract is the accepted follow-on no-write preflight. It records `canStartWrite: false`, `requiresExplicitNextSliceApproval: true`, local environment variable names only, dual synthetic teardown markers, zero-residue assertion and reseed validation while still avoiding database writes, Auth user creation, prediction seeding, service-role credential use and Migration 019.
