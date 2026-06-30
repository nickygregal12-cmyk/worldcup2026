-- DO NOT RUN WHILE THE FOOTBALL-DATA.ORG ACCOUNT IS DISABLED.
-- Run this only after one controlled manual sync succeeds.
-- This creates ONE schedule. It replaces all previous score-sync schedules.

SELECT cron.schedule(
  'sync-scores-safe-single-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wc26predictor1.netlify.app/.netlify/functions/sync-scores',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-secret', current_setting('app.settings.admin_function_secret', true)
    ),
    body := '{"source":"scheduled"}'::jsonb
  );
  $$
);
