# Database development

## Active migrations

1. `202606300001_euro28_core_tournament.sql`
2. `202606300002_euro28_provisional_group_slots.sql`
3. `202606300003_euro28_official_group_schedule.sql`
4. `202606300004_euro28_official_knockout_skeleton.sql`
5. `202607010005_euro28_prediction_storage.sql`
6. `202607010006_euro28_auth_profiles.sql`
7. `202607010007_euro28_auth_function_privileges.sql`
8. `202607010008_euro28_provisional_joker_caps.sql`
9. `202607010009_euro28_atomic_prediction_save.sql`
10. `202607010010_euro28_competition_split_and_jokers.sql`
11. `202607010011_euro28_results_scoring_leaderboards.sql`
12. `202607010012_euro28_admin_results_operations.sql`
13. `202607010013_euro28_leagues_and_shared_predictions.sql`

## Competition model

### Original Predictor

- 36 group score rows in `match_predictions`;
- five group jokers;
- 15 winner-only rows in `bracket_predictions`;
- group-match and bracket milestone points;
- its own total and leaderboard.

### KO Predictor

- a separate `prediction_sets` row;
- 15 real knockout-match predictions;
- five separate jokers;
- score, advancing-team and method points;
- its own total and leaderboard.

No database total combines the two competitions.

## Private league model

```text
leagues
league_members
```

One league membership list supports both competition tabs. `get_league_standings()` always receives either `original` or `ko_predictor`; there is no combined key or combined total.

Browser league operations use:

```text
create_my_league()
join_league_by_code()
leave_my_league()
delete_my_league()
get_my_leagues()
get_league_standings()
get_league_member_predictions()
get_member_predictions_after_lock()
```

RLS is enabled on both league tables. Authenticated browsers have no direct table read or write grants.

## Prediction visibility

- Original league comparisons require the persisted global `prediction_locked_at`.
- KO Predictor comparisons return only matches whose kick-off has passed or whose canonical status shows they have started.
- Users outside the league cannot read its private standings or league-member route.
- Signed-in overall-leaderboard users may view another predictor only after the same lock rules pass.
- Email addresses and auth metadata are never returned.

## Canonical results and scoring

Current result fields remain on `public.matches`. Result revisions, point ledgers and separate competition totals continue to use the Stage 9 and Stage 10 trusted functions. League reads consume `prediction_totals`; they do not recalculate or mutate points.

## Validation

```bash
npm run check
npx supabase db reset
npm run test:db:005:local
npm run test:db:006:local
npm run test:db:008:local
npm run test:db:009:local
npm run test:db:010:local
npm run test:db:011:local
npm run test:db:012:local
npm run test:db:013:local
```

`db reset` must remain local. Never add `--linked`.
