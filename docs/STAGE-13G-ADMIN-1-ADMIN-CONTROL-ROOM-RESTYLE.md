# Stage 13G-ADMIN-1 — Admin control-room cosmetic restyle

Status: implemented for local acceptance.

This batch adopts the approved Admin prototype visual language as a cosmetic-only control-room restyle. It keeps the existing protected Admin route, section registry, service functions, RPC boundaries, operation permissions, audit data and Tournament Picks readiness contract unchanged.

## Scope

Included:

- Restyle the protected Admin shell, hero, section navigation, role/metadata chips, status summary cards, guardrail banner and audit filter pills using existing semantic design tokens.
- Preserve the canonical `#/admin?section=...` section destinations and invalid-section recovery.
- Preserve all existing owner/results-admin permission boundaries, note gates, confirmation dialogs and append-only audit behaviour.
- Add `audit:stage13g-admin-control-room-restyle` and wire it into `npm run check` and `lint:foundation`.

Excluded:

- No Admin service, RPC, Supabase, database, scoring, resolver, Tournament Picks execution or role changes.
- No new migration. Active migrations remain 18 and Migration 019 must not exist.
- No Account, Tournament, How to Play or Match Centre work.

## Acceptance evidence

Required local gates:

- `npm run audit:stage13g-admin-control-room-restyle`
- `npm run audit:admin-control-room-ui`
- `npm run audit:admin-completion`
- `npm run audit:route-integrity`
- `node scripts/check-frontend-architecture.mjs`
- `npm run lint:foundation`
- `npm test`
- `npm run build`
- `npm run check`

## Close-out rule

The stage can be closed only after deployment verification confirms the app shell still passes with 18 active migrations and no inherited WC26 bundle activation.
