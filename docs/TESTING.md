# Testing

## Full code gate

```bash
npm run check
```

The gate runs database safety, every Euro audit, lint, unit tests and a production build.

The Stage 13C application gate includes the established Stage 13A/13B coverage plus separate bracket and KO presentation-model, component and service tests.

## Focused audits

```bash
npm run audit:admin-operations
npm run audit:leagues
npm run audit:control-room
npm run audit:design-tokens
npm run audit:groups-predictor
npm run audit:knockout-experiences
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

- the historical fourteen-migration baseline remains intact; Stage 13E adds the approved Team Profile Sheet Migration 015;
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

## Stage 13B Groups predictor tests

`npm run audit:groups-predictor` verifies all 36 group fixtures, the shared TeamLabel and ScoreInput boundaries, 55-code local flag registry, explicit prediction states, central joker configuration, profile-opening safety, six visual baselines and the absence of Migration 015.

Vitest covers TeamLabel real/provisional/unresolved rendering, identity-only activation, mobile numeric score input, locked and grace presentation, group progress and save-state precedence.


## Stage 13C knockout experience tests

`npm run audit:knockout-experiences` verifies the permanent predicted-context Original Bracket, winner-only controls, zero bracket jokers, separate real-fixture KO controls, 90-minute score semantics, advancing team, method, five KO jokers, separate points/rank service boundary, TBC hiding, responsive context styling, twelve visual baselines and the absence of Migration 015.

Vitest covers bracket slot labels and progress, lock/grace presentation, predicted champion, KO method options, live/completed locking, round progress, real-fixture component controls, competition-specific saving, KO points and rank.


## Stage 13E Team Profile Sheet

`npm run audit:team-profile` verifies the shared TeamLabel trigger, bottom-sheet states, centrally stored curated facts, canonical tournament source, owner-only editing, pre-lock aggregate omission, Migration 015 and its database test.

Run `npm run test:db:015:local` against a disposable local database before considering the migration accepted. Do not use the linked test casually because it exercises the tournament lock inside a rolled-back test transaction.
