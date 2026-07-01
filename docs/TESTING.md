# Testing

## Full code gate

```bash
npm run check
```

Stage 8 currently has **173 passing unit tests across 27 files**. The gate also runs database safety, all Euro audits, lint and a production build.

## Focused audits

```bash
npm run audit:contracts
npm run audit:db-design
npm run audit:journey
npm run audit:competition-split
```

These verify:

- ten active migrations;
- 36 original group scores and 15 winner-only bracket picks;
- five group jokers and zero original-bracket jokers;
- a separate 15-match KO Predictor with five jokers;
- separate revisions, points and future leaderboards;
- competition-scoped grace;
- no direct browser table writes.

## Database tests

After local reset:

```bash
npm run test:db:005:local
npm run test:db:006:local
npm run test:db:008:local
npm run test:db:009:local
npm run test:db:010:local
```

Against verified Euro staging:

```bash
npm run test:db:005:linked
npm run test:db:006:linked
npm run test:db:008:linked
npm run test:db:009:linked
npm run test:db:010:linked
```

Current planned pgTAP counts after Migration 010:

- Migration 005 storage: 31;
- profiles/privileges: 39;
- Migration 008 correction: 7;
- final-state atomic-save regression: 24;
- Migration 010 competition split: 48.

The Docker-backed local reset and linked tests are the authoritative SQL execution checks for Migration 010.
