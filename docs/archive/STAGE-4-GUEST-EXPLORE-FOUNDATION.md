> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 4 — Guest/explore foundation

## Status

Implemented as browser-only prediction state on top of the Stage 3 canonical resolver.

- State version: `euro28-guest-state-v1`
- Bundle format: `euro28-guest-prediction-bundle` version `1`
- Reference model: `euro28-guest-reference-v1`
- Resolver: `euro28-canonical-resolver-v1`

No database migration is included.

## Delivered scope

Stage 4 provides:

- one local draft row for every match from 1 to 51;
- 36 group score drafts;
- 15 knockout drafts with a 90-minute score, advancing team, decision method and joker flag;
- safe support for partial score drafts during future autosave editing;
- browser `localStorage` persistence scoped by tournament and reference version;
- graceful memory-only fallback when browser storage is unavailable;
- a versioned JSON export and import format;
- no account name, email, profile ID or scoring data in exported bundles;
- strict tournament, reference, state and resolver version validation on import;
- group, knockout and overall completeness tracking;
- future account-import readiness reporting;
- canonical `guest` resolver previews;
- stale knockout-selection diagnostics instead of blended or corrupted progression;
- a staging-page panel for export, import and clearing the local guest draft.

## Stable tournament identities

Guest state is keyed by official match number. Resolver teams use the stable `tournament_teams.id` value rather than a provisional team name.

This means the same tournament-team record can later receive its real team identity without changing the internal participant key used by guest predictions.

The public reference adapter reads:

- tournament stages;
- groups;
- tournament teams;
- group memberships;
- official matches;
- versioned match-slot rules.

It creates plain resolver input objects and never mutates the reference tables.

## Partial drafts and resolver safety

A browser draft may temporarily contain only one side of a score. That row remains saved locally but is passed to the canonical resolver as an unresolved match until both scores are valid.

Knockout advancement is validated progressively. A saved advancing-team ID that no longer belongs to a resolved fixture is reported as stale and omitted from progression. It is never silently blended with another bracket context.

## Storage boundary

Guest predictions are stored only in browser storage under a versioned key.

Guest modules do not import Supabase, call database tables, use `fetch`, or send prediction data to a server. The active page still reads the public tournament reference through the existing read-only foundation client.

## Export/import boundary

The portable JSON bundle includes:

- bundle, state and resolver versions;
- tournament and reference identifiers;
- source revision;
- 36 group prediction rows;
- 15 knockout prediction rows.

It deliberately excludes personal data and account identity. Import fails closed when the bundle belongs to another tournament or reference version, has duplicate/missing matches, uses another resolver version, or contains invalid prediction values.

## Files

- `src/guest/guestPredictionConfig.js`
- `src/guest/guestReferenceModel.js`
- `src/guest/guestPredictionState.js`
- `src/guest/guestTournamentPreview.js`
- `src/guest/guestPredictionBundle.js`
- `src/guest/guestPredictionStorage.js`
- `src/guest/GuestWorkspaceFoundation.jsx`
- `src/guest/index.js`
- `src/guest/__tests__/`
- `scripts/check-guest-foundation.mjs`

## Verification

```bash
npm run audit:guest
npm run lint:foundation
npm test
npm run build
npm run check
```

The completed Stage 4 suite contains 130 passing tests across 19 files.

## Deliberately excluded

Stage 4 does not add:

- Migration 006;
- guest prediction storage in Supabase;
- authentication or profiles;
- guest-to-account import execution;
- the final atomic save route;
- the full group or knockout editing journey;
- submit/review UI;
- scoring, leaderboards or leagues;
- admin controls;
- results or live API integration.

## Next stage

Stage 5 is Euro-specific authentication and profiles. It must preserve the browser-only guest boundary and must not introduce direct browser writes to prediction tables.
