# Database development

## Current state

The Euro staging database uses its own clean migration history. WC26 production SQL remains reference material only.

Active migrations:

1. `202606300001_euro28_core_tournament.sql`
2. `202606300002_euro28_provisional_group_slots.sql`
3. `202606300003_euro28_official_group_schedule.sql`
4. `202606300004_euro28_official_knockout_skeleton.sql`
5. `202607010005_euro28_prediction_storage.sql`

Migration 005 adds the read-secured prediction storage foundation. It does not add the final prediction save route.

Archived WC26 reference:

- `supabase/reference/wc26-production-schema-20260630.sql`
- `supabase/reference/wc26-migrations/202606270001_harden_prediction_writes.sql`

Never move a reference SQL file into `supabase/migrations` without creating and reviewing a new Euro migration.

## Migration 005 scope

Migration 005 creates:

- versioned `scoring_rulesets`;
- one `prediction_sets` row per user and tournament;
- `match_predictions` with 90-minute scores, separate knockout progression and joker allocation;
- audited `prediction_grace_windows`;
- an active ruleset pointer and contract version on `tournaments`;
- a persisted monotonic `prediction_locked_at` field.

The provisional ruleset stores the current points and `2×` joker multiplier. Group-stage and knockout joker caps remain `NULL` until approved.

## Security position

RLS is enabled on every table.

Published tournament reference data and published scoring configuration have controlled read policies. Prediction and grace data have authenticated read policies only. Migration 005 grants no direct browser insert, update or delete privileges and creates no browser write policies.

The later atomic full-bundle save operation must be a separately reviewed migration or server route.

Run the guard before every database command:

```bash
npm run db:safety
```

## Local validation workflow

Docker Desktop must be running.

```bash
cd ~/Desktop/euro28predictor
git switch euro28-development
npm run check
npx supabase start
npm run db:safety
npx supabase db reset
npx supabase test db --local supabase/tests/database/005_prediction_storage.test.sql
```

`db reset` is safe only because it targets the local Supabase stack by default. Never add `--linked`.

## Staging deployment workflow

Before every remote operation:

```bash
cat supabase/.temp/project-ref
```

The only acceptable project ref is:

```text
gcfdwobpnanjchcnvdco
```

Preview the migration plan:

```bash
npx supabase db push --dry-run
```

The dry run must list only Migration 005. Then apply it:

```bash
npx supabase db push
```

Verify migration history and hosted schema behaviour:

```bash
npx supabase migration list --linked
npx supabase test db --linked supabase/tests/database/005_prediction_storage.test.sql
npx supabase db lint --linked --level warning
```

Never run `npx supabase db reset --linked`.

## Migration rules

- Every schema change uses a new timestamped migration.
- Do not edit hosted tables manually in the Dashboard.
- Do not mix fake scenario data into schema migrations.
- Review RLS, grants and function execution privileges with every migration.
- Keep the scheduled global lock separate from the persisted monotonic lock.
- Keep prediction content locks separate from per-match joker timing.
- Keep guest predictions in browser storage only.
