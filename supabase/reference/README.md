# WC26 Production Database Reference

`wc26-production-schema-20260630.sql` is a schema-only export of the live
WC26 Supabase database.

It is preserved for audit and migration planning only.

Do not run this file directly against the Euro 2028 staging or production
database. It contains WC26-specific scoring functions, bracket rules, lock
dates, policies and historical structures that must be reviewed and
generalised first.

The Euro database will be created through reviewed, version-controlled
migration files in `supabase/migrations`.
