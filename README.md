# Euro 2028 Predictor

This branch is the isolated Euro 2028 rebuild. The inherited WC26 browser application remains quarantined and unreachable from the active Euro entrypoint.

The verified build now includes:

- the official 51-match tournament skeleton;
- one canonical group, best-third and knockout resolver;
- browser-only guest predictions;
- Euro authentication and trusted atomic saving;
- the Original Predictor and separate KO Predictor;
- five group jokers, no original-bracket jokers and five KO jokers;
- revisioned canonical results and replacement-based scoring;
- separate overall and private-league standings;
- secure manual result operations;
- private leagues and lock-aware shared predictions;
- an expanded admin control room for lock, grace, feature and tournament-health operations;
- a shared light/dark design system, responsive app shell and account-aware Home dashboard.

The two competitions remain separate:

- **Original Predictor:** 36 group scores, five group jokers and a winner-only pre-tournament knockout bracket.
- **KO Predictor:** 15 real knockout matches, 90-minute scores, advancing teams, decision methods and five separate jokers.

A league has one membership list but always shows two different standings tables. The two point totals never combine.

## Environment

| Environment | Git branch | Database |
|---|---|---|
| WC26 live | `main` | WC26 production Supabase |
| Euro staging | `euro28-development` | `gcfdwobpnanjchcnvdco` |

## Local setup

```bash
cd ~/Desktop/euro28predictor
git switch euro28-development
npm ci
cp .env.example .env.local
npm run dev
```

Use only the Euro staging URL and publishable key in `.env.local`. Never expose a service-role key through a `VITE_` variable.

## Main checks

```bash
npm run audit:control-room
npm run audit:design-tokens
npm run check
```

## Database checks

```bash
npx supabase db reset
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

Never run `npx supabase db reset --linked`.

## Current return point

Stage 13A v6 adds the shared design system, persisted light/dark themes, responsive navigation and the new Home dashboard. Position 2 remains the original Bracket permanently. Position 1 stays Groups until all 36 group results and all eight Round of 16 pairings are ready, while complete KO fixtures become available earlier through More. It starts from `4e1ae38`, retains all Stage 12 controls and keeps the database unchanged at fourteen migrations.

The next controlled build is Stage 13B: the mobile-first Groups predictor and review flow.

## Operational safety

- Database backup and restore: `docs/DATABASE-BACKUP-AND-RESTORE.md`
- Create a guarded Euro staging backup with `npm run db:backup -- --label <label>`.
- Staging administrator access: `docs/STAGING-ADMIN-ACCESS.md`
- Generate reviewed grant, verify or revoke SQL with `npm run admin:staging:sql -- ...`; the browser still cannot self-grant access.
