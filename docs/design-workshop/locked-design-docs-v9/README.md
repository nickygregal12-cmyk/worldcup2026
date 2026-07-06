# Euro 2028 Predictor — locked design + missing-surfaces documentation pack v5

Date: 2026-07-06  
Branch target: `euro28-development`  
Current verified base to record after: `96a9624 Record approved visual contracts`

This pack supersedes the earlier `euro28-locked-design-docs.zip`, v2 and v3 packs. It includes all locked visual-contract recording work, the `Euro 2028 Predictor Build Brief.pdf` information, and the v3 pack corrections supplied in `V3-PACK-CORRECTIONS.md`.

Use this pack as the next documentation/reference source. Do not install the previous pack separately unless you are comparing changes.

## Purpose

Record the approved visual-contract library and the missing-surface/home-clarity decisions before implementation or seeded-team/persona testing.

This is not a product implementation package. It is a repo-documentation/reference package for the next recording commit, followed by later focused implementation stages.

## Files in this pack

| File | Purpose |
|---|---|
| `NEXT-CHAT-PROMPT-CONTRACTS-REF-LOCKED-SURFACES-V5.md` | Copy-paste prompt for the next repo recording stage. |
| `STAGE-CONTRACTS-REF-LOCKED-SURFACES-V5.md` | Stage document for the recording commit. |
| `APPROVED-VISUAL-CONTRACT-INVENTORY.md` | Full approved/confirmed visual-contract inventory. |
| `REFERENCE-FILE-INSTALL-MAP.md` | Source-to-target map for installing approved HTML references. |
| `DESIGN-CHARTER-UPDATE-DRAFT.md` | Draft wording for the Design Charter. |
| `DECISION-REGISTER-UPDATE-DRAFT.md` | Draft decisions for the decision register / roadmap. |
| `FUNCTIONAL-LEDGER-UPDATE-DRAFT.md` | Draft ledger rows / status notes. |
| `AGENT-RULES-ROADMAP-UPDATE-DRAFT.md` | Draft roadmap/agent-rule updates. |
| `FINAL-DESIGN-SWEEP-CHECKLIST.md` | Final sweep checklist before implementation and seeded testing. |
| `CONTEXTUAL-RETURN-RULE.md` | Global contextual return/back-navigation rule. |
| `HOME-AND-MISSING-SURFACES-BUILD-BRIEF.md` | Extracted build brief decisions from the new PDF. |
| `STAGE-HOME-CLARITY-1-BRIEF.md` | Focused Home implementation brief to use after recording. |
| `MISSING-SURFACES-ROADMAP.md` | Recommended next route/surface work after recording. |
| `sources/Euro 2028 Predictor Build Brief.pdf` | Original uploaded brief, included as a source reference. |
| `sources/V3-PACK-CORRECTIONS.md` | Required corrections to the v3 pack, included as a source reference. |

## Hard boundaries for the recording stage

- No `src/` implementation.
- No Supabase changes.
- No migrations.
- No Migration 019.
- No seeded users or data writes.
- No scoring, resolver, Auth, service-role, RLS or signup implementation changes.
- Approved HTML reference files should be copied byte-exact.
- Any final-sweep changes to HTML should happen in a later explicit sweep stage, not in the byte-exact recording stage.

## Recommended immediate stages

1. `CONTRACTS-REF-LOCKED-SURFACES-3` — record the approved visual contracts and the new roadmap decisions.
2. `DESIGN-FINAL-SWEEP-1` — remove prototype/internal/provisional public-UI content and tighten all approved references.
3. `STAGE-HOME-CLARITY-1` — first implementation slice, because Home is the highest-impact journey surface.

## Implementation order after recording

Recommended order from the build brief:

1. Home Clarity.
2. 13G-C correctness queue: Original bracket coherence after group-score edits, predicted group standings, and shared third-place table.
3. Review Picks.
4. Prediction Trends.
4. Welcome / Join flow.
5. Activity / Updates.
6. League Settings.
7. Match Centre trends.

