> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage PRODUCT-GATE-DECISIONS-1 — Signup and tournament gate decisions

## Status

Implemented as a docs/audit-only product-completeness decision register slice.

This stage does not close wide signups. It makes the next owner decisions explicit so future implementation slices do not blur provisional planning with approved launch policy.

## Purpose

The wider Euro 2028 audience changes the product from a trusted friends league into a semi-public predictor. The roadmap already records the scale-driven gates. This stage turns the next decision rows into a checked register package covering tie-breaks, moderation, capacity and email confirmation.

## Recorded decision rows

| Decision row | Gate | Current recorded position | Closure requirement |
|---|---|---|---|
| Tie-break ladders | Tournament | Required before scoring matters. Final standings and leaderboard tie-break ladders must be published and resolver-backed. | A later tie-break implementation stage must update resolver/audits with owner-approved ladders. |
| Display-name and league-name moderation | Signup | Minimum viable policy is admin rename power, a small blocked-word check at signup and league creation, and published wording that inappropriate names may be changed. | A later moderation stage must prove the checks and admin rename paths. |
| Capacity planning | Signup | Planning range remains 650–1,300 users. Exact planning number, Supabase tier, Netlify tier and auth-email budget remain owner decisions. | Owner must record an exact planning number and tier/budget before wide signups. |
| Email confirmation | Signup | Required decision before wide signups. Recommendation remains ON for stranger-scale registration. | Owner must record on/off and auth-provider setup before wide signups. |

## Not changed in this stage

No owner choice is invented here. This package records the decision rows and their closure requirements only.

No support address is selected.

No capacity number is selected.

No Supabase or Netlify tier is selected.

No email-confirmation setting is changed.

No blocked-word list is implemented.

No tie-break resolver is changed.

## Safety

No Supabase writes are introduced.

No Auth users are created.

No predictions are seeded.

No service-role credential is read, printed, used or requested.

No scoring values are changed.

No resolver behaviour is changed.

No UI route is changed.

No database migration is created.

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
npm run audit:product-completeness-roadmap
npm run audit:product-gate-decisions
npm run audit:tooling-wiring
npm run audit:governance-coherence
npm run audit:marker-hygiene
npm run audit:ui-copy-hygiene
npm run audit:ui-copy-spec-echo
npm run lint:foundation
npm run build
npm run check
```
