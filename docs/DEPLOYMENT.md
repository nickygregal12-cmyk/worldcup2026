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


## Authentication redirect configuration

In the Euro staging Supabase dashboard, set Authentication → URL Configuration to the Euro Netlify site only:

- Site URL: `https://euro28-predictor-dev.netlify.app`
- Redirect URL: `https://euro28-predictor-dev.netlify.app/**`
- Local redirects: `http://127.0.0.1:5173/**` and `http://localhost:5173/**`

Do not change the WC26 Supabase project. The hosted project should require email confirmation until the final launch configuration is reviewed.

## Foundation deployment

The staging site serves the isolated Euro foundation rather than the inherited WC26 application. Tournament reference and prediction tables remain read-only from the browser; Auth and controlled profile RPCs are active.

- Search indexing is blocked.
- The manifest uses browser display mode and has no feature shortcuts.
- The application does not register a service worker.
- Existing WC26 service-worker registrations and WC26 cache names are retired in the browser.

After a staging deploy, verify the public shell with:

```bash
npm run verify:foundation-page
```
