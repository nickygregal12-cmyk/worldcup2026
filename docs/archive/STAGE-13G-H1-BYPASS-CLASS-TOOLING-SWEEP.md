# Stage 13G-H1 — Bypass-class tooling sweep

Date: Saturday 4 July 2026
Starting checkpoint: `dbdcc7d Correct 13G records and constitution`
Scope: tooling, architecture gates and governing-record enforcement
Database change: none
Migration 019: none

## Accepted changes

- `.env.example` now defaults `VITE_ENABLE_TIME_TRAVEL=false`. Staging-only owner time travel must be enabled deliberately in local or hosted environment configuration.
- Vitest coverage uses the current live `src/` actuals as a no-decrease ratchet: lines 57.7, statements 57.7, functions 78.53 and branches 68.48.
- Coverage excludes quarantined legacy pages/components, the old store, assets and deterministic visual fixtures.
- `eslint-disable` use is now governed: every disable must carry a reason after `--`, total disables are capped at 38 and live non-test disables are capped at 23. If either count falls, the cap must fall in the same commit.
- Deterministic visual fixtures remain outside the production graph. The root-mounted `Stage14ErrorFixture` is the only allowed error-boundary fixture and is gated to `import.meta.env.DEV`.
- Size governance is clarified as review guidance at roughly 200 JSX/JS lines and 250 CSS lines, with 400 lines as the enforced hard cap.
- Test fixtures now share the hard cap. `src/testFixtures/stage13dVisualFixture.js` has a temporary exact 468-line cap and must ratchet down when split.
- Frozen compatibility stylesheets remain exact caps. Any screen rework that touches a compat-styled screen must migrate that screen's styling to modules and lower the relevant cap when lines are removed.
- Existing `xlsx` audit debt remains reviewed and unchanged because npm reports no fix available. No forced dependency repair is permitted in this slice.

## Acceptance evidence required

- `npm run audit:h1-bypass-governance`
- `npm run audit:coverage`
- `npm run audit:architecture`
- full `npm run check`
- active migrations remain 18
- no Migration 019
