# Project Control Dashboard

Live repo-control dashboard for future agents. This is not a long history file.

## Current State

| Item | Current value |
| --- | --- |
| Project | Euro 2028 Predictor |
| Branch | `euro28-development` |
| Current stage | `STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET-GRID-NATIVE-CONNECTORS-VERIFY-FALLBACK-AND-LAYOUT-REPAIR` |
| Latest verified commit | `3bb3c6e Add agent control rules and project dashboard` |
| Current deployment URL | `https://euro28-predictor-dev.netlify.app` |
| Active migration count | 18 |
| Migration 019 status | Not present; blocked unless approved or a real schema/read-contract gap is proved |
| Immediate priority | Repair Original Bracket as a deterministic seven-lane bracket while preserving the fail-loud placement guard |
| Next recommended stage | `STAGE-REPO-CONTROL-1B-AUDIT-AND-DOC-RETIREMENT-PLAN` after manual bracket visual review and commit approval |

## Current Blockers

- Manual visual review is still required for the repaired Original Bracket wall-chart layout.
- Public signup remains closed; SMTP/public-opening work is not approved by this stage.
- Playwright is not currently proved installed or wired.

## Deferred Findings

- Hygiene debt exists: `.DS_Store`, `coverage/`, `supabase/.temp/`, `supabase/.branches/`, `node_modules/`, `.env.local`.
- Audit/doc bloat needs a later controlled split, not this stage.
- Original Bracket unknown wall placement now fails loudly in the working tree; seven-lane bracket layout is pending Nicky's visual review.

## Do-Not-Touch Areas

- `src/`
- `supabase/`
- `package.json`
- CI workflows
- migrations
- production config and production data
- scoring logic, resolver logic, Supabase Auth, public signup, and WC26 production references unless explicitly scoped

## Last Successful Gates

Unknown — verify before relying on this.

## Manual Visual Review Still Required

None for this docs/process-control stage. UI/layout stages still require Nicky's visual approval before completion.

## Source-Of-Truth Uncertainty

- Docs report proven reality, but docs are not proof alone.
- Stage docs are historical unless promoted by `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`.
- If repo/runtime/tests/audits/build/deployment/Supabase disagree with docs, stop and record the conflict.
