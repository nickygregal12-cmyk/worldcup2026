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
| Latest verified commit | `ba9b4f3 The document whose job is current state stops being the one nothing verifies` |
| Current stage | Design Programme per-page re-cut — **complete**. Every core page is on the DP; the Leagues re-cut closed 2026-07-16. |
| Immediate next stage | The page re-cut is closed. Next by priority is the **`visual.yml` CI lift** (see Immediate Priority Order). |
| Current deployment URL | `https://euro28-predictor-dev.netlify.app` |
| Active migration count | Owned by `docs/DATABASE.md` — not repeated here. Asserted against `supabase/migrations/` by `audit:governance-coherence`. |
| Migration 021 | Not present in the tree. Before authoring any new SQL, check for a **stranded Migration 021** (it may exist only on another machine — CLAUDE.md §2). |
| Primary environment | **This Mac.** Full stack validated here: `npm run check` green, Playwright 1.61.1 installed with Chromium, the visual probe/shot harness present and exercised. |

### The "Latest verified commit" convention

It names the most recent commit proven green by a full `npm run check`. A session updates it to the
commit it verified, which is necessarily an **ancestor** of the commit doing the updating — a commit
cannot certify its own hash. `audit:governance-coherence` enforces exactly that: the declared commit
must exist and must be an ancestor of `HEAD`.

## Immediate Priority Order

1. **The `visual.yml` CI lift** — the visual tier runs on this Mac but has no CI workflow.
   `.github/workflows/` currently holds only `euro28-checks.yml`.
2. **The `save_my_prediction_bundle` conflict-loop fix — high care.** On 2026-07-14 a runaway
   internal retry flooded staging with roughly **2.6 million failed requests**. The fix is a retry
   cap, a revision re-read, and a statement timeout. This touches a prediction-write path: take a
   **fresh verified backup first, every time** (CLAUDE.md §2), and do not modify scoring, resolver or
   Auth SQL in the same breath.

## Current Blockers

**None.** The Codespace is abandoned pending deletion and is not a blocker; work proceeds on this Mac.

## Deliberately Deferred

Not forgotten, not blocked — sequenced on purpose. Do not pick these up opportunistically:

- **Push-notification sends** — post-draw.
- **Top Scorer build** — Stage 17A. Check for a stranded Migration 021 before authoring SQL.
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
     2026-07-15. Mechanical fields (verified commit, migration count, visual tooling) are verified
     against the tree, not asserted from memory. -->
