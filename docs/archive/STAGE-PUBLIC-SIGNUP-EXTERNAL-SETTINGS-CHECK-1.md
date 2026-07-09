> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1

Status: recorded.

This stage records the manual external account-settings check completed by the owner for the Euro 2028 staging project. It does not open public registration.

## External settings evidence

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

## Replacement capacity decision

The earlier 250-user planning figure is replaced for the controlled opening path. The app should use 50 users and 20 leagues as the first pre-SMTP public cap. After custom SMTP or equivalent branded email delivery is in place and real usage is reviewed, the next target is 100 users and 20 leagues, with review at 75 users or 15 leagues.

## Safety boundary

Public registration remains closed in this stage.

This package does not alter external Auth settings, does not create users, does not write profile rows, does not seed predictions, does not write league data, does not publish service-role credentials, and does not change scoring, resolver, result-entry or fake-result behaviour.

No runtime route, Auth configuration, Supabase schema, RPC, RLS, service-role, browser write, scoring, resolver, result-entry, fake-result write, league-write or migration change is included.

Active migrations remain 18. Migration 019 is not created. WC26 production remains blocked. Original Predictor and KO Predictor remain separate.
