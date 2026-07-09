> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# EURO 2028 PREDICTOR
## Stage 14B Batch 2 — Structural compliance
### Start checkpoint: `66adb1f` · 15 migrations

## Purpose

Remove every temporary oversized-component exception without changing the rendered product, prediction behaviour, privacy, scoring or database.

## Ledger rows moved

- Charter architecture section: `INCOHERENT` to `FUNCTIONAL` after the accepted Batch 1 governance gate.
- File-size/structure audit: `MISSING` to `FUNCTIONAL` once all active JSX files pass the 400-line hard cap with no temporary component caps.
- WCAG contrast automation: `MISSING` to `PARTIAL`; the automated matrix is active, while four exact light-theme exceptions remain assigned to Batch 3.

## Structural changes

### Leagues

- `LeaguesFoundation.jsx`: 654 to 399 lines.
- `LeaguePresentation.jsx`: 245 lines.
- Stateful loading, stale-request protection, league operations and confirmation behaviour remain in the controller.
- Tables, summaries, privacy rows and H2H presentation move to the presentation module unchanged.

### Original Predictor journey

- `PredictionJourneyFoundation.jsx`: 581 to 327 lines.
- `PredictionJourneyView.jsx`: 208 lines.
- `predictionJourneyRuntime.js`: 41 lines.
- Authentication, autosave, revisions, lock/grace rules and draft mutations remain in the controller.
- Existing render composition moves to the view unchanged.
- Browser/review helpers move to a pure runtime helper.

### Results and leaderboards

- `ResultsAndLeaderboardsFoundation.jsx`: 447 to 165 lines.
- `ResultsPresentation.jsx`: 280 lines.
- Data loading, stale-request protection and comparison requests remain in the controller.
- Result feed, live tables, live bracket, leaderboards, points and comparison presentation move unchanged.

## Audit changes

Historical feature audits now inspect all files forming each split feature. This preserves their original behavioural assertions rather than weakening them because JSX moved to a presentation module.

The architecture policy contains no temporary component caps after this batch.

## Explicit non-goals

- no visual changes;
- no CSS selector changes;
- no new CSS or style migration;
- no route or access change;
- no feature change;
- no scoring, joker, privacy or lock change;
- no database change;
- no Migration 016.

## Acceptance gate

- `npm run check` passes;
- 59 test files and 321 tests remain green or improve;
- production build passes;
- `audit:architecture` reports zero temporary component caps;
- all split files remain at or below 400 lines;
- migration count remains 15;
- visual review confirms no unintended change.

## Next batch

Stage 14B Batch 3 presents the four exact light-theme contrast failures and applies only owner-approved minimal token corrections. Stage 14B does not close until every contrast exception is removed.
