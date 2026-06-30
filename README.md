# Euro 2028 Predictor

This repository branch is the isolated development version of the Euro 2028 predictor. It began as a copy of the completed WC26 predictor and is being rebuilt in controlled stages. The inherited WC26 browser application is now quarantined behind a read-only Euro foundation screen. The first Euro prediction, locking and result contract is defined in pure code and tests. Scoring categories are fixed structurally, while the current point values remain provisional in one central configuration file. No prediction tables or browser writes exist yet. The proposed prediction database is now documented as a non-executable design with an atomic future write boundary.

## Environments

| Environment | Git branch | Database | Purpose |
|---|---|---|---|
| WC26 live | `main` | WC26 production Supabase | Current World Cup site |
| Euro staging | `euro28-development` | Euro staging Supabase | Development and destructive testing |

The Euro branch must never use the WC26 production Supabase URL or keys.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with the Euro staging Supabase project URL and publishable key. Never add secret/service-role keys to variables beginning with `VITE_`.

## Checks

```bash
npm run lint:foundation
npm test
npm run build
```

Run the database guard, inherited-code boundary, foundation lint, tests and build together with:

```bash
npm run check
```

The inherited application boundary and prediction contract can also be checked directly with:

```bash
npm run audit:legacy
npm run audit:contracts
npm run audit:db-design
```

The inherited WC26 code currently has a large pre-existing full-lint backlog. It remains in the repository as quarantined reference code. `lint:foundation` and `audit:legacy` protect the active Euro foundation while that backlog is reviewed incrementally.

## Safety rules

- Euro changes are made only on `euro28-development` or feature branches created from it.
- Deploy previews and the Euro Netlify site use only the Euro staging database.
- Automatic WC26 score syncing is disabled on this branch.
- Database changes must be saved as reviewed migrations.
- `supabase/reference/` contains audit material only and must not be executed directly.

See `docs/DEVELOPMENT.md`, `docs/DATABASE.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md`, `docs/STAGE-2-APPLICATION-ISOLATION.md`, `docs/STAGE-2-PREDICTION-CONTRACTS.md`, and `docs/STAGE-2-PREDICTION-DATABASE-DESIGN.md`.
