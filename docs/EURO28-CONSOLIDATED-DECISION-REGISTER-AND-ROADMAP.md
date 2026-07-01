# EURO 2028 PREDICTOR
## Consolidated Decision Register and Build Roadmap
### Version 1.4 — Stage 5 authentication and profiles

> **Current authority:** agreed roadmap for the Euro 2028 rebuild.

## 1. Purpose and authority

This document consolidates the verified Stage 1 and Stage 2 work, the latest product decisions, and the useful parts of the uploaded “Canonical Tournament Reference & Build Rules — v5.1”. It is the agreed planning authority for the next build stages.

The uploaded v5.1 reference is advisory. It does not automatically supersede later verified decisions.

## 2. Current return point

- Stage 1 complete.
- Stage 2 application isolation and contracts complete.
- Migration 005 deployed and verified locally and on Euro staging.
- Stage 3 canonical tournament resolver implemented.
- Stage 4 browser-only guest/explore foundation implemented.
- Stage 5 Euro authentication and owner-only profiles implemented.
- Migration 006 adds validated profiles, Auth creation trigger and controlled profile RPCs.
- All 51 guest draft rows remain local and separate from signed-in account state.
- Group tables, provisional tie handling, all 15 best-third combinations and matches 37–51 are covered by one pure engine.
- Guest, predicted and live contexts use the same resolver and cannot be blended.
- No prediction save RPC, guest server storage, leagues, scoring runs or admin result UI has been introduced.
- Next stage: trusted atomic prediction saving.

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

## 6. Delivered database foundations

- `scoring_rulesets`, `prediction_sets`, `match_predictions` and `prediction_grace_windows`.
- Reversible `submitted_at`.
- Match-level `joker_applied`.
- Central configurable joker caps and multiplier.
- Scheduled and persisted global prediction locks.
- Per-match joker timing support.
- Expiring and revocable audited grace records.
- RLS on all new tables.
- Controlled reads and no browser writes.
- No final prediction save route, guest server storage, leagues, scoring runs or admin result UI.

Migration 006 adds:

- one `profiles` row per Auth user;
- validated and case-insensitively unique display names;
- automatic profile creation from sign-up metadata;
- owner-only profile reads through RLS;
- controlled display-name availability and owner-update RPCs;
- no direct browser table writes.

## 7. Roadmap

1. Reconciliation batch — complete.
2. Revised Migration 005 — complete and hosted.
3. Canonical tournament resolver — complete.
4. Guest/explore foundation — complete.
5. Authentication and profiles — complete.
6. Atomic prediction saving — next.
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

1. Install and reset-test Migration 006 locally.
2. Run both Migration 005 and Migration 006 pgTAP files.
3. Verify the linked project is `gcfdwobpnanjchcnvdco`.
4. Dry-run and push only Migration 006.
5. Verify hosted profile RLS, trigger behaviour and controlled RPCs.
6. Configure only the Euro staging Auth redirect URLs.
7. Commit and push Stage 5 with a clean working tree.
8. Begin Stage 6 with one trusted atomic full-bundle prediction save operation.
9. Preserve browser-only guest state until the deliberate pre-lock import step exists.
10. Keep all prediction-table writes unavailable to direct browser table access.

## 9. Open decisions

- Exact group joker cap.
- Exact knockout joker cap.
- Final joker multiplier.
- Official 2028 tie-break rules.
- Exact teams, group heads and kick-off times.
- Results API provider.
- Awards categories.
