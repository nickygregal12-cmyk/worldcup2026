# Public Signup External Settings Check Contract

This contract records the owner-verified external settings for the controlled public signup path.

## Required recorded evidence

- STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1
- Euro staging project checked: gcfdwobpnanjchcnvdco
- Email confirmation: ON
- New user signups: still closed
- Site URL / app URL: https://euro28-predictor-dev.netlify.app
- Redirect URLs include Euro dev site: yes
- Redirect URLs currently include local dev URLs: yes
- WC26 URLs used for Euro auth return: no
- Email templates editable without SMTP: no
- Email templates mention WC26: unable to edit/check fully without SMTP
- Custom SMTP required before branded public email templates: yes
- Initial capacity accepted before SMTP: 50 users / 20 leagues
- Target capacity after SMTP: 100 users / 20 leagues
- Review point after SMTP: 75 users / 15 leagues
- Support/contact route required: yes
- Display-name moderation required: yes

## Capacity replacement

The previous 250-user planning figure must no longer be treated as the first opening cap. The first controlled public opening cap is 50 users and 20 leagues until custom SMTP or equivalent branded email delivery is in place and usage has been reviewed. The post-SMTP target is 100 users and 20 leagues, with a review point at 75 users or 15 leagues.

## Non-goals

Public registration remains closed. No Auth configuration, Supabase schema, RPC, RLS, service-role, scoring, resolver, result-entry, fake-result write, league-write or migration change is part of this stage. Active migrations remain 18 and no Migration 019 is created.
