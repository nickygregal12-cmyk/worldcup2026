# Stage 16A Scope Alignment — Staging Seeded Acceptance Cast

## Status

This package is a **scope-alignment and launch-gate package only**.

It does not seed data, create users, change product components, change resolver logic, change scoring logic, alter routes, apply database policies or create a migration.

The purpose is to freeze the exact Stage 16A implementation boundary before any staging data or service-role tooling is written.

## Current return point

- Branch: `euro28-development`
- Latest known completed product commit before this scope package: `2e6f79b Compact Stage 13G league shell`
- Euro staging Supabase project: `gcfdwobpnanjchcnvdco`
- Blocked WC26 production project: `ouhxawizadnwrhrjppld`
- Active migrations before this package: 18
- Migration 019 must not exist in this package

## Stage 16A name

**Stage 16A — Provisional teams, synthetic users and deterministic scenario seeding**

Stage 16A is the first staging-seeded acceptance stage. Its role is to prove the app with a realistic, repeatable, deterministic cast before later official tournament data entry.

## Non-negotiable exclusions

Stage 16A must not be used as a back door for unrelated fixes.

Excluded from Stage 16A unless separately approved:

- component redesign;
- navigation redesign;
- resolver changes;
- scoring-rule changes;
- direct browser writes to protected tables;
- production or WC26 database access;
- committed service-role keys or local secrets;
- Migration 019 unless a genuine schema or read-contract gap is proved and separately packaged;
- combined Original Predictor / KO Predictor totals, standings or evidence;
- offline-player or managed-participant production identity decisions.

## Required staging fail-closed boundary

All Stage 16A scripts must refuse to run unless the target is the Euro staging project `gcfdwobpnanjchcnvdco`.

All Stage 16A scripts must explicitly fail closed against the blocked WC26 production project `ouhxawizadnwrhrjppld`.

Service-role credentials may be used only from local environment variables. They must never be printed, committed, copied into docs or embedded in generated artifacts.

## Stage 16A implementation split

### 16A-P1 — Privacy-safe synthetic identity plumbing

This precondition is approved before full seeding.

It may expose only an authorised `is_synthetic` style read flag and a subtle shared identity badge.

It must not expose email addresses, raw auth metadata, service-role data or browser-readable privileged identity records.

It must not decide the future production offline-player or managed-participant model.

### 16A-P2 — Staging-effective database time

This precondition is approved before full phase simulation.

It must allow Euro staging to exercise privacy, lock and release phases without applying the irreversible real global lock.

It must remain staging-only and must not change production tournament time semantics.

### 16A-P3 — Seed manifest dry-run

This precondition is approved before any staging write path exists.

It records the dry-run seed manifest only: 24 provisional team slots, 19 synthetic personas, three league shapes, 11 resettable time-phase cases, correction marker and dual-marker teardown selectors.

It must remain manifest dry-run only, with no database writes, no user creation, no prediction seeding, no service-role credential requirement, no scoring or resolver changes and no Migration 019.

### 16A-D1 — Provisional teams

The seeded provisional team dataset must contain exactly 24 teams.

Each row must include:

- team name;
- ISO code;
- group letter;
- `provisional: true`.

The five hosts and nineteen likely qualifiers are sufficient for staging acceptance because this is not the official Stage 17 tournament-data load.

The existing `TeamLabel` provisional treatment remains the only player-facing provisional-team indicator. Stage 17 must be able to replace provisional teams with confirmed teams without component or resolver changes.

### 16A-D2 — Synthetic persona catalogue

The approved persona catalogue contains exactly nineteen deterministic personas:

1. `exact_score_heavy`
2. `outcome_only`
3. `all_wrong`
4. `partial_predictions`
5. `no_predictions`
6. `submitted_complete`
7. `unsubmitted_identical`
8. `joker_cap_reached`
9. `zero_jokers`
10. `engineered_tie_a`
11. `engineered_tie_b`
12. `bracket_survives_deep`
13. `bracket_dead_early`
14. `ko_only`
15. `original_only`
16. `ko_advancing_only`
17. `ko_method_variant`
18. `ko_joker_variant`
19. `correction_sensitive`

