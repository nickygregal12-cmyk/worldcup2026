// Stage 13G-UI-HYGIENE (shared policy) — what counts as user-facing, what
// vocabulary is banned there, and the explicit allowlist.
//
// Recreated deliberately per docs/STAGE-13G-UI-COPY-HYGIENE-REFERENCE.md
// ("recreate them deliberately before wiring the audits"). This module is
// imported by both check-user-facing-copy-hygiene.mjs and
// check-user-facing-spec-echo.mjs, so the definition of "user-facing"
// lives in exactly one place.
//
// Principle (Design Charter): user-facing surfaces carry zero admin, dev or
// build-internal language and never echo spec/decision-doc prose verbatim.
// That vocabulary lives only in src/admin/** and docs/**. Copy is written
// for the player reading it, not lifted from the requirement that produced it.

// Directories whose rendered output an ordinary player can see.
// Deliberately excluded:
//   - src/admin        — owner/results-admin surfaces; operational vocabulary is correct there
//   - src/pages        — quarantined WC26 legacy, unreachable from the live entrypoint
//   - src/components   — quarantined WC26 legacy, only imported by src/pages
//   - src/testFixtures — never in the production import graph
//   - src/timePhase    — owner-only staging Time & Phase controls plus the staging-only
//     simulated-time warning banner; environment vocabulary is intentional and correct there
//   - src/contracts, src/lib, src/observability, src/store — no rendered copy of their own;
//     anything they feed into UI is caught at the rendering surface
export const USER_FACING_ROOTS = Object.freeze([
  'src/app',
  'src/auth',
  'src/bracketHealth',
  'src/design-system',
  'src/grace',
  'src/guest',
  'src/home',
  'src/journey',
  'src/koPredictor',
  'src/leagues',
  'src/matchCentre',
  'src/player',
  'src/predictions',
  'src/results',
  'src/teamProfile',
  'src/tournament',
])

// Single user-facing files that are not directories (walkFiles takes
// directories, so these are listed separately and consumed by the
// copy-hygiene audit directly).
export const USER_FACING_FILES = Object.freeze([
  'src/App.jsx',
])

// Banned vocabulary for user-facing copy. Each entry is a category with a
// word-boundary pattern and a hint that tells the fixer what a player-facing
// replacement usually looks like. Patterns are matched case-insensitively
// against extracted UI strings only (quoted prose and JSX text), never
// against identifiers, imports or code structure.
export const BANNED_VOCABULARY = Object.freeze([
  { category: 'architecture', pattern: /\bcanonical\b/i, hint: 'say "official" or drop the qualifier — players assume results are official' },
  { category: 'architecture', pattern: /\bresolver\b/i, hint: 'describe the outcome ("live table", "who advances"), never the mechanism' },
  { category: 'architecture', pattern: /\blifecycle\b/i, hint: 'say what changes for the player ("updates automatically", "after kick-off")' },
  { category: 'architecture', pattern: /\bslot-reference\b/i, hint: 'players see teams and fixtures, not slots' },
  { category: 'build-internal', pattern: /\bmigration\b/i, hint: 'database machinery must never be visible' },
  { category: 'build-internal', pattern: /\bsupabase\b/i, hint: 'vendor names must never be visible' },
  { category: 'build-internal', pattern: /\bstaging\b/i, hint: 'environment names must never be visible' },
  { category: 'build-internal', pattern: /\bappend-only\b/i, hint: 'audit-trail mechanics are admin/docs vocabulary' },
  { category: 'build-internal', pattern: /\bconfig\b/i, hint: 'say what it means ("provisional dates", "current rules"), not where it lives' },
  { category: 'build-internal', pattern: /\bRLS\b/, hint: 'say "private" or "hidden" instead of the enforcement mechanism' },
  { category: 'build-internal', pattern: /\bRPC\b/, hint: 'never name server call mechanics' },
  { category: 'build-internal', pattern: /\bpgTAP\b/i, hint: 'test tooling must never be visible' },
  { category: 'stage-id', pattern: /\bStage\s?1[0-9][A-Z]?(?:-[A-Z0-9]+)*\b/i, hint: 'stage ids are process vocabulary, not product copy' },
  { category: 'legacy-brand', pattern: /\bWC26\b/i, hint: 'World Cup 26 branding is retired for this product' },
  { category: 'legacy-brand', pattern: /\bWorld Cup 2026\b/i, hint: 'World Cup branding is retired for this product' },
  { category: 'debug', pattern: /\bdebug\b/i, hint: 'debug strips and mechanics are not user-facing copy' },
  { category: 'debug', pattern: /\blorem ipsum\b/i, hint: 'placeholder copy must never ship' },
  { category: 'debug', pattern: /\bTODO\b/, hint: 'unfinished-copy markers must never ship' },
])

// Explicit allowlist. Every entry needs the exact string, the file it lives
// in, and a reason. Do not add entries to silence a genuine finding — fix the
// copy instead. An empty allowlist is the healthy state.
export const ALLOWED_STRINGS = Object.freeze([
  {
    file: 'src/app/appRoutes.js',
    text: 'Staging Time & Phase',
    reason: 'Admin section label rendered only inside the protected #/admin route; the shared route registry lives in a user-facing root but this string never renders for ordinary players.',
  },
])

export function isAllowed(file, text) {
  return ALLOWED_STRINGS.some(entry => entry.file === file && entry.text === text)
}
