# Stage OWNER-SIGNUP-DECISIONS-1 — Public signup owner decision pass

## Status

Implemented as a docs, model, test and audit-only decision pass.

The remaining owner decisions for public signup readiness are now recorded.

Public registration remains closed.

This stage does not implement moderation, does not open signup, and does not change Auth behaviour.

## Recorded owner decisions

| Gate | Decision recorded |
|---|---|
| Support contact | Use generic **Contact admin** wording for help, scoring questions and deletion requests. The public surface should not expose a personal email address unless separately approved. |
| Initial capacity | Plan the first public phase against **50 users** and **20 leagues** before branded email sending; use **100 users** as the post-email-sender target after review. |
| Hosting/account-email tier | Plan against the **current low-cost/free setup** at first. Review hosting, Supabase Auth and email limits before increasing capacity. |
| Email confirmation | **Email confirmation is ON** for public registration. |
| Privacy/data-region wording | Use simple privacy wording covering account, display name, league membership, predictions, scores and support/deletion request information. Make **no specific data-region claim** until the actual project region is confirmed. |
| Name and league moderation | Add checks for racist, discriminatory, anti-immigrant, sectarian, abusive and inflammatory names. The owner-provided example **stop the boats** is treated as blocked anti-immigrant wording. |
| Invite-only status | **Public registration does not stay invite-only** by policy once moderation and the remaining safety checks are complete. Public registration remains closed until those later gates are implemented and accepted. |

## Current readiness meaning

The owner choices are now recorded, but the product is still not ready for wider public registration.

The public-signup readiness model keeps `isOpenForPublic` false.

The remaining blocker is implementation and acceptance of the safety checks, especially display-name and league-name moderation.

## Scope

Included:

- central readiness model records the owner choices
- public-signup readiness tests updated
- owner decision audit added
- product roadmap, decision register, functional ledger and agent rules updated

Excluded:

- No signup flow is opened
- No Auth configuration is changed
- No Supabase writes
- No Auth users are created
- No predictions are seeded
- No service-role credential is used, read, printed, stored or requested
- No scoring values are changed
- No resolver behaviour is changed
- No route is changed
- No moderation implementation is added
- No admin rename implementation is added
- No migration is created

## Safety boundaries

Original Predictor and KO Predictor remain separate.

Original and KO points must never combine.

Predicted bracket context and live bracket context must never blend.

WC26 production and `main` remain untouched.

Active migrations remain 18.

Migration 018 remains the latest active migration.

Migration 019 is not created.

## Acceptance

Local gates:

```bash
npm run db:safety
npm run audit:public-signup-readiness
npm run audit:owner-signup-decisions
npm test -- src/auth/__tests__/publicSignupReadiness.test.js
npm run audit:rules-hub-signup-gates
npm run audit:product-completeness-roadmap
npm run audit:tooling-wiring
npm run audit:governance-coherence
npm run audit:marker-hygiene
npm run audit:ui-copy-hygiene
npm run audit:ui-copy-spec-echo
npm run lint:foundation
npm run build
npm run check
```

Browser acceptance:

- Open `#/how-to-play`.
- Confirm the public-signup panel still says wider public registration is not open yet.
- Confirm the panel records Contact admin, 50 users / 20 leagues before SMTP, 100 users / 20 leagues after SMTP review, email confirmation, privacy wording, moderation and registration-mode decisions.
- Confirm no public signup flow has opened.
- Confirm Original Predictor and KO Predictor remain described as separate competitions.

## Capacity replacement after external settings check

The first public opening cap is now 50 users and 20 leagues before branded email sending is added. The post-email-sender target is 100 users and 20 leagues, with a review point at 75 users or 15 leagues.
