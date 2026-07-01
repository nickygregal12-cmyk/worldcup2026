# EURO 2028 PREDICTOR
## Consolidated Decision Register and Build Roadmap
### Version 1.8 — Stage 7 prediction journey

> **Current authority:** agreed roadmap for the Euro 2028 rebuild.

## 1. Purpose and authority

This document consolidates the verified tournament foundation, the agreed prediction rules and the current build sequence. Earlier references remain advisory where they conflict with later verified decisions.

## 2. Current return point

- Stage 1 tournament model complete.
- Stage 2 isolation, contracts and prediction-storage foundation complete.
- Migrations 001–009 deployed only through the controlled Euro workflow.
- Stage 3 canonical tournament resolver complete.
- Stage 4 browser-only guest/explore foundation complete.
- Stage 5 authentication and owner-only profiles complete.
- Stage 6 trusted atomic prediction saving implemented.
- Stage 7 group, knockout, autosave and reversible review journey implemented.
- Direct browser writes to prediction tables remain unavailable.
- Guest drafts remain browser-only unless deliberately imported before lock.
- No leagues, scoring runs, results controls or admin control room have been introduced.
- Next stage: visible joker controls and audited grace-window operations.

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
| Saving | Confirmed | Autosave UX backed by one atomic full-bundle write with revision checking |
| Saved but unsubmitted | Confirmed | Counts exactly the same as submitted entries at lock |
| Prediction lock | Confirmed | Prediction content locks at the first tournament kick-off |
| Jokers | Confirmed | Core feature; movable only among matches that have not started |
| Joker caps | Provisional | Central configuration; exact group and knockout values unresolved |
| Joker multiplier | Provisional | Current working value `2×` |
| Knockout score | Confirmed | Always the score after 90 minutes plus added time |
| Advancing team | Confirmed | Separate from the 90-minute score |
| Decision method | Confirmed | Normal time, extra time or penalties |
| Grace windows | Confirmed | Audited exception for one user and one specific unstarted match |
| Guest mode | Confirmed | Browser-only, unscored and separate from account storage |
| Guest import | Confirmed | Explicit complete pre-lock import; never automatic; cannot overwrite account rows |
| Live vs predicted | Confirmed | Never blended |
| Best-third allocation | Confirmed | One matrix, one resolver and all 15 combinations tested |
| Results API | Deferred | Manual results remain authoritative until later provider work |
| Scoring values | Provisional | Central and versioned until formal ruleset lock |
| League-specific scoring | Rejected | One scoring model throughout |
| Confidence multipliers | Rejected | Jokers are the only planned match multiplier |

## 5. Core rules

### Submission and saving

- Prediction rows are always live within one prediction set.
- Each save supplies the caller's complete current bundle.
- `expected_revision` prevents stale overwrites.
- `submitted_at` records review mode only.
- Edit Predictions clears review mode before the global lock.
- Submitted and unsubmitted saved rows score identically.

### Locks, jokers and grace

- Prediction content locks globally at first tournament kick-off.
- Joker allocation remains independently movable on unstarted matches.
- A joker on a started match is fixed.
- Grace never reopens the tournament. It permits content changes only for its user and match while that match remains unstarted and the grant remains active.

### Brackets

- Guest, signed-in predicted and live contexts use the same canonical resolver.
- Context records cannot be mixed.
- The server reconstructs the predicted knockout path before accepting knockout rows.
- A client-supplied participant path cannot override the resolver.

## 6. Delivered database foundations

Migrations 005–009 provide:

- versioned scoring rulesets;
- prediction sets and match predictions;
- reversible review state;
- joker allocation;
- global and per-match lock foundations;
- audited grace windows;
- owner-only profiles;
- hardened browser-role function privileges;
- corrected unresolved joker-cap values;
- one authenticated atomic prediction save RPC;
- complete pre-lock guest import;
- no direct browser prediction-table writes.

## 7. Roadmap

1. Reconciliation batch — complete.
2. Revised Migration 005 — complete and hosted.
3. Canonical tournament resolver — complete.
4. Guest/explore foundation — complete.
5. Authentication and profiles — complete.
6. Atomic prediction saving — complete pending the standard local/linked deployment verification for Migration 009.
7. Prediction journey and submit/review mode — complete.
8. Joker and grace controls — next.
9. Results, live tables and live bracket.
10. Scoring and idempotent recalculation.
11. Leagues and shared prediction viewing.
12. Admin control room.
13. Shared design system and page rebuild.
14. Seeded full tournament test.
15. Pre-tournament configuration and optional result provider integration.

## 8. Immediate next actions

1. Install the Stage 6 package over committed Stage 5 checkpoint `9d0d1c0`.
2. Run `npm run check`.
3. Reset local Supabase and run pgTAP suites 005, 006, 008 and 009.
4. Verify the linked project reference.
5. Dry-run and push only Migration 009.
6. Run all four linked pgTAP suites and remote database lint.
7. Commit and push Stage 6 with a clean working tree.
8. Begin Stage 7 using `save_my_prediction_bundle()` as the only prediction write route.

## 9. Open decisions

- Exact group-stage joker cap.
- Exact knockout joker cap.
- Final joker multiplier.
- Official Euro 2028 tie-break regulations.
- Final team identities, group positions and kick-off times.
- Result provider.
- Awards categories.
