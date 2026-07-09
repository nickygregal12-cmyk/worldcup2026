> **PACK SNAPSHOT — do not work from this copy.** Part of the locked v9 install pack, frozen at its 2026-07-06 state. If a canonical version exists it lives outside the pack (docs/ or docs/archive/); a filename search that lands here should follow the canonical copy.

# Home and missing-surfaces build brief — extracted decisions

Source: `Euro 2028 Predictor Build Brief.pdf`.

## Current context

- Work on Euro 2028 Predictor only.
- Branch: `euro28-development`.
- Known audited package head from design workshop: `96a9624 Record approved visual contracts`.
- Staging site: `https://euro28-predictor-dev.netlify.app`.
- Staging Supabase project: `gcfdwobpnanjchcnvdco`.
- Current database state: 18 active migrations; no Migration 019; Migration 019 not approved.
- WC26 production must remain untouched and fail-closed.

## Hard build boundaries

Do not change Supabase schema unless explicitly scoped later. Do not create a migration. Do not create Migration 019.

Do not change scoring, resolver, Auth, Supabase configuration, service-role tooling, RLS, database functions or WC26 production.

## Visual direction

Preserve the approved Night Broadcast Euro identity, premium football dashboard feel, mobile-first card structure, existing shell/nav assumptions, and fresh blue semantic-token direction.

The work should make the app clearer, smoother and more complete, not like a redesign.

## Functional smoothness

A page matching the design is not enough if it briefly shows wrong dynamic content before correcting.

Dynamic pages must render the correct state immediately or show a neutral loading/skeleton state until the correct state is known.

## Result correction rule

Matches should not normally need corrected.

Result correction should not be treated as a planned everyday Home feature.

Correction handling may still exist as an admin/internal safety fallback, but Home should not promote “result corrected” as normal content.

Only if an exceptional correction has genuinely happened and affected visible points should the app calmly explain it in the most relevant place, such as Results, Match Centre or Points Breakdown.

Home does not need a standing result-correction card.

## Product hierarchy

The app has two separate competitions:

- Original Predictor: main competition and product priority.
- KO Predictor: separate secondary competition once real knockout fixtures are ready.

Original and KO points must never combine.

Bottom nav remains:

Groups — Bracket/KO — Home — Leagues — More

Do not add Review Picks, Prediction Trends, Welcome, Match Centre, Team Profile, Bracket Health, Activity, Support, Privacy or Settings to bottom nav.

## Recommended build stages

Suggested package name: `STAGE-HOME-AND-MISSING-SURFACES-1`.

Can be split into:

- `STAGE-HOME-CLARITY-1`.
- `STAGE-REVIEW-PICKS-1`.
- `STAGE-PREDICTION-TRENDS-1`.
- `STAGE-WELCOME-AND-JOIN-1`.

If keeping risk low, do Home first, then Review, then Prediction Trends, then Welcome.

## Missing/high-value surfaces

- Review Picks.
- Prediction Trends.
- Welcome / onboarding.
- Invite / join league states.
- League Settings / Manage League.
- Activity / Updates.
- Match Centre trends section.
- Support and Privacy routes/entries before public signup opens.

## Do not revive old WC26 pages as-is

- `GlobalStats.jsx` / `/stats` should become `/#prediction-trends`.
- Tournament Pulse is reference only for Prediction Trends.
- `Awards.jsx` folds into Review and Prediction Trends.
- `MatchStats.jsx` folds into Match Centre.
- `Predictions.jsx` becomes Groups / Bracket / Review.
- `PointsSummary.jsx` becomes Points Breakdown / Player View.
- old `HeadToHead.jsx` uses active Player View / H2H destination.
- `PublicLeague.jsx` becomes invite/join states.
- old `Home.jsx` should not replace active HomeDashboard.

## Main principle

Keep the current design, but make the app feel like it knows exactly what the user should do next.
