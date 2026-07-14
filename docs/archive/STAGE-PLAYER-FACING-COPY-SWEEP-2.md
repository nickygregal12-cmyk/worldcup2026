# STAGE-PLAYER-FACING-COPY-SWEEP-2

## Status

Accepted as a controlled copy/audit repair before continuing to `STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET`.

## Reason

Manual review found several player-facing strings that were accurate but still read like product, implementation or audit language. The issue was wider than the Groups page and affected Groups, Original Bracket, Results, Leaderboards, Account, How to Play and KO Predictor surfaces.

## Player-facing copy changes

The sweep replaces internal/spec-style phrases such as `Predicted context`, `Scoring boundary`, `model feeds`, `prediction context`, `live UI`, `stored here`, `never blended`, and `One ruleset everywhere` with plain user language.

Examples of accepted replacement wording:

- `The top two teams qualify automatically. The best third-place teams can also reach the knockouts.`
- `Your group predictions decide this bracket. Live results will not change your saved picks.`
- `This bracket is winner picks only. Scores and jokers are handled in KO Predictor.`
- `Pick the team that goes through. Scores and methods are not needed here.`
- `Follow official results without changing your saved predictions.`
- `Live scores, confirmed results and corrections are shown separately from your picks.`
- `Track Original Predictor and KO Predictor separately. Each table has its own points race.`
- `Once picks lock, this action is no longer available.`
- `A simple guide to the two competitions, scoring, lock times, result corrections and account privacy.`

## Audit coverage

A new `audit:player-facing-copy-sweep-2` gate checks the active player-facing roots for the exact internal phrases found during review and confirms the replacement copy is present. It is wired into `npm run check`.

## Safety boundary

This is a copy/docs/audit repair only.

No scoring, resolver, Supabase write, Auth, service-role, fake-result, league-write or migration change is introduced. Original Predictor and KO Predictor remain separate. Active migrations remain 18 and no Migration 019 is created.
