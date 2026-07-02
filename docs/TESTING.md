# Testing

## Full code gate

```bash
npm run check
```

The gate runs database safety, every Euro audit, lint, unit tests and a production build.

The verified Stage 12 application gate passes 211 tests across 33 test files.

## Focused audits

```bash
npm run audit:admin-operations
npm run audit:leagues
npm run audit:control-room
```

The Stage 12 audit verifies:

- fourteen active migrations;
- owner-only irreversible lock control;
- one-user/one-match grace grant and revocation;
- database-enforced browser kill-switches;
- no direct browser feature-control writes;
- tournament health, joker-lock and knockout-allocation review;
- one combined append-only admin timeline;
- Stage 11 stable-function lint corrections;
- no external result provider or WC26 dependency.

## Database tests

After local reset:

```bash
npm run test:db:005:local
npm run test:db:006:local
npm run test:db:008:local
npm run test:db:009:local
npm run test:db:010:local
npm run test:db:011:local
npm run test:db:012:local
npm run test:db:013:local
npm run test:db:014:local
```

Against verified Euro staging:

```bash
npm run test:db:005:linked
npm run test:db:006:linked
npm run test:db:008:linked
npm run test:db:009:linked
npm run test:db:010:linked
npm run test:db:011:linked
npm run test:db:012:linked
npm run test:db:013:linked
npm run test:db:014:linked
```

Established counts before Stage 12:

- Migration 005 storage: 31;
- profiles/privileges: 39;
- Migration 008 correction: 7;
- final-state atomic saving: 24;
- Migration 010 competition split: 48;
- Migration 011 results/scoring: 53;
- Migration 012 admin operations: 55;
- Migration 013 leagues/sharing: 62.

Migration 014 uses pgTAP `no_plan()` because it exercises roles, kill-switches, grace, the irreversible lock, operational review and lint corrections in one transaction.
