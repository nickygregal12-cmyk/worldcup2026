# Deployment

## Euro staging

```text
https://euro28-predictor-dev.netlify.app
gcfdwobpnanjchcnvdco
```

Never use the WC26 production Supabase project. Only the Euro URL and publishable key belong in browser variables.

## Stage 10 database deployment

Verify that only Migration 012 is pending:

```bash
cat supabase/.temp/project-ref
npx supabase db push --dry-run 2>&1 | tee /tmp/euro28-migration012-dry-run.txt
```

The dry run must list only:

```text
202607010012_euro28_admin_results_operations.sql
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
npx supabase db lint --linked --schema public,private --level warning --fail-on error
```

Administrator assignment is a separate trusted SQL step after Migration 012. Never put a service-role key in Netlify or browser environment variables.

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

The deployed page must expose Stage 10 secure admin operations above canonical results and separate leaderboards, with no active WC26 application bundle.
