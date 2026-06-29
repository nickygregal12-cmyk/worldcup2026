# Database development

## Current state

The Euro staging database starts from a clean migration history. The WC26
production schema and its historical hardening migration are reference material
only.

Active database files:

- `supabase/config.toml`
- `supabase/migrations/202606300001_euro28_core_tournament.sql`
- `supabase/seed.sql` (intentionally empty until the next data batch)

Archived reference:

- `supabase/reference/wc26-production-schema-20260630.sql`
- `supabase/reference/wc26-migrations/202606270001_harden_prediction_writes.sql`

Never move a reference SQL file back into `supabase/migrations` without a new
review.

## First migration scope

The initial migration creates only public tournament/reference structures:

- tournaments;
- teams and tournament slots;
- venues;
- stages and groups;
- group memberships;
- matches;
- bracket-facing match slots.

It does not create profiles, participants, predictions, leagues, scoring or
admin write access. Those will be separate migrations.

The canonical Euro row describes the confirmed 24-team, six-group tournament
format. Team assignments, venues, fixtures and dates remain separate and may be
provisional until reviewed.

## Security position

RLS is enabled on every table in the first migration.

Anonymous and authenticated clients receive read-only access to published
reference data. There are no browser insert, update or delete policies. Trusted
writes will be added deliberately in later migrations.

Run the local guard before every database command:

```bash
npm run db:safety
```

The guard fails if it finds the known WC26 production project reference in the
Euro environment or local Supabase link. It also checks that WC26-only bracket
and lock terms have not returned to the active migration directory.

## Local validation workflow

Docker Desktop must be running. The first `supabase start` can take several minutes while Docker images are downloaded.

```bash
npx supabase start
npm run db:safety
npx supabase db reset
```

`db reset` is safe here because it targets the local Supabase stack by default.
Do not add `--linked`.

After the reset, inspect the local Studio URL printed by `supabase start` and
confirm the migration created ten public tables, five stages and six groups.

## Staging deployment workflow

Do not deploy a migration to staging until it has passed local reset.

Before any remote operation, verify the linked project:

```bash
cat supabase/.temp/project-ref
```

The Euro staging project ref is:

```text
gcfdwobpnanjchcnvdco
```

The WC26 production ref must never appear in the Euro repository link or
environment.

Preview the remote migration plan first:

```bash
npx supabase db push --dry-run
```

Only after reviewing the dry run should the migration be pushed:

```bash
npx supabase db push
```

Never use `supabase db reset --linked` against staging or production.

## Migration rules

- Make every schema change through a new timestamped migration.
- Do not edit remote tables in the Supabase Dashboard.
- Do not mix schema creation with fake tournament scenario data.
- Keep repeatable local/staging test data in `supabase/seed.sql` or later
  scenario scripts.
- Review RLS and grants with every new table.
- Use stable slot codes and bracket rules rather than team names.
