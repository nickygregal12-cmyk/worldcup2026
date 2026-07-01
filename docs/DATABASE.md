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

## Competition model

### Original predictor

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

## Canonical results

Current result fields remain on `public.matches`. Migration 011 adds result status, revision and confirmation metadata. `match_result_events` is the append-only correction history.

Only service role may call:

```text
private.euro28_record_match_result()
private.euro28_recalculate_points()
```

Only completed and confirmed results score. Void, pending and manual-review results do not score.

## Scoring storage

```text
scoring_runs
prediction_match_points
prediction_bracket_points
prediction_totals
```

Recalculation replaces point rows for the affected result revision and then rebuilds totals. It does not increment an existing total.

Authenticated reads use:

```text
public.get_competition_leaderboard()
public.get_my_competition_points()
```

Direct browser writes to result and scoring tables remain unavailable.

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
```

`db reset` must remain local. Never add `--linked`.
