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
| Support contact | Decision recorded | Use generic Contact admin wording for help, deletion requests and scoring questions. |
| Capacity and tiers | Decision recorded | Start with 50 users and 20 leagues before the branded email sender is added, planning against the current low-cost/free setup until limits are reviewed. |
| Email confirmation | Decision recorded | Email confirmation is required before public registration is opened. |
| Privacy region | Decision recorded | Publish simple data-use wording without a specific region claim until the project region is confirmed. |
| Name moderation | Safety check needed | Add blocked-name checks and admin rename proof for player and league names. |
| Registration mode | Decision recorded | Public registration does not need to stay invite-only once moderation and remaining checks are complete. |

## Not changed in this stage

No owner choice was invented by RULES-1B.

Stage OWNER-SIGNUP-DECISIONS-1 later recorded the owner choices without opening registration.

No blocked-word enforcement is implemented here.

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

Stage PUBLIC-SIGNUP-READINESS-1 later moved the panel data source into a central public-signup readiness model. Stage OWNER-SIGNUP-DECISIONS-1 later recorded the owner choices in that model while keeping public registration closed. Future changes to the open/closed signup answer must use that shared model rather than adding another local list.
