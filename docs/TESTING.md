# Testing

## Full code gate

```bash
npm run check
```

Stage 11 has **208 passing unit tests across 33 files** before the authoritative Docker-backed SQL run. The gate runs database safety, all Euro audits, lint, unit tests and a production build.

## Focused audits

```bash
npm run audit:competition-split
npm run audit:results-scoring
npm run audit:admin-operations
npm run audit:leagues
```

The Stage 11 audits verify:

- thirteen active migrations;
- one private league membership list;
- separate Original Predictor and KO Predictor league tables;
- no combined competition total;
- no direct browser league table writes;
- member-only private standings;
- clickable overall leaderboard comparisons through the same lock rules;
- original prediction privacy before global lock;
- rolling KO Predictor visibility after each match starts;
- display-name-only shared identity;
- all prior scoring and admin boundaries remain active.

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
```

Expected established counts:

- Migration 005 storage: 31;
- profiles/privileges: 39;
- Migration 008 correction: 7;
- final-state atomic saving: 24;
- Migration 010 competition split: 48;
- Migration 011 results/scoring: 53;
- Migration 012 admin operations: 55.

Migration 013 uses pgTAP `no_plan()` because it exercises private membership, separate tables, global-lock visibility and rolling KO match visibility in one transaction.
