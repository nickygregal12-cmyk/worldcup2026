# Euro 2028 Predictor

This branch is the isolated Euro 2028 rebuild. The inherited WC26 browser application remains quarantined and unreachable from the active Euro entrypoint.

The verified build now includes:

- the official 51-match tournament skeleton;
- read-secured prediction storage and Euro authentication;
- one canonical group, best-third and bracket resolver;
- browser-only guest predictions;
- trusted atomic prediction saving;
- the original group-and-bracket prediction journey;
- a separate real-match KO Predictor;
- competition-scoped joker and grace controls;
- revisioned canonical results;
- idempotent scoring and separate leaderboards;
- live group tables and a live knockout bracket;
- secure manual result entry and tournament operations;
- private leagues, an overall people/points table and lock-aware shared prediction comparisons.

The two competitions remain separate:

- **Original Predictor:** 36 group score predictions, five group jokers and a winner-only pre-tournament knockout bracket with no jokers.
- **KO Predictor:** 15 real knockout fixtures, 90-minute scores, advancing teams, decision methods, five separate jokers, separate points and a separate winner.

A private league uses one membership list but always shows two different standings tabs. KO Predictor points never combine with Original Predictor points.

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
npm run check
npm run audit:leagues
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
```

Never run `npx supabase db reset --linked`.

## Current return point

Stage 11 adds Migration 013. League creation, joining, membership, standings and shared prediction viewing all use controlled RPCs. Original predictions remain private until the global lock; KO Predictor picks appear only after each real fixture starts.

The next controlled build expands the admin control room with lock, grace, joker-allocation and feature-control operations.
