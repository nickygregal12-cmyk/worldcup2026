# Testing

## Full code gate

```bash
npm run check
```

Stage 9 has **182 passing unit tests across 29 files** before the authoritative Docker-backed SQL run. The gate also runs database safety, all Euro audits, lint and a production build.

## Focused audits

```bash
npm run audit:competition-split
npm run audit:results-scoring
```

The Stage 9 audit verifies:

- eleven active migrations;
- revisioned and audited canonical results;
- service-role-only result writes and recalculation;
- replacement-based scoring after corrections;
- separate original and KO Predictor totals;
- separate authenticated leaderboards;
- live resolver context isolation;
- no direct browser writes.

## Database tests

After local reset:

```bash
npm run test:db:005:local
npm run test:db:006:local
npm run test:db:008:local
npm run test:db:009:local
npm run test:db:010:local
npm run test:db:011:local
```

Against verified Euro staging:

```bash
npm run test:db:005:linked
npm run test:db:006:linked
npm run test:db:008:linked
npm run test:db:009:linked
npm run test:db:010:linked
npm run test:db:011:linked
```

Expected established counts:

- Migration 005 storage: 31;
- profiles/privileges: 39;
- Migration 008 correction: 7;
- final-state atomic saving: 24;
- Migration 010 competition split: 48.

Migration 011 uses pgTAP `no_plan()` because its integration suite intentionally exercises result revisions, corrections, scoring replacement, penalties and both leaderboard contexts in one transaction.
