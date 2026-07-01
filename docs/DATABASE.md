# Database development

## Current state

The Euro project has its own migration history. WC26 SQL under `supabase/reference/` is audit material only.

Active migrations:

1. `202606300001_euro28_core_tournament.sql`
2. `202606300002_euro28_provisional_group_slots.sql`
3. `202606300003_euro28_official_group_schedule.sql`
4. `202606300004_euro28_official_knockout_skeleton.sql`
5. `202607010005_euro28_prediction_storage.sql`
6. `202607010006_euro28_auth_profiles.sql`
7. `202607010007_euro28_auth_function_privileges.sql`
8. `202607010008_euro28_provisional_joker_caps.sql`
9. `202607010009_euro28_atomic_prediction_save.sql`

## Prediction storage

Migration 005 creates:

- versioned `scoring_rulesets`;
- one `prediction_sets` row per user and tournament;
- `match_predictions` containing 90-minute scores, separate knockout progression and joker allocation;
- audited `prediction_grace_windows`;
- the active ruleset pointer, contract version and monotonic `prediction_locked_at` field.

Both exact joker caps remain `NULL`. The current multiplier remains provisional at `2×`.

## Authentication and profiles

Migration 006 creates Auth-linked profiles, validated case-insensitively unique display names, an Auth creation trigger and controlled profile RPCs. Migration 007 removes unintended browser-role function grants and hardens future function defaults. Migration 008 restores both provisional joker caps to `NULL` after hosted drift was detected.

## Atomic prediction saving

Migration 009 adds:

- `prediction_sets.guest_imported_at`;
- `prediction_sets.last_save_source`;
- private resolver and validation helpers;
- authenticated RPC `public.save_my_prediction_bundle()`.

The RPC:

- derives the caller from `auth.uid()`;
- locks the tournament and the caller's prediction set while saving;
- requires a non-negative expected revision;
- rejects stale revisions;
- validates every supplied match and tournament-team reference;
- validates official group participants;
- reconstructs and validates the canonical knockout path;
- enforces active-ruleset joker caps;
- locks joker changes at each match kick-off;
- locks prediction content at the tournament global lock;
- permits content changes after global lock only through active grace for that user and match;
- keeps `submitted_at` reversible only before global lock;
- replaces omitted rows as part of one full-bundle transaction;
- permits explicit complete guest import only before lock and only when account rows do not already exist.

The browser receives `EXECUTE` on this RPC only. It still has no direct `INSERT`, `UPDATE` or `DELETE` privilege or policy on prediction tables. Private helper functions are unavailable to browser roles.

## Local validation

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
npm run test:db:009:local
```

`db reset` must remain local. Never add `--linked`.

## Staging deployment

Before a remote operation, verify:

```bash
cat supabase/.temp/project-ref
```

The only acceptable value is:

```text
gcfdwobpnanjchcnvdco
```

Capture the dry run, including stderr, and confirm that only Migration 009 is pending:

```bash
npx supabase db push --dry-run 2>&1 | tee /tmp/euro28-migration009-dry-run.txt
```

After deployment:

```bash
npx supabase migration list --linked
npm run test:db:005:linked
npm run test:db:006:linked
npm run test:db:008:linked
npm run test:db:009:linked
npx supabase db lint --linked --level warning
```

## Deliberate exclusions

Stage 6 does not add scoring runs, result entry, leagues, leaderboards, admin grace controls or the final prediction editor. The visible Stage 6 panel is a foundation check and explicit guest-import entry point. Stage 7 will provide the actual prediction journey.
