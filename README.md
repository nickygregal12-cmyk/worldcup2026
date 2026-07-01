# Euro 2028 Predictor

This branch is the isolated Euro 2028 rebuild. It began from the WC26 repository, but the inherited World Cup browser application remains quarantined and unreachable from the active Euro entrypoint.

The verified build now includes:

- the official 51-match tournament skeleton;
- read-secured prediction storage;
- one canonical group, best-third and knockout resolver;
- browser-only guest prediction state;
- Euro authentication and owner-only profiles;
- one trusted atomic prediction save RPC.

Guest, predicted and live tournament contexts remain separate. WC26 `main` and the WC26 production Supabase project must never be used in this workflow.

## Environments

| Environment | Git branch | Database | Purpose |
|---|---|---|---|
| WC26 live | `main` | WC26 production Supabase | Existing World Cup site |
| Euro staging | `euro28-development` | `gcfdwobpnanjchcnvdco` | Euro development and testing |

## Local setup

```bash
cd ~/Desktop/euro28predictor
git switch euro28-development
npm ci
cp .env.example .env.local
npm run dev
```

Use only the Euro staging project URL and publishable key in `.env.local`. Never expose a service-role key through a `VITE_` variable.

## Main checks

```bash
npm run check
```

Focused checks:

```bash
npm run db:safety
npm run audit:legacy
npm run audit:contracts
npm run audit:db-design
npm run audit:resolver
npm run audit:guest
npm run audit:auth
npm run audit:scoring-correction
npm run audit:prediction-save
```

## Database checks

After a local reset:

```bash
npx supabase db reset
npm run test:db:005:local
npm run test:db:006:local
npm run test:db:008:local
npm run test:db:009:local
```

Never run `npx supabase db reset --linked`.

## Current return point

Stage 6 is implemented in Migration 009. Signed-in prediction writes now use `save_my_prediction_bundle()` only. The function validates ownership, expected revision, tournament lock, match-scoped grace, per-match joker timing, joker caps, group fixtures and the complete canonical knockout path before replacing the supplied full bundle in one transaction.

A complete browser-only guest draft can be imported deliberately before lock. It cannot overwrite existing account prediction rows. Guest state remains in the browser after import.

Stage 7 is next: build the real group and knockout prediction journey, quiet autosave, completeness guidance and reversible submit/review mode on top of the Stage 6 route.

See:

- `docs/STAGE-6-ATOMIC-PREDICTION-SAVING.md`
- `docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md`
- `docs/DATABASE.md`
- `docs/TESTING.md`
