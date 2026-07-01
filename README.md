# Euro 2028 Predictor

This branch is the isolated Euro 2028 rebuild. It began from the WC26 repository, but the inherited World Cup browser application remains quarantined and unreachable from the active Euro entrypoint.

The verified build now includes:

- the official 51-match tournament skeleton;
- read-secured prediction storage and Euro authentication;
- one canonical group, best-third and bracket resolver;
- browser-only guest predictions;
- trusted atomic prediction saving;
- the original group-and-bracket prediction journey;
- a separate real-match KO Predictor foundation;
- competition-scoped joker and grace controls.

The two competitions are deliberately separate:

- **Original predictor:** 36 group score predictions, five group jokers and a winner-only pre-tournament knockout bracket with no jokers.
- **KO Predictor:** 15 real knockout fixtures, 90-minute scores, advancing teams, decision methods, five separate jokers, separate points and a separate future leaderboard/winner.

KO Predictor points must never be combined with original-predictor points. Guest, predicted and live contexts also remain separate. WC26 `main` and the WC26 production Supabase project must never be used in this workflow.

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
```

Focused Stage 8 checks:

```bash
npm run audit:journey
npm run audit:competition-split
npm run test:db:010:local
```

## Database checks

```bash
npx supabase db reset
npm run test:db:005:local
npm run test:db:006:local
npm run test:db:008:local
npm run test:db:009:local
npm run test:db:010:local
```

Never run `npx supabase db reset --linked`.

## Current return point

Stage 8 implements the competition split and confirmed joker limits. Migration 010 separates original bracket picks from knockout match scores, creates the separate KO Predictor save route and makes grace competition-specific.

Scoring runs, actual leaderboards, results entry and the admin control room remain deferred.
