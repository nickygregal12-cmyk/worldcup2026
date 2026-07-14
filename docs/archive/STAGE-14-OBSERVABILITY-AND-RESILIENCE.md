> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Euro 2028 Predictor — Stage 14
## Observability and resilience

## Status

Implemented in this package from the deployed Stage 13E checkpoint.

- Starting migrations: 15.
- Ending migrations: 15.
- Database change: none.
- WC26 application and Supabase project: untouched and blocked.

## Delivered boundaries

### Root application recovery

`AppErrorBoundary` wraps the active Euro application. A render failure now presents a usable recovery screen rather than a blank application. The user can retry the current screen or reload the app. When Sentry is configured, the screen displays the generated event reference. In local Vite development, append `?stage14_error=1` once to exercise this boundary safely; the query is removed before the retry control is used.

Browser `error` and `unhandledrejection` events use the same reporting path. Duplicate captures of the same `Error` object are suppressed. Query strings, URL fragments, email addresses and obvious token/password/key values are redacted before transmission.

### Netlify function reporting

The new Euro health and scheduled-heartbeat functions use the same optional Sentry-compatible envelope boundary. Monitoring failures never replace the function's own response path. No DSN, auth token, Supabase key or service-role credential is stored in Git.

### Health endpoint

`/.netlify/functions/health` is a read-only endpoint. It checks:

1. that the Netlify function runtime is responding;
2. that the public Euro staging tournament row can be read through the anon/RLS boundary.

It performs no database write and never uses the service-role key. A healthy response returns HTTP 200. A failed or malformed database response returns HTTP 503 with a restricted diagnostic message.

### Scheduled heartbeat

`scheduled-heartbeat` runs hourly through `netlify.toml`. It requests the deployed health endpoint and validates the complete payload before accepting it. A degraded or malformed response returns failure and is reported to Sentry when configured.

### Admin runtime health

The protected Euro control room includes a runtime heartbeat panel. It keeps the existing database operational-health controls and adds a separate deployment/application check. The panel has loading, healthy, degraded and retry states. When the browser DSN is configured, the owner can send one deliberate test event and use its reference to verify ingestion and source-map symbolication.

### Zod validation

Zod is now an explicit production dependency. Validation is applied at the active Euro external boundaries:

- foundation tournament reads;
- profiles;
- Original Predictor storage and save responses;
- KO Predictor storage, points and save responses;
- prediction grace rows;
- canonical results, leaderboards, points and shared predictions;
- league lists, standings and member bundles;
- Team Profile Sheet payloads;
- administrator read contracts;
- health endpoint and scheduled heartbeat payloads.

The quarantined inherited WC26 functions and routes remain inactive and are not retrofitted or activated.

## Sentry configuration

All values are configured in Netlify environment settings. Do not commit real values.

Browser/runtime reporting:

- `VITE_OBSERVABILITY_ENABLED=true`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT=staging`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT=staging`

Release source maps:

- `SENTRY_AUTH_TOKEN` — server-only secret with release/project upload scope;
- `SENTRY_ORG`;
- `SENTRY_PROJECT`;
- optional `SENTRY_RELEASE`; Netlify `COMMIT_REF` is used when it is absent.

Source maps are generated only when the release-upload configuration is complete. The build creates the release, uploads JavaScript and map files, and removes local `.map` files before the deploy directory is published. With no Sentry release variables, source-map generation and upload are skipped safely. A partially configured release upload fails the build rather than deploying public source maps.

## Acceptance

Run:

```bash
npm run audit:observability
npm run check
```

After deployment verify:

```bash
curl -fsS https://euro28-predictor-dev.netlify.app/.netlify/functions/health
npm run verify:foundation-page
```

The endpoint must report `service: euro28-predictor`, `status: ok`, and healthy application/database checks.

## Deferred

- A real Sentry event and source-map symbolication check requires the product owner's Sentry project and Netlify environment configuration.
- External football result-provider validation remains deferred to Stage 18B.
- Browser end-to-end automation begins in Stage 15.
