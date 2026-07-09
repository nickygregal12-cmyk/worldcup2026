> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Euro 2028 Predictor — Stage 13F-K3
## Staging acceptance and complete Admin operations close-out

## Status

Acceptance-and-close-out package from verified checkpoint `c4342f1`. This batch adds no product UI, runtime capability, database object or migration. It proves the accepted K1/K2 Admin backbone against the deployed Euro staging environment, records the evidence boundary and closes Stage 13F-K before Stage 13G-A.

## Fixed boundaries

- Branch: `euro28-development`.
- Starting commit: `c4342f1`.
- Permitted Supabase project: `gcfdwobpnanjchcnvdco`.
- Blocked WC26 project: `ouhxawizadnwrhrjppld`.
- Active migrations: 18 locally and on Euro staging.
- Migration 019: must not exist.
- Original Predictor and KO Predictor totals remain separate.
- The real irreversible global lock must not be triggered.
- No invented kick-off time may be written to shared staging.
- Tournament Picks remains a Stage 17A execution dependency.

## Acceptance identities

K3 uses three distinct real staging accounts:

1. one active `owner`;
2. one active `results_admin`;
3. one ordinary signed-in member with no active Admin assignment.

Emails are supplied only to local generators and SQL Editor sessions. They are never committed. Existing audited grant/revoke tooling remains the only role-assignment path.

## Transactional database evidence

`npm run admin:stage13fk3:sql` generates a guarded `role-transaction` SQL file. It:

- verifies the project/tournament boundary and all three account roles;
- selects one existing scheduled/postponed pending fixture;
- reuses that fixture's persisted date, kick-off, venue and schedule status;
- proves results administrators can read fixtures, venues and readiness but cannot edit fixture scheduling or run complete reconciliation;
- proves an ordinary member receives no Admin access;
- proves the owner can perform the same-value optimistic fixture operation;
- proves stale fixture revision rejection;
- proves owner-only complete reconciliation and separate competition totals inside the same transaction;
- rolls back the fixture revision, audit events, scoring run and totals;
- verifies the exact persisted fixture state and event counts after rollback.

The script contains no generated timestamp, no direct table mutation outside the rollback transaction, no global-lock call and no service-role secret.

## Deployed role walkthrough

Use only `https://euro28-predictor-dev.netlify.app`.

### Signed out

- `#/admin` must fail closed and return the public product shell without revealing control-room content.
- More must not list Admin.

### Ordinary member

- More must not list Admin.
- Direct `#/admin` navigation must fail closed.
- No fixture, result, safeguard or scoring operation must be exposed.

### Results administrator

- More → Admin must be present after a fresh sign-in.
- The control room must identify `results_admin`.
- Existing result entry/correction, match-status and one-match recalculation controls remain available.
- Fixture scheduling is visible as read-only and must not show `Save fixture schedule`.
- Complete tournament reconciliation must not show its action control.
- Readiness, Tournament Picks hand-off and append-only audit detail remain readable.
- The irreversible global lock must not be applied merely to test access.

### Owner

- More → Admin must be present after a fresh sign-in.
- The control room must identify `owner`.
- Fixture schedule controls, revision, selected venue timezone and validation are visible.
- Results, safeguards, Time & Phase, Team Profiles and existing operations remain available.
- Readiness and Tournament Picks state are readable.
- Audit filtering exposes fixture and scoring categories with expandable payload detail.
- No fixture save is required in the browser because the database operation is proved transactionally and rolled back.

## Acceptance remediation discovered during deployed walkthrough

The first Results Admin walkthrough proved that result entry reaches the canonical database operation, but it also exposed three browser-layer issues that must be corrected before close-out:

- a successful result refresh remounted the result workspace and immediately showed the empty audit-note validation message, making success look like failure;
- an unchanged canonical result could be submitted as another correction revision when only the audit note changed;
- several Admin operation buttons rendered without the established design-system action styles.

The staging test correction used the same canonical values as the previous revision. The previous snapshot, saved snapshot and current match state were identical, so no result restoration was required. The append-only revision and audit event remain valid evidence.

The K3 remediation therefore:

- preserves the selected result/fixture workspace across ordinary data refreshes and resets cleanly only when the canonical server snapshot changes;
- shows validation errors only after the relevant form has been edited;
- blocks unchanged result corrections and unchanged fixture schedule saves;
- applies existing primary, secondary and danger action styles to Admin operations;
- adds focused model and presentation regression tests;
- adds no migration and changes no database contract.

The Results Admin and owner walkthroughs, real reconciliation and close-out gates must be rerun after the remediation is deployed.

## Real reconciliation acceptance

The owner performs one real complete reconciliation through the deployed control room using this exact note:

```text
Stage 13F-K3 complete staging reconciliation acceptance
```

This is a safe replacement-based staging recovery operation. It must create:

- one completed canonical scoring run;
- one append-only `tournament_points_reconciled` event with the exact note;
- separate `original` and `ko_predictor` totals only;
- no combined competition total.

The generated `reconciliation-verify` SQL is read-only and proves that event/run/totals relationship after the UI action.

## Required automated gates

- `npm run audit:admin-db-contract`;
- `npm run audit:admin-completion`;
- `npm run audit:admin-acceptance`;
- `npm run test:db:018:linked`;
- linked database lint with no errors;
- full `npm run check`;
- deployed `npm run verify:foundation-page`;
- 18-way local/remote migration alignment;
- clean local/origin alignment.

## Close-out result

After the Terminal gates, rollback proof, deployed role walkthroughs, real owner reconciliation and read-only verification all pass, Stage 13F-K is complete. The Euro control room then covers every approved launch/live operation without direct table editing, inherited WC26 tooling, unaudited recovery or Admin exposure to ordinary users.

Stage 13G-A — destinations and discovery — becomes the next implementation task. Stage 16A, Stage 17A and Stage 13P-A remain later and must not be pulled into this close-out.
