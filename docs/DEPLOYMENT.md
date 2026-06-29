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
