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
14. `202607020014_euro28_admin_control_room.sql`
15. `202607020015_euro28_team_profile_sheet.sql`
16. `202607030016_euro28_staging_time_phase_controls.sql`
17. `202607030017_euro28_player_insight.sql`
18. `202607030018_euro28_complete_admin_operations.sql`
19. `202607070019_euro28_league_single_competition.sql`
20. `202607080020_euro28_matches_venue_fk.sql`
21. `202607090021_euro28_venue_metadata.sql`
22. `202607180022_euro28_admin_tournament_simulator.sql`

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

## Stage 12 control-room model

```text
tournament_feature_controls
admin_operation_events
prediction_grace_windows
```

Five feature controls are seeded for every current tournament:

```text
prediction_saving
ko_predictor
league_create_join
result_entry
scoring_recalculation
```

Browser roles have no direct table writes. Owner changes use `admin_update_feature_control()` with an optimistic revision and required audit note.

### Enforcement

- `prediction_sets_feature_guard` blocks Original or KO saving below the browser service layer.
- `leagues_create_feature_guard` and `league_members_join_feature_guard` block new leagues and joins.
- `match_result_events_feature_guard` blocks manual browser result entry.
- `admin_recalculate_match_points()` checks the explicit recalculation control.
- service-role recovery remains available because the browser guards require an authenticated user claim.

### Owner-only operations

```text
admin_apply_global_prediction_lock()
admin_update_feature_control()
admin_search_prediction_users()
admin_grant_prediction_grace()
admin_revoke_prediction_grace()
```

The global lock is monotonic and cannot be cleared. Grace remains scoped to one user, one competition and one unstarted match.

### Read-only operational review

```text
admin_get_tournament_control_room()
admin_list_prediction_grace()
admin_list_operation_events()
```

The control room reports tournament health, knockout slot resolution and per-match joker lock/allocation counts. Results administrators may read this information but owner access is required for safety-control changes.

## Stage 11 lint correction

Migration 014 removes the redundant `attempt` declaration in `create_my_league()` and replaces volatile `clock_timestamp()` calls inside the stable shared-prediction builder with `statement_timestamp()`.

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
npm run test:db:014:local
```

`db reset` must remain local. Never add `--linked`.
