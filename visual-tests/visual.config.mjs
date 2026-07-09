// Central configuration for the visual tier. One page map drives capture,
// conformance diffing, regression and blessing — pages are added here, never
// hardcoded inside a runner.

// Frozen wall-clock instant for every capture. Pre-tournament relative to the
// canonical 2028-06-09T19:00Z lock, so the Home hero countdown renders a fixed
// number of days/hours/minutes. Date.now is pinned via Playwright's
// clock.setFixedTime; real timers still run, so the app loads normally.
export const FROZEN_INSTANT = '2026-07-01T12:00:00.000Z'

export const VIEWPORTS = Object.freeze([
  Object.freeze({ name: 'mobile-390', width: 390, height: 844 }),
  Object.freeze({ name: 'tablet-820', width: 820, height: 1180 }),
  Object.freeze({ name: 'desktop-1280', width: 1280, height: 900 }),
])

export const PREVIEW_PORT = 4184
// vite preview binds the localhost name (not 127.0.0.1) by default.
export const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`

// Anti-flake threshold for the regression gate: the share of pixels allowed to
// differ before a page fails. Deliberately tiny — determinism hardening should
// make real runs bit-identical; this only absorbs sub-pixel rasteriser drift.
export const REGRESS_MAX_DIFF_RATIO = 0.001

// Guest-reachable pages under visual contract. `prototype` names the binding
// reference in docs/reference-prototypes/ (null = no standalone prototype).
// `demo` marks the currently-approved v2 contracts used for the conformance
// demonstration; the rest join as their amendments are re-approved.
export const PAGES = Object.freeze([
  Object.freeze({ key: 'home', route: '#/', readyText: 'Predictions lock at kick-off', prototype: 'euro28-home-page-prototype-v2.html', demo: true }),
  Object.freeze({ key: 'groups', route: '#/groups', readyText: 'Group prediction progress', readySelector: '[data-contract="night-broadcast-groups"]', prototype: 'euro28-groups-page-prototype-v2.html', demo: true }),
  Object.freeze({ key: 'bracket', route: '#/bracket', readyText: 'Your pre-tournament bracket', prototype: 'euro28-bracket-page-prototype-v2.html', demo: true }),
  Object.freeze({ key: 'ko-predictor', route: '#/ko-predictor', readyText: 'KO Predictor', prototype: 'euro28-ko-predictor-prototype-v2.html', demo: true }),
  Object.freeze({ key: 'tournament', route: '#/tournament', readyText: 'Tournament', prototype: 'euro28-tournament-page-prototype.html', demo: false }),
  Object.freeze({ key: 'how-to-play', route: '#/how-to-play', readyText: 'Rules, scoring and trust', prototype: 'euro28-how-to-play-page-prototype.html', demo: false }),
  Object.freeze({ key: 'results', route: '#/results', readyText: 'Results', prototype: 'euro28-results-page-prototype.html', demo: false }),
  Object.freeze({ key: 'leaderboards', route: '#/leaderboards', readyText: 'Leaderboards', prototype: 'euro28-leaderboards-page-prototype.html', demo: false }),
  Object.freeze({ key: 'match-centre', route: '#/match-centre', readyText: 'Euro Match Centre', prototype: 'euro28-match-centre-page-prototype.html', demo: false }),
  Object.freeze({ key: 'welcome', route: '#/welcome', readyText: 'Euro 2028', prototype: 'euro28-welcome-page-prototype.html', demo: false }),
])

export const ARTIFACT_ROOT = 'visual-artifacts'
export const BASELINE_ROOT = 'visual-baselines'
export const RUN_RECORD_PATH = 'visual-tests/visual-run-record.json'

// Paths whose changes require the visual tier to re-run (the freshness audit
// hashes exactly this set; keep it aligned with .github/workflows/visual.yml).
export const WATCHED_GLOBS = Object.freeze([
  { root: 'src', test: file => file.endsWith('.css') || file.endsWith('.jsx') },
  { root: 'docs/reference-prototypes', test: file => file.endsWith('.html') },
  { root: 'visual-tests', test: file => file.endsWith('.mjs') },
  { root: 'visual-baselines', test: file => file.endsWith('.png') },
])
