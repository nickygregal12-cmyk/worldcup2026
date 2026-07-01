# Testing

## Unit tests

Vitest protects the Euro prediction, locking, result, scoring, tournament configuration, application clock, foundation and canonical tournament resolver contracts.

```bash
npm test
```

For watch mode:

```bash
npm run test:watch
```

The Stage 5 suite contains 146 tests across 21 files.

## Prediction contracts

```bash
npm run audit:contracts
```

This verifies the global prediction-content lock, separate per-match joker timing, scoped grace, separate penalty shoot-out data and central provisional scoring configuration.

## Prediction database implementation

```bash
npm run audit:db-design
```

This verifies Migration 005, its four required tables, RLS, unresolved joker caps, the absence of browser write policies and grants, browser-only guest storage and the deferred save RPC.

## Canonical tournament resolver

```bash
npm run audit:resolver
```

This verifies:

- one versioned resolver;
- separate guest, predicted and live contexts;
- six groups and 36 group fixtures;
- 15 knockout matches;
- all 15 best-third combinations;
- exact parity between the runtime matrix and Migration 004;
- provisional tie-break status;
- no inherited WC26 bracket import;
- no database writes in resolver code.

Unit coverage includes group statistics, recursive head-to-head handling, provisional tie fallbacks, best-third ranking, every allocation combination, official knockout sources, advancing-team propagation and mixed-context rejection.

## Guest/explore foundation

```bash
npm run audit:guest
```

This verifies:

- a 51-row browser-only guest state;
- 36 group and 15 knockout drafts;
- the versioned local-storage key and portable bundle format;
- guest-only resolver context;
- no account identity in exports;
- no Supabase import, database write or network persistence in guest modules;
- guest storage remains server-free after Migration 006.

Unit coverage includes partial drafts, local-storage failures, bundle round-trips, reference mismatches, completeness tracking and stale knockout decisions.


## Authentication and profiles

```bash
npm run audit:auth
npm run audit:scoring-correction
```

This verifies:

- Migrations 006 and 007, including the Auth-linked `profiles` table and explicit function privilege hardening;
- display-name validation and case-insensitive uniqueness;
- the Auth profile-creation trigger;
- owner-only profile RLS;
- controlled profile RPC execution grants;
- persistent browser Auth configuration;
- retention of browser-only guest state;
- absence of the prediction save RPC.

Unit coverage includes validation, availability checks, sign-up metadata, sign-in, recovery, password updates, owner profile reads and controlled profile renames.

## Database integration tests

After a local Supabase reset:

```bash
npm run test:db:005:local
npm run test:db:006:local
npm run test:db:008:local
```

Against the verified Euro staging project:

```bash
npm run test:db:005:linked
npm run test:db:006:linked
npm run test:db:008:linked
```

Migration 005 retains 31 pgTAP checks. The Stage 5 profile suite runs 39 pgTAP checks for structure, RLS, trigger behaviour, validation, controlled updates, explicit RPC grants and safe default privileges for future functions. Migration 008 adds 7 focused checks for the canonical provisional ruleset and both unresolved joker caps.

## Inherited application boundary

```bash
npm run audit:legacy
```

This verifies that the active Euro entrypoint cannot reach quarantined WC26 pages, components, stores or write paths. Canonical resolver files are protected Euro logic rather than quarantined legacy files.

## Linting

```bash
npm run lint:foundation
```

The strict scope includes all active Euro contracts, resolver and guest-foundation code while inherited WC26 files remain quarantined.

## Build

```bash
npm run build
```

## Full local code gate

```bash
npm run check
```

This runs database safety, legacy isolation, prediction contract audits, database-design audit, resolver audit, guest-foundation audit, authentication audit, scoring-correction audit, foundation lint, all unit tests and the production build.
