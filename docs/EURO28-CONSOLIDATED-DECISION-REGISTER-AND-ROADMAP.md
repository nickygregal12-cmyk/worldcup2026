# EURO 2028 PREDICTOR
## Consolidated Decision Register and Build Roadmap
### Version 1.2 — Stage 3 canonical resolver

> **Current authority:** agreed roadmap for the Euro 2028 rebuild.

## 1. Purpose and authority

This document consolidates the verified Stage 1 and Stage 2 work, the latest product decisions, and the useful parts of the uploaded “Canonical Tournament Reference & Build Rules — v5.1”. It is the agreed planning authority for the next build stages.

The uploaded v5.1 reference is advisory. It does not automatically supersede later verified decisions.

## 2. Current return point

- Stage 1 complete.
- Stage 2 application isolation and contracts complete.
- Migration 005 deployed and verified locally and on Euro staging.
- Stage 3 canonical tournament resolver implemented.
- Group tables, provisional tie handling, all 15 best-third combinations and matches 37–51 are covered by one pure engine.
- Guest, predicted and live contexts use the same resolver and cannot be blended.
- No Migration 006, save RPC, guest server storage, auth UI, leagues, scoring runs or admin result UI has been introduced.
- Next stage: browser-only guest/explore foundation.

## 3. Environment

| Item | Value |
|---|---|
| Repository | github.com/nickygregal12-cmyk/worldcup2026 |
| Euro branch | `euro28-development` |
| WC26 live branch | `main` |
| Euro local folder | `~/Desktop/euro28predictor` |
| Euro Netlify staging | `https://euro28-predictor-dev.netlify.app` |
| Euro Supabase staging | `gcfdwobpnanjchcnvdco` |
| Blocked WC26 Supabase | `ouhxawizadnwrhrjppld` |

## 4. Decision register

| Subject | Status | Agreed position |
|---|---|---|
| Submission | Confirmed | Reversible user-side review mode; no copy, scoring gate or eligibility effect |
| Saving | Confirmed | Autosave UX with atomic full-bundle write and revision checking |
| Saved but unsubmitted | Confirmed | Counts exactly the same at lock |
| Prediction lock | Confirmed | First tournament kick-off |
| Jokers | Confirmed | Core feature; movable only among unstarted matches |
| Joker caps | Provisional | Central configuration; exact values unresolved |
| Knockout score | Confirmed | Always 90-minute score |
| Advancing team | Confirmed | Separate field |
| Decision method | Confirmed | Normal time / extra time / penalties |
| Grace windows | Confirmed | Admin-only, audited, one user + one unstarted match |
| Guest mode | Confirmed | Core architecture, browser-only, unscored |
| Live vs predicted | Confirmed | Never blended |
| Best-third allocation | Confirmed | One matrix, one resolver, all 15 combinations tested |
| Results API | Deferred | Manual results authoritative; provider added later |
| Scoring values | Provisional | Central, versioned and changeable before ruleset lock |
| League scoring differences | Rejected | One scoring model throughout |
| Confidence multipliers | Rejected | Jokers are the only multiplier |

## 5. Core rules

### Submission
- Predictions save normally.
- Submit switches to a clean read-only review state.
- `submitted_at` may preserve that state.
- Edit Predictions returns to edit mode before global lock.
- Submitted and unsubmitted saved predictions score identically.

### Jokers
- Server-enforced.
- Can be moved only between unstarted matches.
- Started-match joker is fixed.
- Caps and multiplier live in the versioned scoring ruleset.

### Grace
- Global lock is never reopened.
- Admin grants a temporary window for one user and one specific unstarted match.
- Fully audited.
- Scores normally.

### Brackets
- Guest, signed-in predicted and live are separate contexts.
- All use the same canonical resolver.
- Predicted and live brackets are never blended.

## 6. Migration 005 delivered scope

- `scoring_rulesets`, `prediction_sets`, `match_predictions` and `prediction_grace_windows`.
- Reversible `submitted_at`.
- Match-level `joker_applied`.
- Central configurable joker caps and multiplier.
- Scheduled and persisted global prediction locks.
- Per-match joker timing support.
- Expiring and revocable audited grace records.
- RLS on all new tables.
- Controlled reads and no browser writes.
- No final save route, guest server storage, auth UI, leagues, scoring runs or admin result UI.

## 7. Roadmap

1. Reconciliation batch — complete.
2. Revised Migration 005 — complete and hosted.
3. Canonical tournament resolver — complete.
4. Guest/explore foundation — next.
5. Authentication and profiles.
6. Atomic prediction saving.
7. Prediction journey and submit/review mode.
8. Joker and grace controls.
9. Results, live tables and live bracket.
10. Scoring and idempotent recalculation.
11. Leagues and shared prediction viewing.
12. Admin control room.
13. Shared design system and page rebuild.
14. Seeded full tournament test.
15. Pre-tournament configuration and optional API integration.

## 8. Immediate next actions

1. Install the Stage 3 canonical resolver package.
2. Run `npm run check` and `npm run audit:resolver`.
3. Commit and push the resolver on `euro28-development`.
4. Confirm a clean working tree.
5. Begin Stage 4 with browser-only guest/explore state.
6. Use `resolveEuro28Tournament()` for guest previews rather than the inherited WC26 bracket utility.
7. Preserve strict guest, predicted and live context isolation.
8. Add no guest Supabase prediction storage or browser write route.

## 9. Open decisions

- Exact group joker cap.
- Exact knockout joker cap.
- Final joker multiplier.
- Official 2028 tie-break rules.
- Exact teams, group heads and kick-off times.
- Results API provider.
- Awards categories.
