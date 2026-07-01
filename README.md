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
- live group tables and a live knockout bracket.

The two competitions are deliberately separate:

- **Original predictor:** 36 group score predictions, five group jokers and a winner-only pre-tournament knockout bracket with no jokers.
- **KO Predictor:** 15 real knockout fixtures, 90-minute scores, advancing teams, decision methods, five separate jokers, separate points and a separate winner.

KO Predictor points never combine with original-predictor points. Guest, predicted and live resolver contexts also remain separate.

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
npm run audit:results-scoring
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
```

Never run `npx supabase db reset --linked`.

## Current return point

Stage 9 adds Migration 011. Results are revisioned and audited; corrections replace old point rows; original and KO Predictor totals and leaderboards remain separate.

Browser result entry, private leagues, member comparison and external result-provider integration remain deferred.