Every synthetic account must use both reserved markers:

- email domain: `@synthetic.euro28.test`;
- metadata marker: `synthetic_euro28: true`.

The teardown must require both markers before deleting anything.

### 16A-D3 — Independent prediction/scoring oracle

The expected-points oracle must be independent.

It must not import frontend scoring helpers.

It must not import database scoring functions.

It must assert expected points for every persona across each Time & Phase preset, including the correction-sensitive before/after recalculation case.

Original Predictor and KO Predictor expected totals must be calculated, stored and asserted separately.

### 16A-D4 — Synthetic leagues

The seeded cast must include:

- one large league of approximately fourteen members;
- one tiny league of two or three members;
- one synthetic user in multiple leagues;
- at least one synthetic user in no league.

League evidence must prove both Original Predictor and KO Predictor standings while keeping the two competitions separate.

### 16A-D5 — Marker-safe teardown and reseed

The teardown script must delete exactly and only accounts and cascaded data carrying both synthetic markers.

The accepted rehearsal sequence is:

1. seed;
2. validate;
3. teardown;
4. assert zero residue;
5. reseed;
6. validate again.

Real accounts, real administrators, tournament configuration, staging controls and non-synthetic data must remain untouched.

## Acceptance evidence required before Stage 16A can close

Stage 16A can close only when there is recorded evidence for:

- provisional 24-team seed;
- all nineteen synthetic personas created with both reserved markers;
- deterministic Original Predictor and KO Predictor predictions seeded separately;
- persona expected-points assertions across phase presets;
- replacement scoring after a correction;
- large, tiny, multi-league and no-league membership cases;
- leaderboards, leagues, H2H, Match Centre, Bracket Health, profiles and player insight populated end to end;
- teardown, zero-residue assertion and clean reseed;
- WC26 production fail-closed proof;
- active migrations still 18 unless a separately approved migration package exists.

## Next package after this scope lock

The next implementation package after P1/P2/P3 should be a narrow staging-only implementation slice, not the full seeded cast in one oversized batch.

The full seeded-cast implementation should not begin until all three preconditions are either completed or deliberately re-sequenced in the governing documents.

## Stage 16A-P2 acceptance update

Stage 16A-P2 — Staging-effective database time is now accepted as a guarded planning, model and audit package. It proves that Stage 16A seeded acceptance must use the existing Time & Phase control for privacy, simulated-lock, release, correction-review and final-state evidence. The irreversible real global prediction lock is not applied. The package remains Euro-staging-only, blocks WC26 production, changes no product component, scoring rule, resolver, route or database policy, and creates no Migration 019.


## Stage 16A-P3 acceptance update

Stage 16A-P3 — Seed manifest dry-run is now accepted as a manifest dry-run only package. It records 24 provisional team slots, 19 synthetic personas, 11 resettable time-phase cases, three league shapes, correction marker and dual-marker teardown selectors before any staging write path exists. It includes no database writes, no user creation, no prediction seeding, no service-role credential requirement, no scoring or resolver change, no route change and no Migration 019. Original Predictor and KO Predictor remain separate.


## Stage 16A-P4 acceptance update

Stage 16A-P4 — Seed SQL preview dry-run is now accepted as a read-only SELECT preview package. It consumes the Stage 16A-P3 manifest dry-run and generates local SQL evidence for 24 provisional team slots, 19 synthetic personas, 11 resettable time-phase cases and three league shapes. It includes no database writes, no user creation, no prediction seeding, no service-role credential use, no scoring or resolver change, no UI route change and no Migration 019. Original Predictor and KO Predictor remain separate. Active migrations remain 18.
