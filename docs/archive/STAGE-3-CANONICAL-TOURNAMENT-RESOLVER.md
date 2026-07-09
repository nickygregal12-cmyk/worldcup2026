> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 3 — Canonical tournament resolver

## Status

Implemented as a pure, versioned JavaScript engine with no database migration and no browser write path.

Resolver version: `euro28-canonical-resolver-v1`

## Delivered scope

The resolver now provides:

- complete group-table calculation for six groups of four teams;
- normal match statistics: played, wins, draws, losses, goals for, goals against, goal difference and points;
- a clearly labelled provisional group tie-break process;
- recursive head-to-head mini-table handling for tied teams;
- ranking of the six third-placed teams;
- selection of the four best third-placed teams;
- one runtime best-third allocation matrix covering all 15 combinations;
- the official 15-match knockout route from matches 37 to 51;
- separate `guest`, `predicted` and `live` contexts using the same engine;
- strict rejection of mixed-context records;
- advancing-team progression independent from 90-minute score predictions;
- milestone outputs for Round of 16, quarter-final, semi-final, final and champion teams.

## Provisional tie-break position

The resolver tie-break contract is deliberately marked `provisional`.

The current preview order is:

1. points;
2. head-to-head points;
3. head-to-head goal difference;
4. head-to-head goals scored;
5. overall goal difference;
6. overall goals scored;
7. overall wins;
8. fair-play points, when supplied for every remaining tied team;
9. qualifier ranking, when supplied for every remaining tied team;
10. stable preview fallback.

The final fallback exists only so guest and prediction previews remain deterministic. It is reported through resolver issues and must never be described as an official UEFA tie-break.

Before launch, the final UEFA EURO 2028 regulations must be checked and the provisional contract either confirmed or replaced through a new version.

## Context isolation

Every result or decision row passed to the canonical resolver must declare one context:

- `guest` — browser-only exploratory predictions;
- `predicted` — the signed-in user's frozen prediction path;
- `live` — the real tournament path.

A resolver call accepts one context only. Any record carrying another context is rejected. Predicted and live group tables or knockout decisions cannot be blended.

## Runtime source of truth

`src/resolver/euro28ResolverConfig.js` is the runtime source for:

- resolver version and contexts;
- provisional tie-break criteria;
- all 15 best-third combinations;
- best-third assignments for group winners B, C, F and E;
- knockout match sources for matches 37 to 51.

`npm run audit:resolver` confirms that the runtime best-third matrix still matches the rules stored in Migration 004.

The inherited WC26 `src/lib/bracketUtils.js` is not imported and remains quarantined.

## Files

- `src/resolver/euro28ResolverConfig.js`
- `src/resolver/groupStandings.js`
- `src/resolver/bestThird.js`
- `src/resolver/knockoutBracket.js`
- `src/resolver/canonicalTournamentResolver.js`
- `src/resolver/index.js`
- `src/resolver/__tests__/`
- `scripts/check-tournament-resolver.mjs`

## Verification

```bash
npm run audit:resolver
npm run lint:foundation
npm test
npm run build
npm run check
```

The completed Stage 3 package contains 109 passing unit tests in total, including a separate test for every one of the 15 best-third combinations.

## Deliberately excluded

Stage 3 does not add:

- Migration 006;
- guest server storage;
- authentication or profiles;
- an atomic save route;
- prediction pages or editing UI;
- database result entry;
- scoring runs;
- leagues;
- admin controls;
- live API integration.

## Next stage

Stage 4 is the guest/explore foundation. It should use this resolver in browser-only state, preserve the context boundary and introduce no Supabase prediction writes.
