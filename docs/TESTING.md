# Testing

## Unit tests

Vitest protects pure tournament logic. Coverage includes the Euro prediction and result contracts, tournament configuration, the controllable application clock and the Euro foundation data summary.

```bash
npm test
```

For watch mode:

```bash
npm run test:watch
```

## Prediction contract

```bash
npm run audit:contracts
```

This verifies the one-lock model, separate penalty shoot-out data, the absence of inherited joker or league-specific lock behaviour, and that every calculator reads the provisional point values from the single central scoring configuration.

## Inherited application boundary

```bash
npm run audit:legacy
```

This verifies that the active Euro entrypoint cannot reach quarantined WC26 pages, components, stores or write paths.

## Linting

```bash
npm run lint:foundation
```

The inherited WC26 project currently has thousands of full-project lint errors. The strict foundation lint scope prevents new code from adding to that backlog. Full lint remains available with `npm run lint` and will be reduced in planned cleanup batches.

## Build

```bash
npm run build
```

## Continuous integration

GitHub Actions runs foundation lint, unit tests and the production build on pull requests and pushes to `euro28-development`.

## Prediction database design

```bash
npm run audit:db-design
```

This verifies that Migration 005 has not been created prematurely, the design
uses the three agreed tables, the browser cannot write directly to them, the
database clock controls the one global lock, scoring values remain versioned in
one ruleset, and future saves use an atomic bundle with optimistic revision.

## Reconciled contract tests

The contract suite must prove:

- submit does not copy rows or affect eligibility;
- prediction content locks globally;
- joker movement locks at each target match kick-off;
- grace works only before both its expiry and the target match kick-off;
- joker values come from the central provisional scoring configuration;
- guest mode has no server-side storage;
- the revised Migration 005 blueprint remains non-executable and no active fifth migration exists.
