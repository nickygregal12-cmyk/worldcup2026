# Final Design Content Sweep Contract

## Contract markers

- FINAL-DESIGN-CONTENT-SWEEP-1
- Design/content sweep before seeded-team testing
- Player-facing copy must read like finished product copy
- Signup opening and SMTP remain parked for future launch readiness
- Rules Hub wording is polished away from signup-gate language
- Tournament overview wording avoids implementation or placeholder phrasing
- Account and guest-transfer wording remains product-facing
- Admin Control Room may keep operational wording because it is a protected admin surface

## Guardrails

- No schema, Auth, scoring, resolver, result-entry, fake-result, league-write or migration change is included.
- Active migrations remain 18.
- Migration 019 is not created.
- WC26 production remains blocked.
- Original Predictor and KO Predictor remain separate.
