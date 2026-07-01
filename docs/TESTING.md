# Testing

## Full code gate

```bash
npm run check
```

Stage 10 has **196 passing unit tests across 31 files** before the authoritative Docker-backed SQL run. The gate also runs database safety, all Euro audits, lint and a production build.

## Focused audits

```bash
npm run audit:competition-split
npm run audit:results-scoring
npm run audit:admin-operations
```

The Stage 10 audits verify:

- twelve active migrations;
- revisioned and audited canonical results;
- service-role-only result writes and recalculation;
- replacement-based scoring after corrections;
- separate original and KO Predictor totals;
- separate authenticated leaderboards;
- live resolver context isolation;
- no direct browser writes;
- service-managed admin access with no browser self-grant;
- revision-safe result writes and append-only operational auditing;
- status-only controls and confirmed-result recalculation.

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
```

Expected established counts:

- Migration 005 storage: 31;
- profiles/privileges: 39;
- Migration 008 correction: 7;
- final-state atomic saving: 24;
- Migration 010 competition split: 48.

Migrations 011 and 012 use pgTAP `no_plan()` because their integration suites exercise result revisions, corrections, scoring replacement, administrator access, stale-write rejection, status controls and recalculation in complete transactions.
