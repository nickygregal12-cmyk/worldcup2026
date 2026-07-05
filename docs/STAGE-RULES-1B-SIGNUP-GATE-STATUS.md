# Stage RULES-1B-SIGNUP-GATE-STATUS — Rules hub signup gate status

## Status

Implemented as a UI/model/docs/audit follow-on to the Rules Hub.

This stage does not open public registration. It makes the remaining public-signup blockers visible on the `#/how-to-play` rules hub so a stranger can see that wider signups are not yet being treated as fully open.

## Purpose

RULES-1A made the How to Play page feel like a real rules and trust hub, but several signup gates were still only recorded in docs. RULES-1B adds a visible status panel for the remaining public-signup gates without selecting any owner-owned value.

## Visible signup gates

The Rules Hub now exposes these still-open items:

| Gate | Status shown | Meaning |
|---|---|---|
| Support contact | Owner decision | Choose the dedicated scalable contact for help, deletion requests and scoring questions. |
| Capacity and tiers | Owner decision | Record the planning number, Supabase tier, Netlify tier and auth-email budget. |
| Email confirmation | Owner decision | Record whether confirmation is on or off before registration opens beyond the trusted test group. |
| Privacy region | Owner decision | Confirm the Supabase data region before publishing the privacy note. |
| Name moderation | Implementation gate | Add blocked-word checks and admin rename proof for player and league names. |

## Not changed in this stage

No owner choice is invented here.

No support address is selected.

No capacity number is selected.

No Supabase or Netlify tier is selected.

No email-confirmation setting is changed.

No blocked-word list is implemented.

No signup flow is opened or closed.

No new route is added.

## Safety

No Supabase writes are introduced.

No Auth users are created.

No predictions are seeded.

No service-role credential is read, printed, used or requested.

No scoring values are changed.

No resolver behaviour is changed.

No new route is added.

Original Predictor and KO Predictor remain separate.

Original Predictor points and KO Predictor points must never combine.

Predicted bracket context and live bracket context must never blend.

WC26 production and `main` remain untouched.

## Database

Active migrations remain 18.

Migration 018 remains the latest active migration.

Migration 019 is not created.

This stage does not prove a schema or read-contract gap.

## Acceptance

Local acceptance requires:

```bash
npm run db:safety
npm run audit:rules-hub
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

Browser acceptance requires:

- Open `#/how-to-play`.
- Confirm the new public-signup status panel appears below the trust summary.
- Confirm it lists support contact, capacity and tiers, email confirmation, privacy region and name moderation.
- Confirm it clearly says public registration is not open yet / still has owner gates.
- Confirm the page still explains Original Predictor and KO Predictor separately.
- Confirm no signup behaviour, route or prediction state changes.

## Later alignment

Stage PUBLIC-SIGNUP-READINESS-1 later moved the panel data source into a central public-signup readiness model. The visible Rules Hub panel remains the same gate-status surface, but future changes to the open/closed signup answer must use that shared model rather than adding another local list.
