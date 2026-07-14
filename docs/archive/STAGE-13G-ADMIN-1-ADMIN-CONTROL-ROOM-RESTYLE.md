> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

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

## Deployed close-out and legacy note

Closed at `64f2f3e Restyle Stage 13G admin control room` on `euro28-development`. Post-deploy `npm run verify:foundation-page` passed. Active migrations remain 18 and no Migration 019 was created.

The expanded 2026-07-05 prompt also calls out `src/pages/AdminPanel.jsx` as dead WC26 legacy. This cosmetic Admin stage did not delete it; broader `src/pages/` retirement is recorded as a future audited cleanup tied to Player View / legacy-pages consolidation. Do not claim the full legacy-pages cleanup complete until every file in `src/pages/` is proved unreferenced or safely removed.
