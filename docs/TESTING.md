# Testing

## Full code gate

```bash
npm run check
```

The gate runs database safety, every Euro audit, lint, unit tests and a production build.

The verified Stage 13A application gate passes 229 tests across 38 test files, including route, theme and Home-dashboard model coverage.

## Focused audits

```bash
npm run audit:admin-operations
npm run audit:leagues
npm run audit:control-room
npm run audit:design-tokens
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


The Stage 13A audit additionally verifies:

- fourteen migrations remain active and Migration 015 does not exist;
- the adjustable blue semantic token system, self-hosted fonts and reusable UI primitives are present;
- all nine app destinations remain routed, with Bracket permanent and Groups/KO changing only in Position 1;
- the three navigation states, early KO visibility, full transition boundary, resolver fail-safe and TBC hiding are covered;
- the More dialog handles Escape, focus trapping and focus restoration;
- Home and Tournament copy use central tournament/scoring data;
- partial failures cannot be displayed as genuine zeroes;
- the six light/dark visual baseline dimensions are present;
- public product branding is updated while staging remains `noindex`.

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

## Package-lock portability

Run `npm run audit:package-lock`. It must confirm that every resolved package uses the public npm registry and that no private build-environment URL is present.

## Backup tooling tests

`npm run check` includes `audit:backup` and the Vitest backup-helper suite. These verify the linked-project guard, safe output paths, five-file dump plan, metadata scope, restore documentation and absence of destructive database commands. A real backup still has to be created and verified from Nicky's machine before OB-2 is accepted.


## Staging administrator access tests

`npm run check` includes `audit:staging-admin` and the staging-admin SQL generator tests. They verify the fixed Euro staging/tournament guards, explicit target email and role, SQL escaping, grant/verify/revoke output, write-outside-repository rule, existing service-only database privilege boundary and absence of service-role secrets. The real grant is accepted only after the generated SQL is reviewed and run in the Euro staging SQL Editor, then the granted account signs back in and loads **More → Admin** as `owner`.
