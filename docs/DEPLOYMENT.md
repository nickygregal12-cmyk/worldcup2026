# Deployment


## Required pre-migration backup

Before every future hosted migration, create and verify a fresh Euro staging logical backup:

```bash
cd ~/Desktop/euro28predictor
npm run db:backup -- --label pre-migration-<number>
```

Record the printed backup directory in the migration completion notes. The backup must complete before the remote dry run. Full instructions and the destination-guarded restore rehearsal are in `docs/DATABASE-BACKUP-AND-RESTORE.md`.

## Euro staging

```text
https://euro28-predictor-dev.netlify.app
gcfdwobpnanjchcnvdco
```

Never use the WC26 production Supabase project. Only the Euro URL and publishable key belong in browser variables.

## Stage 12 database deployment

Verify that only Migration 014 is pending:

```bash
cat supabase/.temp/project-ref
npx supabase db push --dry-run 2>&1 | tee /tmp/euro28-migration014-dry-run.txt
```

The dry run must list only:

```text
202607020014_euro28_admin_control_room.sql
```

After push:

```bash
npx supabase migration list --linked
npm run test:db:005:linked
npm run test:db:006:linked
npm run test:db:008:linked
npm run test:db:009:linked
npm run test:db:010:linked
npm run test:db:011:linked
npm run test:db:012:linked
npm run test:db:013:linked
npm run test:db:014:linked
npm run check
npx supabase db lint --linked --schema public,private --level warning --fail-on error
```

## Administrator bootstrap

Tournament admin access remains service-managed. The browser cannot grant owner or results-admin access. Use the explicit Euro staging grant, verification and revocation procedure in `docs/STAGING-ADMIN-ACCESS.md`. Generate the SQL locally with `npm run admin:staging:sql -- ...`, review it, verify project ref `gcfdwobpnanjchcnvdco`, and run it only through the Euro staging SQL Editor.

## Auth redirects

```text
Site URL
https://euro28-predictor-dev.netlify.app

Redirect URLs
https://euro28-predictor-dev.netlify.app/**
http://127.0.0.1:5173/**
http://localhost:5173/**
```

## Netlify verification

```bash
npm run verify:foundation-page
```

The deployed page must expose the current product-branded app shell, retain the protected control room, keep Original and KO points separate and contain no active WC26 application bundle.
## Stage 13A frontend deployment

Stage 13A v6 contains no database migration. Confirm both commands print nothing:

```bash
git status --short -- supabase/migrations
git diff --name-only -- supabase/migrations
```

Do not run `npx supabase db push` for this batch. After Netlify deploys the committed branch, run:

```bash
npm run verify:foundation-page
```

The deployed build must show the product-branded app shell and Home dashboard, retain all protected Stage 12 operations and contain no active WC26 bundle.

## Stage 13B deployment note

Stage 13B is frontend-only. Confirm `supabase/migrations` is unchanged, run `npm run audit:groups-predictor` and the full `npm run check`, then deploy through the existing `euro28-development` Netlify flow. No Supabase reset, dry run or push is required.


## Stage 13C deployment note

Stage 13C is frontend-only. Confirm `supabase/migrations` is unchanged, run `npm run audit:knockout-experiences` and the full `npm run check`, then deploy through the existing `euro28-development` Netlify flow. No Supabase reset, dry run or push is required. After deployment, `npm run verify:foundation-page` must confirm the permanent predicted Bracket and separate real-fixture KO Predictor match centre.
