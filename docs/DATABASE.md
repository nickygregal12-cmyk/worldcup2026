# Database development

## Current state

The Euro staging database uses its own clean migration history. WC26 production SQL remains reference material only.

Active migrations:

1. `202606300001_euro28_core_tournament.sql`
2. `202606300002_euro28_provisional_group_slots.sql`
3. `202606300003_euro28_official_group_schedule.sql`
4. `202606300004_euro28_official_knockout_skeleton.sql`
5. `202607010005_euro28_prediction_storage.sql`
6. `202607010006_euro28_auth_profiles.sql`
7. `202607010007_euro28_auth_function_privileges.sql`
8. `202607010008_euro28_provisional_joker_caps.sql`

Migration 005 adds the read-secured prediction storage foundation. Migration 006 adds Auth-linked profiles and controlled profile RPCs. Migration 007 explicitly corrects browser-role function privileges on the linked staging project and hardens default privileges for future functions. Migration 008 restores both exact joker caps to unresolved `NULL` values after linked staging drift was detected. All must be reset-tested and deployed only to Euro staging.

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


## Migration 006 scope

Migration 006 creates:

- one `profiles` row per `auth.users` row;
- validated and case-insensitively unique display names;
- the `on_auth_user_created_euro_profile` trigger;
- owner-only profile read RLS;
- a boolean display-name availability RPC;
- an authenticated owner-only display-name update RPC.

Anonymous users cannot read profile rows. Authenticated users receive `SELECT` only, constrained by RLS. Direct browser table inserts, updates and deletes remain revoked. Prediction-table grants and policies are unchanged.

## Migration 007 scope

Migration 007 corrects a linked-project privilege difference discovered by pgTAP. Existing Supabase projects can automatically grant new `public` functions to `anon` and `authenticated`. The migration:

- revokes browser-role execution from internal trigger and validation functions;
- keeps display-name availability callable by `anon` and `authenticated`;
- keeps profile rename callable only by `authenticated`;
- changes `postgres` default privileges so future public functions are not browser-callable unless explicitly granted.

## Migration 008 scope

Migration 008 corrects one hosted data value only. The canonical provisional ruleset had drifted to `group_stage_joker_cap = 8` while the agreed decision remains unresolved. The migration:

- requires exactly one `euro28-scoring-provisional-v2` row;
- requires that row to remain `provisional`;
- sets both `group_stage_joker_cap` and `knockout_joker_cap` to `NULL`;
- changes no point values, multiplier, ruleset status, lock or table privilege.

## Security position

RLS is enabled on every table.

Published tournament reference data and published scoring configuration have controlled read policies. Prediction and grace data have authenticated read policies only. Migration 005 grants no direct browser insert, update or delete privileges and creates no browser write policies.

The later atomic full-bundle save operation must be a separately reviewed migration or server route. Stage 5 profile RPCs must not be reused as a prediction write path.

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
npm run test:db:005:local
npm run test:db:006:local
npm run test:db:008:local
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

After Migration 007 is hosted, the scoring-ruleset correction dry run must list only Migration 008. Then apply it:

```bash
npx supabase db push
```

Verify migration history and hosted schema behaviour:

```bash
npx supabase migration list --linked
npm run test:db:005:linked
npm run test:db:006:linked
npm run test:db:008:linked
npx supabase db lint --linked --level warning
```

Never run `npx supabase db reset --linked`.

## Stage 3, Stage 4 and Stage 5 database position

The canonical tournament resolver lives in `src/resolver/` and reads plain input objects. It does not connect to Supabase, mutate `match_slots` or persist resolved brackets.

Stage 4 adds a read-only adapter for public tournament teams, group memberships, matches and match-slot rules. The resulting guest reference model is held in memory. Guest predictions are stored only in browser `localStorage`; they are never written to Supabase.

No database push was required for Stage 3 or Stage 4. Stage 5 uses Migration 006 for profiles, Migration 007 for linked-project function privilege hardening and Migration 008 for the provisional joker-cap drift correction, bringing the active migration count to eight.

## Migration rules

- Every schema change uses a new timestamped migration.
- Do not edit hosted tables manually in the Dashboard.
- Do not mix fake scenario data into schema migrations.
- Review RLS, grants and function execution privileges with every migration.
- Keep the scheduled global lock separate from the persisted monotonic lock.
- Keep prediction content locks separate from per-match joker timing.
- Keep guest predictions in browser storage only.
