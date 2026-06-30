# Deployment

## Euro staging

- Netlify site: `euro28-predictor-dev`
- Production branch for that site: `euro28-development`
- Database: Euro 2028 Predictor Staging Supabase project

## Required browser variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_ENV=staging`
- `VITE_TOURNAMENT_ID=euro-2028-staging`
- `VITE_TOURNAMENT_YEAR=2028`

## Score syncing

Automatic score syncing is disabled in Euro staging. `netlify.toml` has no scheduled score-sync declaration, and the scheduled function also requires `ENABLE_SCORE_SYNC=true` before it can run.

Do not add WC26 API keys, service-role keys or production database credentials to the Euro Netlify site.


## Stage 2 foundation deployment

The staging site currently serves a read-only development foundation rather than the inherited WC26 application.

- Search indexing is blocked.
- The manifest uses browser display mode and has no feature shortcuts.
- The application does not register a service worker.
- Existing WC26 service-worker registrations and WC26 cache names are retired in the browser.

After a staging deploy, verify the public shell with:

```bash
npm run verify:foundation-page
```
