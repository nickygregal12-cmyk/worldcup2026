> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13G-PLAYER-DESTINATIONS-REF — Player View sub-destination reference adoption

Status: reference recorded / implementation scheduled.

## Source references

- Existing accepted Player View reference: `docs/STAGE-13G-PLAYER-VIEW-REFERENCE-ADOPTION.md` and `docs/reference-prototypes/euro28-player-view-prototype.html`.
- New Head-to-head prototype: `docs/reference-prototypes/euro28-head-to-head-page-prototype.html`.
- New Points Breakdown prototype: `docs/reference-prototypes/euro28-points-breakdown-page-prototype.html`.
- Expanded brief: `docs/reference-prototypes/euro28-stage13g-expanded-agent-prompt.md`.

## Confirmed gap

The Player View shape is accepted but not yet implemented as a dedicated route. Existing inline H2H exists, and Results already owns a reusable `PointsBreakdown` component, but there is no complete dedicated Player View with real Head-to-head and Points Breakdown sub-destinations.

## Implementation rules for Stage 13G-PLAYER-1

- Build `#/player/:userId` as the dedicated Player View opened from league rows and other player-entry points.
- Add real Head-to-head destination, e.g. `#/player/:userId/head-to-head?against=me`, using the existing `PlayerHeadToHead` / `loadLeagueHeadToHead` engine and vocabulary.
- Add real Points Breakdown destination, e.g. `#/player/:userId/points`, reusing `PointsBreakdown` from `src/results/ResultsPresentation.jsx` and `normalisePointsBreakdown` from `src/results/resultModel.js`.
- Keep Original Predictor and KO Predictor totals separate.
- Rewire league member-row entry from inline H2H to the dedicated Player View.
- Do not rebuild scoring, resolver or comparison engines.
- No migration expected.

## Legacy-pages retirement

`src/pages/Profile.jsx` is already retired. The expanded brief identifies the remaining `src/pages/` directory as legacy/quarantined. A future stage may retire it only after proving zero live imports and accounting for each file, including `AdminPanel.jsx`, `HeadToHead.jsx`, `PointsSummary.jsx` and `MatchStats.jsx`. Do not fold full directory deletion into an unrelated feature build.

## Completion rule

Do not move the ledger row “Player insight engine and points storytelling” to `✅ FUNCTIONAL` until the dedicated Player View, Head-to-head destination, Points Breakdown destination and league-row rewire are all live and audited.
