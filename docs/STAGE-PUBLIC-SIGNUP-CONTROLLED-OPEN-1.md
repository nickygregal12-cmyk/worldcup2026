# STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1

## Purpose

This stage records the controlled public signup opening runbook and the exact owner-controlled steps that must happen before wider registration can be treated as open.

It is still docs/audit-only. It does not open public registration, does not alter external Auth settings and does not change runtime source. The owner must complete the external checks and explicitly approve the real opening action before any future patch or dashboard change can move public registration to open.

## Controlled opening scope

STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1 records:

- controlled public signup opening runbook;
- owner approval must be explicit, current and recorded;
- opening-gate checklist must be satisfied before any public opening;
- email confirmation must be checked in the external account settings;
- account redirect URLs must return to the Euro 2028 app, not WC26;
- display-name moderation remains before account creation;
- display-name availability remains before account creation;
- support/contact route remains visible for public users;
- initial capacity remains 50 users and 20 leagues before the branded email sender is added unless replaced by an owner decision;
- public registration remains closed until the owner completes the external opening action;
- no Supabase Auth dashboard/config change in the patch;
- No Migration 019 unless a real schema/read-contract gap is proved and approved.

## Owner-controlled opening runbook

Before a later stage may claim public signup is open, the owner must complete this runbook:

1. Confirm the Euro 2028 deployment that will receive public users.
2. Confirm email confirmation is enabled for public account creation.
3. Confirm sign-up, sign-in and password-recovery redirects return to the Euro 2028 app and do not point at WC26.
4. Confirm the support/contact route is visible from public-facing help or rules surfaces.
5. Confirm display-name moderation blocks abusive, discriminatory and inflammatory names before account creation.
6. Confirm display-name availability is checked before account creation.
7. Confirm the first opening remains within 50 users and 20 leagues before the branded email sender is added, or record a replacement capacity decision.
8. Confirm no service-role key, admin secret or private credential is exposed to the browser.
9. Confirm WC26 production remains blocked.
10. Record explicit owner approval for the opening action.

## Safety boundary

Public registration remains closed in this stage. This patch does not alter external Auth settings, does not create users, does not write profile rows, does not seed predictions, does not write league data and does not publish service-role credentials.

No runtime UI, route, Auth configuration, Supabase schema, RPC, RLS, service-role, browser write, scoring, resolver, result-entry, fake-result write, league-write or migration change is included.

Active migrations remain 18. Migration 019 is not created.

Original Predictor and KO Predictor remain separate. Predicted brackets and live brackets must never blend.

## Follow-on rule

The next stage may only change app-side public signup status or external opening behaviour after the owner confirms the runbook. Do not infer approval from this document, from previous readiness stages or from a successful audit run.

Capacity marker: initial capacity is replaced by the external settings check: 50 users and 20 leagues before branded email sending, then 100 users after email delivery is reviewed.
