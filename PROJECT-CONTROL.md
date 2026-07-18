# Project Control Dashboard

The live current-state summary for whoever picks this up next. Not a history file — closed work
lives in `docs/archive/`, and the living document set is indexed by
`AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`.

This document declares the **return-point commit** that `scripts/check-governance-coherence.mjs`
validates every governing document's return point against, and its structure is asserted by that
audit. If a heading or a required field below disappears, the build fails. That is deliberate: the
one document whose entire job is to state current state used to be the one nothing verified, and it
drifted four claims deep.

**It repeats no counts.** Where a single document already owns a number, this one names that
document instead of copying the value — a dashboard that duplicates figures is just one more surface
that goes stale. The return-point commit is the exception, because holding it is this document's job.

## Current State

| Item | Current value |
| --- | --- |
| Project | Euro 2028 Predictor |
| Branch | `euro28-development` |
| Latest verified commit | `87e4006 Close the sim-clock gap: the joker lock and grace read the simulated clock in the prediction journey` |
| Current stage | **Stage GODMODE-1 (owner-approved 2026-07-18) is implemented and pushed** through commit `87e4006`: the Admin Tournament Simulator is live at `#/admin?section=simulator` — timeline scrubbing, per-match score scripting and synthetic world seed/teardown, driving the scenario-runner operations behind Migration 022's owner-only, provisional-only DB functions (scoring/resolver reused untouched; simulated results never official; sim-clock coverage gap closed). Full `npm run check` green (144 test files / 884 tests). **Migration 022 is applied to local only; applying it to Euro staging remains an owner-gated, backup-first step.** The earlier prototype-pack page adoption remains deployed through `90aba9b`. Owner visual review of the new Simulator section remains open. |
| Immediate next stage | The remaining prototype-adoption items: Bonus games hub (KO-only), Match Centre story sections, H2H predicted-positions graph. Prediction-write reliability remains a separate high-care stage. |
| Current deployment URL | `https://euro28-predictor-dev.netlify.app` |
| Active migration count | Owned by `docs/DATABASE.md` — not repeated here. Asserted against `supabase/migrations/` by `audit:governance-coherence`. |
| Migration 021 | Present as `202607090021_euro28_venue_metadata.sql`; `docs/DATABASE.md` owns the active sequence. Any later migration must verify local and Euro staging alignment first. |
| Primary environment | **This Mac.** Full stack validated here: `npm run check` green, Playwright 1.61.1 installed with Chromium, the visual probe/shot harness present and exercised. |

### The "Latest verified commit" convention

It names the most recent commit proven green by a full `npm run check`. A session updates it to the
commit it verified, which is necessarily an **ancestor** of the commit doing the updating — a commit
cannot certify its own hash. `audit:governance-coherence` enforces exactly that: the declared commit
must exist and must be an ancestor of `HEAD`.

## Immediate Priority Order

1. **Final Product Experience adoption** — make the final contract, route register and enforcement
   gate the sole implementation authority; keep older prototypes as provenance.
2. **Shared foundations and Tournament/qualification** — shared flags, compound group/third-place
   presentation and canonical football facts before consuming pages are rebuilt.
3. **The `visual.yml` CI lift** — the visual tier runs on this Mac but has no CI workflow.
   `.github/workflows/` currently holds only `euro28-checks.yml`.
4. **The `save_my_prediction_bundle` conflict-loop fix — high care.** On 2026-07-14 a runaway
   internal retry flooded staging with roughly **2.6 million failed requests**. The fix is a retry
   cap, a revision re-read, and a statement timeout. This touches a prediction-write path: take a
   **fresh verified backup first, every time** (CLAUDE.md §2), and do not modify scoring, resolver or
   Auth SQL in the same breath.

## Current Blockers

**None.** The Codespace is abandoned pending deletion and is not a blocker; work proceeds on this Mac.

## Deliberately Deferred

Not forgotten, not blocked — sequenced on purpose. Do not pick these up opportunistically:

- **Push-notification sends** — post-draw.
- **Top Scorer build** — Stage 17A. Verify the current local and Euro staging migration sequence before authoring SQL.
- **Public signup** — post-draw. It remains closed.

## Do-Not-Touch Areas

- WC26 production Supabase (`ouhxawizadnwrhrjppld`) — permanently off-limits, and blocked mechanically
  by the PreToolUse hook in `.claude/hooks/`.
- Scoring logic, resolver logic, Supabase Auth, and public signup — unless explicitly scoped.
- Production config and production data.
- CI workflows, `package.json` and migrations — unless the stage explicitly scopes them.

## Source-Of-Truth Uncertainty

- Docs report proven reality, but docs are not proof alone.
- Stage documents are historical unless promoted by `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`.
- If repo, runtime, tests, audits, build, deployment or Supabase disagree with a document, **stop and
  record the conflict** — do not resolve it silently (CLAUDE.md §0, Constitution §5.8).

<!-- Owner-judgement fields (current stage, priorities, blockers, deferrals) supplied by owner ruling
     2026-07-17. Mechanical fields (verified commit, migration count, visual tooling) are verified
     against the tree, not asserted from memory. -->
