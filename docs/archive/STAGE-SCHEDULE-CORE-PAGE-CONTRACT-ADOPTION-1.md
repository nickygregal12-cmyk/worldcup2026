> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# STAGE-SCHEDULE-CORE-PAGE-CONTRACT-ADOPTION-1

Status: accepted docs-only sequencing fix.

This stage inserts the approved core-page contract adoption work into the recorded v9+ order without implementing any product code.

## Inserted stages

### 5A — STAGE-CORE-PAGE-ADOPTION-1

Scope: Groups, Original Bracket and KO Predictor.

- Groups uses `docs/reference-prototypes/euro28-groups-page-prototype.html`.
- Original Bracket uses `docs/reference-prototypes/euro28-bracket-page-prototype.html`.
- KO Predictor uses `docs/reference-prototypes/euro28-ko-predictor-contract.html`.
- Contracts must be rebuilt natively in the Euro design system and never ported as prototype code.
- Existing behaviour tests must pass unmodified or the agent must stop and report.
- Eyes-on side-by-side acceptance is required per section in light and dark themes.
- Groups adoption consumes shared predicted-tables and third-place components. If Original bracket coherence, predicted group standings or shared third-place table rows are not FUNCTIONAL when this stage starts, they are prerequisites and must land first or within this stage as their own slices.

### 5B — STAGE-CORE-PAGE-ADOPTION-2

Scope: Results and Leaderboards.

- Results uses `docs/reference-prototypes/euro28-results-page-prototype.html`.
- Leaderboards uses `docs/reference-prototypes/euro28-leaderboards-page-prototype.html`.
- Results carries two recorded functional additions: live knockout projection through the existing `resolveGroupTable` and third-place allocator path, and Match Centre navigation from every result card.
- Leaderboards is cosmetic-only against its approved contract.

## Readiness gate amendment

`STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1` cannot be accepted until every approved visual contract in `docs/reference-prototypes/` is either implemented on its live surface or explicitly deferred with a recorded reason and owner.

Current approved visual-contract inventory: 20 HTML files.

## Safety

Docs only. No `src/`, `supabase/`, tests, audits, reference prototypes, scoring, resolver, Auth, service-role, fake-result-write or migration changes. Active migrations remain 18 and no Migration 019 is created.
