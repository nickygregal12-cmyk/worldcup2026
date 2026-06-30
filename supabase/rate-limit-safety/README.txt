1. Run 01_api_sync_lock.sql now in the WC26 production Supabase SQL Editor.
2. Deploy the replacement Netlify files.
3. Keep all score/standings cron jobs disabled while the provider account is disabled.
4. After football-data.org restores access, press Sync Scores exactly once.
5. Confirm providerCalls is 1 or 2 and there are no duplicate Netlify log entries.
6. Only then create one schedule using 02_ENABLE_SCORE_CRON_LATER.sql.

Important: the example cron uses a database setting for the admin secret. Do not paste a secret into source control. If that setting is not configured, create the cron through the Supabase dashboard Vault/Secrets workflow instead.
