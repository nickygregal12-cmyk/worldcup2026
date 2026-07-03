# Stage 13F-H — Product-root and runtime coherence

## Accepted checkpoint

`7324d43`

## Purpose

Remove development-era runtime ownership and inherited deployment inputs without changing product rules, database contracts or user-facing functionality.

## Completed scope

- `src/App.jsx` owns the real product bootstrap, loading, routing and shell.
- Active controller names describe product features rather than temporary Foundation stages.
- Runtime loading and Supabase-client helpers live under `src/runtime`.
- Deterministic visual fixtures live under `src/testFixtures` and are absent from the production import graph.
- Netlify deploy input contains only `health`, `scheduled-heartbeat` and shared observability support.
- Inherited result sync, odds, weather, push, account-claim, bracket-backfill and league-snapshot handlers are removed from Euro deploy input.
- Deferred PWA manifest, retirement service worker and push components are removed pending Stage 18C.
- Dormant manual-file recovery components are removed.
- The frozen Euro compatibility styles remain unchanged; no visual redesign is included.

## Invariants preserved

- Original and KO Predictor storage, scoring and leaderboards remain separate.
- Predicted and live brackets remain independently resolved.
- Admin authorisation remains server-controlled.
- Migration count remains 16; no Stage 13F-H migration exists.
- WC26 production remains blocked and untouched.

## Enforcement

`npm run audit:runtime-coherence` fails if Foundation controller names return, production imports visual fixtures, inherited Netlify handlers re-enter deploy input, or deferred PWA/push remnants return before Stage 18C.
