# Euro 2028 Predictor

This repository branch is the isolated development version of the Euro 2028 predictor. It began as a copy of the completed WC26 predictor and is being rebuilt in controlled stages. The inherited WC26 browser application remains quarantined behind the active Euro foundation. Migration 005 defines the read-secured prediction storage foundation, Stage 3 supplies the canonical tournament resolver, Stage 4 adds the browser-only guest workspace, and Migration 006 now adds isolated Euro authentication and owner-only profiles. Guest, predicted and live data remain strictly separated. The final atomic prediction save route and all direct browser writes to prediction tables remain deferred.

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
npm run audit:resolver
npm run audit:guest
npm run audit:auth
```

The inherited WC26 code currently has a large pre-existing full-lint backlog. It remains in the repository as quarantined reference code. `lint:foundation` and `audit:legacy` protect the active Euro foundation while that backlog is reviewed incrementally.

## Safety rules

- Euro changes are made only on `euro28-development` or feature branches created from it.
- Deploy previews and the Euro Netlify site use only the Euro staging database.
- Automatic WC26 score syncing is disabled on this branch.
- Database changes must be saved as reviewed migrations.
- `supabase/reference/` contains audit material only and must not be executed directly.

See `docs/DEVELOPMENT.md`, `docs/DATABASE.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md`, `docs/STAGE-4-GUEST-EXPLORE-FOUNDATION.md`, and `docs/STAGE-5-AUTHENTICATION-AND-PROFILES.md`.

## Current Euro development return point

Stage 5 is complete. Migration 006 creates one validated, case-insensitively unique profile per Auth user, with owner-only RLS and controlled profile RPCs. The staging page supports sign-up, sign-in, sign-out and password recovery while retaining the separate browser-only guest draft. No prediction save RPC, guest upload, leagues, scoring runs or admin result UI has been introduced.

See `docs/STAGE-5-AUTHENTICATION-AND-PROFILES.md` and `docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md`.
