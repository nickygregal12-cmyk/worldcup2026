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

The Stage 3 suite contains 109 tests across 14 files.

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

## Database integration tests

After a local Supabase reset:

```bash
npm run test:db:005:local
```

Against the verified Euro staging project:

```bash
npm run test:db:005:linked
```

The pgTAP file contains 31 checks for Migration 005. Stage 3 creates no Migration 006 and does not require another database push.

## Inherited application boundary

```bash
npm run audit:legacy
```

This verifies that the active Euro entrypoint cannot reach quarantined WC26 pages, components, stores or write paths. Canonical resolver files are protected Euro logic rather than quarantined legacy files.

## Linting

```bash
npm run lint:foundation
```

The strict scope includes all active Euro contracts and resolver code while inherited WC26 files remain quarantined.

## Build

```bash
npm run build
```

## Full local code gate

```bash
npm run check
```

This runs database safety, legacy isolation, prediction contract audits, database-design audit, resolver audit, foundation lint, all unit tests and the production build.
