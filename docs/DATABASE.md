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

## Stage 8 competition model

Migration 010 corrects the Stage 7 combined model.

### Original predictor

- one `prediction_sets` row with `competition_key = 'original'`;
- 36 group score rows in `match_predictions`;
- five group jokers;
- 15 winner-only pre-tournament progression rows in `bracket_predictions`;
- no score, decision method or joker columns on bracket picks;
- one globally locked original competition.

### KO Predictor

- a separate `prediction_sets` row with `competition_key = 'ko_predictor'`;
- score predictions only for resolved real knockout fixtures;
- 90-minute score, advancing team and decision method;
- five separate jokers;
- independent revision, storage, future points total, leaderboard and winner.

Original and KO Predictor points must never be combined.

## Trusted writes

The browser has no direct write policies or table grants. It uses:

```text
public.save_my_prediction_bundle()
public.save_my_ko_prediction_bundle()
```

The original RPC validates group scores and the canonical winner-only bracket. The KO RPC validates actual resolved knockout participants, scores, advancement, method and its own joker cap.

## Locks and grace

- Original score and bracket content locks globally at the first tournament kick-off.
- Original group jokers may still move only among matches that have not started.
- KO Predictor rows and jokers lock per real knockout-match kick-off.
- Grace is scoped to one competition, one user and one unstarted match.
- Grant and revocation functions are service-role only and audited.

## Validation

```bash
npm run check
npx supabase db reset
npm run test:db:005:local
npm run test:db:006:local
npm run test:db:008:local
npm run test:db:009:local
npm run test:db:010:local
```

`db reset` must remain local. Never add `--linked`.
