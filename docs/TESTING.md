# Testing

## Full code gate

```bash
npm run check
```

This runs database safety, inherited-code isolation, all Euro audits, foundation lint, unit tests and a production build.

## Unit tests

```bash
npm test
```

Stage 7 has 163 passing tests across contracts, scoring configuration, resolver, guest storage, authentication and prediction-save request/service logic.

## Focused audits

```bash
npm run audit:contracts
npm run audit:db-design
npm run audit:resolver
npm run audit:guest
npm run audit:auth
npm run audit:scoring-correction
npm run audit:prediction-save
npm run audit:journey
```

The Stage 6 and Stage 7 audits verify:

- exactly nine active migrations;
- authenticated-only execution of the trusted save RPC;
- no direct browser prediction-table writes;
- optimistic revision checking;
- full canonical bracket validation;
- global content lock, match-scoped grace and per-match joker lock;
- explicit complete pre-lock guest import;
- no guest overwrite of existing account rows;
- groups, knockout and review are the only journey views;
- guest edits remain local and account edits use the atomic RPC;
- quiet autosave uses an 800 ms delay;
- no Migration 010 or direct browser table writes.

## Database integration tests

After a local reset:

```bash
npm run test:db:005:local
npm run test:db:006:local
npm run test:db:008:local
npm run test:db:009:local
```

Against the verified Euro staging project:

```bash
npm run test:db:005:linked
npm run test:db:006:linked
npm run test:db:008:linked
npm run test:db:009:linked
```

Coverage totals:

- Migration 005 storage: 31 pgTAP checks;
- Stage 5 profiles and function privileges: 39 checks;
- Migration 008 joker-cap correction: 7 checks;
- Migration 009 atomic saving: 54 checks.

Migration 009 uses real tournament rows to build all 36 group predictions and then resolves matches 37–51 progressively through the server's canonical resolver. It tests revision conflicts, invalid sources, duplicate rows, unresolved joker caps, canonical tampering, guest import, reversible review mode, global lock, grace scope, future joker movement, started-match joker locking and cross-user isolation.

## Behavioural SQL validation

Before packaging, all nine migrations are also applied to an isolated PostgreSQL-compatible database and the main Stage 6 save scenarios are exercised end to end. This supplements, but does not replace, the Docker-backed local Supabase reset and pgTAP run.

## Deployed foundation check

After Netlify deploys the pushed commit:

```bash
npm run verify:foundation-page
```

This verifies Euro branding, no indexing, retired WC26 service worker behaviour, guest format, auth UI and the Stage 7 prediction journey and trusted save bundle.
