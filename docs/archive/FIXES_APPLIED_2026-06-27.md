> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# WC26 Predictor fixes — 27 June 2026

## Main changes

- Added a **KO Pred** tab to the member-predictions modal. It shows another user's KO Predictor score picks only after each individual match has kicked off.
- Corrected score-sync fixture orientation and made completed-result corrections trigger a fresh points calculation.
- Preserved existing live scores when the provider temporarily returns no usable score.
- Made GitHub Actions fail visibly on unauthorised/failed score syncs.
- Replaced the public `VITE_ADMIN_FUNCTION_SECRET` flow with signed-in Supabase admin verification. Scheduled GitHub syncs use a server-only `ADMIN_FUNCTION_SECRET`.
- Added server-side ownership, kickoff and joker checks for group predictions and KO Predictor predictions.
- Added a server-side hard lock for the main knockout bracket and protected points/admin-managed profile fields.
- Added an atomic server-side offline-account claim, including group predictions, jokers, league membership and offline knockout picks.
- Fixed league-admin routing, the admin prepopulate request method, MatchStats league lookup, penalty-shootout elimination, goal-difference fallback and the missing live-league state setter.
- Centralised tournament phase dates and aligned the group-stage end date.
- Standardised the admin score preview to the normal 5-point exact / 3-point result rules.
- Retired the unused league-snapshot endpoint and removed its admin controls.

## Required one-time deployment steps

1. Apply `supabase/migrations/202606270001_harden_prediction_writes.sql` to the live Supabase project.
2. In Netlify, set a server-only `ADMIN_FUNCTION_SECRET` environment variable. Do not prefix it with `VITE_`.
3. Add the same value as a GitHub Actions repository secret named `ADMIN_FUNCTION_SECRET`.
4. Keep the existing Netlify server variables `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and `FOOTBALL_DATA_KEY` configured.
5. Push the code to GitHub; Netlify should deploy automatically.

## Verification completed

- `npm ci` completed successfully.
- `npm run build` completed successfully.
- Modified Netlify functions passed Node syntax checks.
- The selected newly changed claim/auth/sync files passed targeted ESLint checks.

## Not run against the live services

The Supabase migration, live football-data response and live Netlify/GitHub secret configuration could not be executed from the local audit copy. Test one admin manual sync and one locked-match prediction after deployment.
