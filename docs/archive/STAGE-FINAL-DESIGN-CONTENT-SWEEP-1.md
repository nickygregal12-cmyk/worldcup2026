> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# FINAL-DESIGN-CONTENT-SWEEP-1 — design/content sweep before seeded-team testing

## Status

Complete when `npm run audit:final-design-content-sweep` and `npm run check` pass.

## Scope

- FINAL-DESIGN-CONTENT-SWEEP-1
- Design/content sweep before seeded-team testing
- Player-facing copy must read like finished product copy
- Signup opening and SMTP remain parked for future launch readiness
- Rules Hub wording is polished away from signup-gate language
- Tournament overview wording avoids implementation or placeholder phrasing
- Account and guest-transfer wording remains product-facing
- Admin Control Room may keep operational wording because it is a protected admin surface

## Product intent

The seeded-team testing pass should feel like a real player is using the app, not like a tester is reading an implementation note. Any unresolved launch choices stay in docs, owner/admin areas, or future launch-readiness records.

## Copy changes recorded

- Public account messaging is softened because account opening is a future launch item, not a current priority.
- Rules Hub trust panels use player language for corrections, privacy, support and naming standards.
- Tournament tie-break wording avoids internal gate language while still being honest that final tie-break wording must be published before scoring matters.
- Team Profile and Match Centre privacy copy uses player-facing wording.
- Prediction journey lock copy avoids placeholder-sounding rule language.

## Safety boundary

- No schema, Auth, scoring, resolver, result-entry, fake-result, league-write or migration change is included.
- No public signup opening is included.
- No SMTP configuration is included.
- No Supabase Auth dashboard/config change is included.
- Active migrations remain 18.
- Migration 019 is not created.
- WC26 production remains blocked.
- Original Predictor and KO Predictor remain separate.
