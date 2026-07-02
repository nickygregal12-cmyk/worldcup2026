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
- a shared light/dark design system, responsive app shell and account-aware Home dashboard;
- a mobile-first 36-match Groups predictor with shared team labels, local circle flags, score controls, jokers and review states.

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
npm run audit:groups-predictor
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

Stage 13B adds the mobile-first Groups predictor and review flow on top of the verified Stage 13A shell. All 36 group fixtures use shared team, score, state and joker components. Circle flags are bundled locally and selected from central ISO/association codes; unresolved slots remain visibly neutral. Existing autosave, global-lock, grace and competition boundaries are unchanged, and the database remains at fourteen migrations.

The next controlled build is Stage 13C: the permanent original bracket and separate KO Predictor match centre.

## Operational safety

- Database backup and restore: `docs/DATABASE-BACKUP-AND-RESTORE.md`
- Create a guarded Euro staging backup with `npm run db:backup -- --label <label>`.
- Staging administrator access: `docs/STAGING-ADMIN-ACCESS.md`
- Generate reviewed grant, verify or revoke SQL with `npm run admin:staging:sql -- ...`; the browser still cannot self-grant access.
