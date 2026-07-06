# STAGE-PUBLIC-SIGNUP-OPENING-GATE-1

## Purpose

This stage records the final opening gate that must be passed before wider public registration can be opened for Euro 2028 Predictor.

It is a docs/audit-only gate. It does not open public registration, does not change any external account settings and does not change the application runtime source. The app must continue to show that public registration is closed until the owner deliberately approves the real opening step.

## Gate scope

STAGE-PUBLIC-SIGNUP-OPENING-GATE-1 records:

- final pre-open checklist for public signup;
- visible “registration still closed / opening soon” state;
- explicit owner approval requirement before opening registration;
- confirmation that email confirmation is ON;
- confirmation redirect URLs are correct;
- confirmation capacity limits are acceptable;
- confirmation support/contact route is ready;
- confirmation display-name moderation is active;
- no Supabase Auth dashboard/config change in the patch;
- public registration remains closed;
- No Migration 019 unless a real schema/read-contract gap is proved and approved.

## Required pre-open checklist

Before a future stage can open wider public registration, the owner must confirm all of the following:

1. Email confirmation is ON for the Euro 2028 account flow.
2. Sign-up, sign-in and password-recovery return URLs point to the Euro 2028 development or launch deployment, not WC26.
3. The support/contact route is ready for public users.
4. The opening capacity is acceptable at 50 users and 20 leagues before the branded email sender is added unless the owner records a replacement capacity decision.
5. Display-name moderation is active before the account is created.
6. The display-name availability check remains before account creation.
7. Privacy wording is conservative and does not claim an unconfirmed data region.
8. The owner has explicitly approved the public opening step after reviewing the gate.

## Safety boundary

Public registration remains closed in this stage. This patch does not alter external Auth settings, does not open registration, does not create users, does not write profile rows, does not seed predictions, does not write league data and does not publish service-role credentials.

No runtime UI, route, Auth configuration, Supabase schema, RPC, RLS, service-role, browser write, scoring, resolver, result-entry, fake-result write, league-write or migration change is included.

Active migrations remain 18. Migration 019 is not created.

Original Predictor and KO Predictor remain separate. Predicted brackets and live brackets must never blend.

## Follow-on rule

A later opening stage may only proceed after this gate is reviewed and the owner explicitly confirms the public opening action. That later stage must record the exact external settings checked and must not infer approval from this document.
