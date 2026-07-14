# Stage 5 — Authentication and profiles

## Status

Implemented for the isolated Euro staging project.

- Profile migration: `202607010006_euro28_auth_profiles.sql`
- Privilege correction: `202607010007_euro28_auth_function_privileges.sql`
- Scoring drift correction: `202607010008_euro28_provisional_joker_caps.sql`
- Profile table: `public.profiles`
- Profile ownership: one row per `auth.users.id`
- Browser prediction writes: still disabled
- Guest prediction storage: still browser-only

## Delivered scope

Stage 5 provides:

- email and password account registration;
- email and password sign-in;
- sign-out;
- password-recovery email requests;
- recovery-link password updates;
- persistent Supabase browser sessions;
- one profile row for each Auth user;
- validated display names between 3 and 30 characters;
- case-insensitive display-name uniqueness;
- owner-only profile reads through RLS;
- display-name availability checking through a narrow RPC;
- authenticated display-name updates through a narrow RPC;
- no direct browser insert, update or delete grants on `profiles`;
- retention of the separate browser-only guest draft during every auth action.

## Profile creation

`on_auth_user_created_euro_profile` runs after a new `auth.users` row is created. The trigger uses the `display_name` supplied in sign-up metadata and inserts one validated `public.profiles` row.

Invalid or duplicate names fail at the database boundary. The client performs the same validation and an availability check first for a clearer user experience, but the unique database index remains authoritative.

Email addresses stay in the protected Auth schema and are not copied into `public.profiles`.

## Display-name rules

Display names:

- are trimmed;
- collapse repeated whitespace;
- contain 3–30 characters;
- must start and end with a letter or number;
- may contain letters, numbers, spaces, full stops, underscores, apostrophes and hyphens;
- are unique without case sensitivity.

`public.normalise_profile_display_name(text)` is the database authority. JavaScript validation mirrors the same user-facing contract.

## Security model

RLS is enabled on `public.profiles`.

Authenticated users may select only the row where `profiles.id = auth.uid()`. Anonymous users have no table read access. Neither `anon` nor `authenticated` receives direct table write privileges.

Profile renames use `public.update_my_profile_display_name(text)`, a `SECURITY DEFINER` RPC that:

- requires `auth.uid()`;
- validates and normalises the proposed name;
- updates only the authenticated user's row;
- relies on the database unique index for race-safe uniqueness.

The availability RPC returns only a boolean and never exposes another profile row.

Migration 007 explicitly removes role-specific `anon` and `authenticated` execution grants that existed on the linked staging project, restores only the intended RPC grants, and changes future `postgres` function defaults to opt-in browser execution. Migration 008 separately restores both provisional joker caps to unresolved `NULL` values after a linked data diagnostic found a stale group-stage cap of 8.

## Guest boundary

Signing up, signing in, signing out or resetting a password does not:

- clear local guest state;
- upload guest predictions;
- create a prediction set;
- import a guest bundle;
- write to `prediction_sets` or `match_predictions`.

The deliberate guest-to-account import step remains deferred until the trusted atomic prediction save route exists.

## Files

- `supabase/migrations/202607010006_euro28_auth_profiles.sql`
- `supabase/migrations/202607010007_euro28_auth_function_privileges.sql`
- `supabase/migrations/202607010008_euro28_provisional_joker_caps.sql`
- `supabase/tests/database/006_auth_profiles.test.sql`
- `src/auth/authValidation.js`
- `src/auth/euroAuthService.js`
- `src/auth/EuroAuthFoundation.jsx`
- `src/auth/index.js`
- `src/auth/__tests__/`
- `scripts/check-auth-foundation.mjs`

## Verification

```bash
npm run audit:auth
npm run audit:scoring-correction
npm run check
npm run test:db:006:local
npm run test:db:006:linked
npm run test:db:008:local
npm run test:db:008:linked
npx supabase db lint --linked --level warning
```

The application suite contains 146 passing tests across 21 files before the database integration tests are run. The Stage 5 database suite contains 39 pgTAP checks after privilege hardening.

## Hosted Auth configuration

The Euro Supabase project must allow these URLs in Authentication → URL Configuration:

- Site URL: `https://euro28-predictor-dev.netlify.app`
- Redirect URL: `https://euro28-predictor-dev.netlify.app/**`
- Local redirect: `http://127.0.0.1:5173/**`
- Local redirect: `http://localhost:5173/**`

Only the Euro staging project should be changed.

## Deliberately excluded from Stage 5

Stage 5 itself did not add:

- the atomic prediction save RPC;
- guest-to-account prediction import;
- direct browser writes to prediction tables;
- leagues or shared profile browsing;
- scoring runs or leaderboards;
- result entry or admin controls;
- social/OAuth providers;
- anonymous Supabase Auth accounts.

## Handover

Stage 6 now implements the trusted atomic full-bundle prediction save operation in Migration 009. Stage 7 is next and will connect the group and knockout prediction journey to that route.
