# Stage PUBLIC-SIGNUP-READINESS-1 — Public signup readiness model

## Status

Implemented as a model, test, docs and audit-only product-completeness slice.

The app now has one central public-signup readiness model.

The Rules Hub consumes that model for the public-signup gate panel.

Wider public registration is not open yet.

## Open signup gates

The following gates remain open:

- Support contact
- Capacity and tiers
- Email confirmation
- Privacy region
- Name moderation

These are still owner or implementation decisions.

This stage does not select a support email, capacity number, hosting tier, account-email budget, email-confirmation setting, data region or blocked-word list.

This stage does not implement admin rename controls.

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
- It still lists support contact, capacity and tiers, email confirmation, privacy region and name moderation.
- It still says wider public registration is not open yet.
- No signup behaviour has changed.
- Original Predictor and KO Predictor are still explained separately.
