# Project Control Dashboard

Live repo-control dashboard for future agents. This is not a long history file.
This document is the ONLY current-state summary; `check-governance-coherence.mjs`
anchors return-point coherence to the "Latest verified commit" row below, so
updating this dashboard in the same commit as the change is mandatory, not polite.

## Current State

| Item | Current value |
| --- | --- |
| Project | Euro 2028 Predictor |
| Branch | `euro28-development` |
| Current stage | Repo hygiene and documentation consolidation (post structural-health-check remediation) |
| Latest verified commit | `9781ec2 Execute the contained dead-code backlog: files, dependencies, orphan CSS` |
| Current deployment URL | `https://euro28-predictor-dev.netlify.app` |
| Active migration count | 21 |
| Latest migration | `202607090021_euro28_venue_metadata.sql` — applied locally AND on Euro staging |
| Staging data parity | Full parity with local at 21 migrations (slots, kickoffs, Scotland profile, venue host nations) — see reports/REPORT-STAGING-RECONCILE-2026-07-09.md |
| Immediate priority | Owner re-approval of mid-amendment prototypes, then visual-baseline blessing |
| Next recommended stage | Prototype re-approval + `npm run visual:bless`, then continue feature/design work on a clean base |

## Current Blockers

- Public signup remains closed; SMTP/public-opening work is not approved.
- Visual regression gate is built but NOT ARMED: baselines await prototype re-approval and owner blessing (`visual-baselines/README.md`).
- Several reference prototypes are mid-amendment pending owner re-approval.

## Verification Tiers

- `npm run check` — every commit: 124 audits, lint, unit tests, build. Green at the verified commit above.
- `npm run check:visual` — before any commit touching `src/**/*.css`, JSX layout or `docs/reference-prototypes/`; enforced by `audit:visual-freshness` in the main chain (armed once baselines are blessed).
- Database tests (`test:db:*`) — when Supabase schema work happens.

## Do-Not-Touch Areas

- Production config and production data; WC26 production project (`ouhxawizadnwrhrjppld`) is blocked outright.
- Scoring logic, resolver logic, Supabase Auth, public signup — unless explicitly scoped by Nicky.
- `docs/archive/` — frozen history; never edited to track later state.
- Quarantined legacy layer (`src/pages/`, `src/components/`, `src/store/`, `src/hooks/` and the audit-protected contract records) — see `scripts/check-legacy-boundary.mjs`.

## Source-Of-Truth Rules

- Docs report proven reality, but docs are not proof alone.
- The living document set and each document's single job are indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`; anything in `docs/archive/` is historical evidence only.
- If repo/runtime/tests/audits/build/deployment/Supabase disagree with docs, stop and record the conflict.
