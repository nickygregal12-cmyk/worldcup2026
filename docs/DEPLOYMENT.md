# Deployment

## Euro staging

```text
https://euro28-predictor-dev.netlify.app
gcfdwobpnanjchcnvdco
```

Never use the WC26 production Supabase project. Only the Euro URL and publishable key belong in browser variables.

## Stage 11 database deployment

Verify that only Migration 013 is pending:

```bash
cat supabase/.temp/project-ref
npx supabase db push --dry-run 2>&1 | tee /tmp/euro28-migration013-dry-run.txt
```

The dry run must list only:

```text
202607010013_euro28_leagues_and_shared_predictions.sql
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
npx supabase db lint --linked --schema public,private --level warning --fail-on error
```

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

The deployed page must expose private leagues, separate Original and KO Predictor tables, and lock-aware member comparison with no active WC26 application bundle.