Keep Original Predictor first in hierarchy throughout.


## v5 additions

This v5 pack includes two extra locked notes from the design workshop:

1. Result corrections must not be treated as a normal Home feature. Matches should not normally need corrected; correction handling remains an admin/internal fallback and should only be explained to users when an exceptional correction genuinely affects visible points.
2. Prediction Trends needs a richer live-tournament scope. It starts as a post-lock aggregate snapshot, then becomes a live trends surface from More, with group-stage, knockout-stage and clearly secondary KO Predictor examples.


## v5 corrections

This v5 pack incorporates the required corrections from `V3-PACK-CORRECTIONS.md`:

1. The reference install map now prevents duplicate contracts by replacing existing reference files at their current filenames for Player View, Points Breakdown, Tournament, How to Play and Admin.
2. The implementation order now preserves the recorded 13G-C correctness queue. Home Clarity may go first as an explicit decision, but Review Picks and later visual adoptions must not silently jump the queue.
3. The confirmed final-standings tie-break ladders are included in the Decision Register draft.
4. Shared States installation must verify the approved header/six-state inventory before byte-exact copy, because the source filename included a duplicate-download suffix.
5. The final sweep clarifies that the Results corrected-result card is the exceptional corrected-result state and must not be removed as if it were normal Home content.
## v5 addition — Candidate Team Pool

v5 supersedes v4. It adds the uploaded Candidate Team Pool and Draw Slot Assignment brief as a future staging/admin data stage.

New files:

- `CANDIDATE-TEAM-POOL-BRIEF.md`
- `V5-ADDITIONS.md`
- `sources/Euro 2028 Predictor Brief.pdf`

The candidate-team-pool brief does not approve product implementation, Supabase schema changes, Migration 019, resolver changes, scoring changes or public display of candidate teams as confirmed Euro 2028 participants.

The core rule is: official tournament draw slots remain stable and separate from candidate/real team identities until deliberate admin assignment.

## v6 update

v6 adds future Admin Scenario Runner / simulation safety scope.

New source briefs added:

- `sources/Euro 2028 Predictor — Admin Scenario Runner.pdf`
- `sources/Simulation Safety Guidelines.pdf`

New derived docs added:

- `ADMIN-SCENARIO-RUNNER-BRIEF.md`
- `SIMULATION-SAFETY-GUIDELINES.md`
- `V6-ADDITIONS.md`

This remains a documentation pack only. It is not a repo patch and does not approve implementation,
schema changes, Migration 019, scoring changes or resolver changes.

## v7 update

v7 adds the streamlined remaining-jobs plan.

New source:

- `sources/euro28_streamlined_remaining_jobs_plan.md`

New derived docs:

- `STREAMLINED-REMAINING-JOBS-PLAN.md`
- `STREAMLINED-BATCH-ORDER.md`
- `V7-ADDITIONS.md`

The main change is sequencing: future work should follow the grouped batch order rather than treating
each idea as a separate small stage.

The immediate next repo step remains a recording-only batch:

`CONTRACTS-REF-LOCKED-SURFACES-3`

## v8 update

v8 adds the unresolved predicted group tiebreaker prompt decision.

New source:

- `sources/Unresolved Group Tiebreaker Prompt.pdf`

New derived docs:

- `UNRESOLVED-GROUP-TIEBREAKER-PROMPT.md`
- `V8-ADDITIONS.md`

The rule is split across the streamlined batch order:

- `STAGE-RULES-SCORING-LOCK-1` records the resolver/rules behaviour.
- `STAGE-ENTRY-AND-REVIEW-JOURNEY-1` implements the user prompt and Review completion behaviour.

## v9 update

v9 adds the Edge-Case Rules Addendum.

New source:

- `sources/Euro 2028 Predictor — Edge-Case Rules Addendum.pdf`

New derived docs:

- `EDGE-CASE-RULES-ADDENDUM.md`
- `V9-ADDITIONS.md`

Important correction:

- Group goals are now auto-calculated only.
- Review should not offer manual group-goals editing.
