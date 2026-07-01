# Testing

## Unit tests

Vitest protects the Euro prediction, locking, result, scoring, tournament configuration, application clock and foundation contracts.

```bash
npm test
```

For watch mode:

```bash
npm run test:watch
```

The current suite contains 65 tests.

## Prediction contracts

```bash
npm run audit:contracts
```

This verifies the global prediction-content lock, separate per-match joker timing, scoped grace, separate penalty shoot-out data and central provisional scoring configuration.

## Prediction database implementation

```bash
npm run audit:db-design
```

This verifies that the active fifth migration is the revised Migration 005, all four required tables exist in SQL, RLS is enabled, exact joker caps remain unresolved, no browser write policy or grant exists, guest storage is absent and the final save RPC remains deferred.

## Database integration tests

After a local Supabase reset:

```bash
npm run test:db:005:local
```

After Migration 005 is pushed to the verified Euro staging project:

```bash
npm run test:db:005:linked
```

The pgTAP file contains 31 checks covering tables, columns, RLS, privileges, policies, seeded ruleset values, active ruleset linkage, the absence of a save RPC, locked-ruleset immutability, monotonic global locking and the absence of guest server storage.

## Inherited application boundary

```bash
npm run audit:legacy
```

This verifies that the active Euro entrypoint cannot reach quarantined WC26 pages, components, stores or write paths.

## Linting

```bash
npm run lint:foundation
```

The inherited WC26 project has a large pre-existing full-project lint backlog. The strict foundation scope prevents active Euro work from adding to it.

## Build

```bash
npm run build
```

## Full local code gate

```bash
npm run check
```

This runs database safety, legacy isolation, contract audits, implementation audit, foundation lint, all unit tests and the production build. The Docker-backed local reset and pgTAP run remain separate required database gates.

## Required contract outcomes

The combined tests must continue to prove that:

- submit is reversible and does not copy rows or affect eligibility;
- saved but unsubmitted predictions remain valid at lock;
- prediction content locks globally;
- joker movement locks at each target match kick-off;
- grace is one user plus one unstarted match and expires automatically;
- scoring and joker values come from one versioned ruleset;
- locked rulesets cannot be silently changed;
- the persisted global lock cannot be reopened;
- guest mode has no server-side storage;
- Migration 005 grants no direct browser writes;
- the final atomic save route is still absent.
