> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# STAGE-PUBLIC-SIGNUP-SMTP-READINESS-1

Status: recorded.

This stage records custom SMTP as the next public-signup blocker before wider public registration. It does not configure SMTP, change external Auth settings or open public registration.

## SMTP readiness requirements

- STAGE-PUBLIC-SIGNUP-SMTP-READINESS-1
- Custom SMTP is the next public-signup blocker
- Custom SMTP must be configured before branded public email templates are relied on
- SMTP sender address must be approved before public opening
- SMTP reply-to/support destination must be approved before public opening
- Confirm sign-up email template must be checked after SMTP is configured
- Reset password email template must be checked after SMTP is configured
- Invite or magic-link email template must be checked if enabled
- Auth email templates must not mention WC26
- Auth email templates should mention Euro 2028 Predictor or stay generic
- No SMTP secrets may be committed
- No SMTP password, token, API key or provider secret may be printed in logs
- Email confirmation remains ON
- Public registration remains closed

## Capacity decision preserved

- Pre-SMTP capacity remains 50 users / 20 leagues
- Post-SMTP target remains 100 users / 20 leagues
- Post-SMTP review point remains 75 users / 15 leagues
- Capacity must be reviewed before increasing beyond the post-SMTP target

## Non-goals

This stage is docs/audit-only. It does not configure SMTP, does not edit external Auth settings, does not open signups, does not create users, does not write profile rows, does not seed predictions, does not write league data and does not publish service-role credentials.

No runtime route, Auth configuration, Supabase schema, RPC, RLS, service-role, browser write, scoring, resolver, result-entry, fake-result write, league-write or migration change is included.

Active migrations remain 18. Migration 019 is not created. WC26 production remains blocked. Original Predictor and KO Predictor remain separate.
