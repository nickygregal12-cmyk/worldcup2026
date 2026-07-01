# Deployment

## Euro staging

The Euro branch deploys to:

```text
https://euro28-predictor-dev.netlify.app
```

It must use only Supabase project:

```text
gcfdwobpnanjchcnvdco
```

## Browser variables

Only the Euro project URL and publishable key belong in Netlify browser variables. Never use a service-role secret in a `VITE_` variable.

## Authentication redirects

Supabase Auth URL configuration must include:

```text
Site URL
https://euro28-predictor-dev.netlify.app

Redirect URLs
https://euro28-predictor-dev.netlify.app/**
http://127.0.0.1:5173/**
http://localhost:5173/**
```

## Migration 009 deployment

Verify the linked reference, capture the dry run and continue only when Migration 009 is the sole pending migration:

```bash
cat supabase/.temp/project-ref
npx supabase db push --dry-run 2>&1 | tee /tmp/euro28-migration009-dry-run.txt
```

After pushing:

```bash
npx supabase migration list --linked
npm run test:db:005:linked
npm run test:db:006:linked
npm run test:db:008:linked
npm run test:db:009:linked
npx supabase db lint --linked --level warning
```

## Netlify verification

After the branch deploy completes:

```bash
npm run verify:foundation-page
```

The page must identify the Stage 6 atomic saving foundation, include the guest bundle and Euro Auth UI, and contain no active WC26 application bundle.

## Score syncing

WC26 automatic score syncing remains disabled on the Euro branch. Stage 6 adds no result provider and no result-writing job.
