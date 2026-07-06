# Public Signup Implementation Contract

Stage: STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1

This contract records the first safe implementation step for public signup. It does not open wider public registration.

## Implemented now

- client-side pre-Auth display-name moderation
- existing display-name availability RPC check remains before Auth sign-up
- email confirmation success copy after Auth sign-up returns no session
- support/contact-admin and privacy gate copy remains visible in the Rules Hub
- public registration remains closed until external Auth/config checks are confirmed

## Moderation contract

The account creation path must reject display names that match blocked public-signup moderation patterns before calling Supabase Auth. The current guard covers racist, discriminatory, anti-immigrant, sectarian, abusive and inflammatory wording, including the recorded owner-decision example “stop the boats”.

## Checks still required before actually opening public registration

- Supabase Auth email confirmation setting confirmed in the Euro staging project
- Euro 2028 redirect URLs confirmed in Supabase Auth settings
- support/contact-admin destination confirmed for public users
- privacy wording confirmed without an unsupported data-region claim
- capacity monitoring confirmed before exceeding 50 users or 20 leagues before SMTP, or 100 users after email delivery is reviewed

## Hard safety boundary

- Public signup remains closed after this stage
- No Supabase Auth dashboard/config change is made by this patch
- No Supabase schema, RPC, RLS, service-role or browser write change
- No official result-entry change
- No fake-result writes
- No league writes
- No scoring engine change
- No resolver change
- No Migration 019
