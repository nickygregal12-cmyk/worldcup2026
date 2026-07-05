# Stage 16A-P1 — Privacy-safe Synthetic Identity Plumbing

## Status

This package completes **Stage 16A-P1 — Privacy-safe synthetic identity plumbing** as a local catalogue, guard and audit package only.

It does not create Auth users, seed predictions, seed leagues, write to Supabase, change product components, expose privileged identity records, alter scoring, alter resolver logic, add routes, change database policies or create a migration.

## Scope boundary

P1 prepares the deterministic synthetic identity contract that later Stage 16A seed scripts may use. The later seed scripts must still prove their own Euro-staging fail-closed behaviour before writing anything.

P1 is deliberately limited to:

- one canonical local persona catalogue;
- one reserved synthetic email domain;
- one required metadata marker;
- one Euro staging project guard;
- one explicit WC26 production block;
- unit tests and repository audit markers.

## Required project boundary

- Euro staging project: `gcfdwobpnanjchcnvdco`.
- Blocked WC26 production project: `ouhxawizadnwrhrjppld`.
- Any Stage 16A synthetic identity plan must refuse any project ref except Euro staging.
- WC26 production must be rejected with a specific fail-closed error.

## Reserved synthetic identity markers

Every later seeded synthetic account must carry both markers:

1. Email domain: `@synthetic.euro28.test`.
2. User metadata marker: `synthetic_euro28: true`.

The future teardown must require both markers before deleting anything. Email domain alone is not enough. Metadata marker alone is not enough.

## Approved deterministic persona catalogue

The catalogue remains exactly nineteen personas:

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

Each persona maps to a deterministic synthetic email using its key, for example `exact_score_heavy@synthetic.euro28.test`.

## Privacy rules

The P1 catalogue is not a player-facing identity model. It must not decide the future production offline-player or managed-participant model.

The later player-facing treatment may expose only a privacy-safe synthetic badge or `is_synthetic` style flag where required for staging acceptance. It must not expose email addresses, raw Auth metadata, service-role data or privileged identity records to ordinary users.

## Competition rules

Original Predictor and KO Predictor stay separate in the persona catalogue and all later seeded evidence.

The catalogue may describe which competitions a persona participates in, but it must not create combined totals, blended leaderboards or cross-competition scoring evidence.

## Explicit non-goals

This package does not include:

- Supabase Admin API calls;
- service-role credential handling;
- Auth user creation;
- profile row creation;
- prediction seeding;
- league seeding;
- result correction rehearsal;
- score oracle implementation;
- teardown implementation;
- UI badges or component changes;
- database functions, policies or migrations.

Active migrations remain 18 and Migration 019 must not exist.

## Acceptance checks

`audit:stage16a-p1-synthetic-identity` proves:

- the P1 doc exists and records the privacy boundary;
- the canonical catalogue has exactly nineteen personas;
- every key matches the Stage 16A approved list;
- every email uses `@synthetic.euro28.test`;
- every persona carries `synthetic_euro28: true`;
- teardown guards require both reserved markers;
- the tooling refuses WC26 production and any non-Euro staging project;
- package scripts wire the audit into `npm run check`;
- active migrations remain 18 and Migration 019 is absent.

## Next package

Stage 16A-P2 — Staging-effective database time is the next precondition after P1. Once P2 is accepted, the full seeded-cast implementation should still be split into small staging-only slices rather than delivered as one oversized batch.
