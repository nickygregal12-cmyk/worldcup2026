# Supabase database files

- `migrations/` contains only active Euro 2028 migrations, applied in timestamp
  order.
- `reference/` contains WC26 audit material and must never be executed as an
  active migration.
- `seed.sql` will be added with the provisional test tournament dataset after
  the core schema has passed local and staging validation.

Read `docs/DATABASE.md` before running any Supabase command.
