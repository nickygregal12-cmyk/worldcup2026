> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage PUBLIC-SIGNUP-READINESS-1 — Public signup readiness model

## Status

Implemented as a model, test, docs and audit-only product-completeness slice.

The app now has one central public-signup readiness model.

The Rules Hub consumes that model for the public-signup gate panel.

Wider public registration is not open yet.

Follow-on Stage OWNER-SIGNUP-DECISIONS-1 has now recorded the owner choices for support, capacity, hosting/email planning, email confirmation, privacy wording, moderation policy and invite-only status. The owner choices are now recorded, but implementation and acceptance gates still keep public registration closed.

## Signup gates after OWNER-SIGNUP-DECISIONS-1

The following gates are still tracked by the central model:

- Support contact
- Capacity and tiers
- Email confirmation
- Privacy region
- Name moderation
- Registration mode

The owner decisions are now recorded by Stage OWNER-SIGNUP-DECISIONS-1. Public registration still remains closed because moderation and operational acceptance have not been implemented and accepted.

This readiness stage did not select those values itself. The follow-on stage records them without opening signup.

Admin rename controls and blocked-name enforcement still require a later implementation stage.

## Scope

Included:

- central public-signup readiness model
- Rules Hub consumption of that model
- focused unit test
- audit coverage
- roadmap, ledger, register and agent-rule documentation

Excluded:

- no signup flow is opened
- no signup flow is closed
- no Auth configuration is changed
- no Supabase writes
- no Auth users
- no prediction seeding
- no service-role use, read or print
- no scoring changes
- no resolver changes
- no route changes
- no migration

## Database

Active migrations remain 18.

Migration 018 remains the latest active migration.

Migration 019 is not created.

## Acceptance

Local gates:

- npm run db:safety
- npm run audit:rules-hub
- npm run audit:rules-hub-signup-gates
- npm run audit:public-signup-readiness
- npm test -- src/auth/__tests__/publicSignupReadiness.test.js
- npm run audit:product-completeness-roadmap
- npm run audit:tooling-wiring
- npm run audit:governance-coherence
- npm run audit:marker-hygiene
- npm run audit:ui-copy-hygiene
- npm run audit:ui-copy-spec-echo
- npm run lint:foundation
- npm run build
- npm run check

Browser acceptance:

- #/how-to-play still loads.
- The public-signup status panel still appears.
- It lists support contact, capacity and tiers, email confirmation, privacy region, name moderation and registration mode.
- It still says wider public registration is not open yet.
- No signup behaviour has changed.
- Original Predictor and KO Predictor are still explained separately.
