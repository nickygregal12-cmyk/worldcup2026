# Public Signup SMTP Readiness Contract

This contract records the custom SMTP readiness gate for the controlled public signup path. It preserves the external settings check and keeps public registration closed.

## Required markers

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
- Pre-SMTP capacity remains 50 users / 20 leagues
- Post-SMTP target remains 100 users / 20 leagues
- Post-SMTP review point remains 75 users / 15 leagues

## Safety boundary

This contract does not approve public opening. It does not configure SMTP, change Auth settings, change Supabase schema, add RPCs, alter RLS, use service-role credentials, change scoring or resolver behaviour, write fake results, write league data or create a migration. Active migrations remain 18 and Migration 019 is not created.
