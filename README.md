# Euro 2028 Predictor

This repository branch is the isolated development version of the Euro 2028 predictor. It began as a copy of the completed WC26 predictor and is being rebuilt in controlled stages.

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

Run all three together with:

```bash
npm run check
```

The inherited WC26 code currently has a large pre-existing full-lint backlog. `lint:foundation` protects all new foundation code while that backlog is cleaned up incrementally.

## Safety rules

- Euro changes are made only on `euro28-development` or feature branches created from it.
- Deploy previews and the Euro Netlify site use only the Euro staging database.
- Automatic WC26 score syncing is disabled on this branch.
- Database changes must be saved as reviewed migrations.
- `supabase/reference/` contains audit material only and must not be executed directly.

See `docs/DEVELOPMENT.md`, `docs/TESTING.md`, and `docs/DEPLOYMENT.md`.
