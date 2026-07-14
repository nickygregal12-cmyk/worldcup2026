# Document Authority Map — the documentation constitution

This is THE index. If a markdown document under `docs/` is not listed here, it is not current
guidance, and the audit `npm run audit:doc-structure` fails the build until it is either listed or
archived. If this map conflicts with repo, runtime, tests, audits, build, visual review or Supabase
evidence, **stop and record the conflict** — do not resolve it silently.

The map deliberately records **one job per document** and no volatile numbers. Counts, commits and
migration totals live in the documents that own them; repeating them here would only create one more
surface that can go stale.

---

## 1. The four rules

**The same-commit staleness rule.** A document that records state must be corrected in the **same
commit** as the change that made it stale. Recorded state equals real state. This is not a
convention — `scripts/check-governance-coherence.mjs` enforces the mechanically checkable part
(migration-count claims, version headers, return-point commits) and fails the build.

**What justifies a new document.** A job no existing document has, **plus a row in this map added in
the same commit**. A new document that is not in this map fails `audit:doc-structure`. If the job
belongs to a document that already exists, amend that one instead: the corpus reached 168 top-level
documents because "write a new stage doc" was always easier than "update the right one".

**Session reports.** Working notes live in `reports/`, named `REPORT-<topic>-<date>.md`. `reports/`
is **gitignored** — reports never travel between machines, and the Copy-Back Report returned in chat
is the only channel that reaches the owner. A `REPORT-*` file anywhere outside `reports/` fails the
audit. (`reports/REPORT-P6C-EXECUTOR.md` predates the rule and stays tracked as-is.)

**The archive procedure.** When work closes, its document is history, not guidance:
1. `git mv docs/<doc>.md docs/archive/<doc>.md` — history follows the file.
2. Open it with the ARCHIVED banner (below). Every file in `docs/archive/` must carry it.
3. Repoint any audit script that asserts markers inside it to the new path, and run that audit.
4. Remove its row from this map.

Commit the move separately from the banner where the file is small: a banner can outweigh a short
document's content and drop the rename below git's similarity threshold, which silently loses the
history the `git mv` was for.

The banner, verbatim:

```
> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.
```

`docs/archive/` is **frozen history**. It is excluded from current-state claims by
`check-governance-coherence`, so a future migration never forces an edit to a closed stage record.
Do not edit archived documents, and do not cite them as current — their internal cross-references
still point at pre-archive paths, deliberately: rewriting them would falsify the record.

---

## 2. The living set

### Root (the only markdown permitted at the repository root)

| Document | Its one job |
| --- | --- |
| `CLAUDE.md` | Standing law for every agent session. Read before anything else. |
| `AGENTS.md` | Entry point that routes an agent to the control layer. |
| `PROJECT-CONTROL.md` | Live current-state dashboard **and the return-point anchor** — see its row under *Current state and plan*. Structure and declared commit are audit-enforced. |
| `README.md` | What the project is, for a human arriving cold. |

### `AGENT-CONTROL/` — the durable first-read control layer

Read first, stop on conflicts, keep scope narrow. `00`–`09` and `11` carry the standing agent rules,
scope guards, workflow, Copy-Back format, design/database/visual rules, handover hygiene and stage
order. `10` is this map.

### Authority (CLAUDE.md §1 hierarchy)

| Document | Its one job |
| --- | --- |
| `docs/EURO28-PROJECT-CONSTITUTION.md` | Process law: discrepancies reported not resolved; the check suite is a ratchet. |
| `docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md` | The append-only register of confirmed product decisions. |
| `docs/EURO28-DESIGN-CHARTER.md` | Non-visual design law (architecture, CSS Modules, tokens). Visual direction superseded by `docs/design programme/` (proposed, not adopted). |
| `docs/RULES-SCORING-LOCKED-CONTRACT.md` | The ONLY scoring authority. Nothing else may assert point values. |

### Current state and plan

| Document | Its one job |
| --- | --- |
| `docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md` | What is actually finished, with proof. |
| `docs/EURO28-AGENT-RULES-AND-ROADMAP.md` | Accumulated agent rules and roadmap ledger. |
| `docs/EURO28-SITE-ACCESS-MAP.md` | Which surfaces exist and who may reach them. |
| `docs/PRODUCT-COMPLETENESS-ROADMAP.md` | Remaining product gaps and their sequencing. |
| `docs/STREAMLINED-BATCH-ORDER.md` | The order the remaining batches are worked in. |
| `PROJECT-CONTROL.md` | The live current-state dashboard, and the **return-point anchor**: it declares the latest verified commit that `check-governance-coherence` validates every governing doc's return point against. That audit also asserts the dashboard's required sections and that its declared commit is real and an ancestor of `HEAD`. |

### Engineering handbook

| Document | Its one job |
| --- | --- |
| `docs/DATABASE.md` | The database model and the active migration list. |
| `docs/DEPLOYMENT.md` | How this deploys, and the Supabase guardrails. |
| `docs/DEVELOPMENT.md` | Repo safety and architecture separations for day-to-day work. |
| `docs/TESTING.md` | The gates, the focused audits, and what green means. |

### Operations (safety-critical — read before touching a database)

| Document | Its one job |
| --- | --- |
| `docs/DATABASE-BACKUP-AND-RESTORE.md` | The backup a staging write requires first, every time. |
| `docs/STAGING-ADMIN-ACCESS.md` | How to reach Euro staging as an administrator. |
| `docs/OPERATIONS-RUNBOOK.md` | Deploys, backups and incidents, written for the owner. |
| `docs/LOCAL-SCENARIO-RUNNER-RUNBOOK.md` | Running scenarios locally without touching hosted data. |
| `docs/SIMULATION-SAFETY-GUIDELINES.md` | Why simulated results can never become official ones. |

### Standing rules and guards

| Document | Its one job |
| --- | --- |
| `docs/EDGE-CASE-RULES-ADDENDUM.md` | The tournament edge cases the product must still answer. |
| `docs/UNRESOLVED-GROUP-TIEBREAKER-PROMPT.md` | The unresolved group-tiebreaker question, kept open on purpose. |
| `docs/CONTEXTUAL-RETURN-RULE.md` | Where a player returns to after an action. |
| `docs/AGENT-DRIFT-GUARDS.md` | Why the drift audits exist and what each one catches. |
| `docs/DESIGN-CONTRAST-GUARDS.md` | Why the Home page once shipped unreadable, and the guard that prevents it. |
| `docs/THIRD-PARTY-ASSETS.md` | Provenance and licence constraints for visual assets. |
| `docs/APPROVED-VISUAL-CONTRACT-INVENTORY.md` | Which visual contracts are approved and locked. |
| `docs/REFERENCE-FILE-INSTALL-MAP.md` | Where each reference file installs to. |

### Behaviour contracts (each asserted by an audit — moving one breaks its audit)

| Document | Its one job |
| --- | --- |
| `docs/ADMIN-OPS-TRUST-CONTRACT.md` | Admin operations the player must be able to trust. |
| `docs/ENTRY-AND-REVIEW-JOURNEY-CONTRACT.md` | The entry and review journey's required behaviour. |
| `docs/LEAGUE-SETUP-AND-INVITES-CONTRACT.md` | League setup and invite behaviour. |
| `docs/MORE-ACCOUNT-TRUST-CONTRACT.md` | More/Account surface trust behaviour. |
| `docs/RESULTS-AND-SCORING-TRUST-CONTRACT.md` | Results and scoring trust behaviour. |
| `docs/FINAL-DESIGN-CONTENT-SWEEP-CONTRACT.md` | The design/content sweep the build must satisfy. |
| `docs/STAGE-13F-I-TOURNAMENT-PICK-CONTRACT.md` | The approved tournament-pick set and values. Despite the `STAGE-` prefix this is a live contract, amended 2026-07-10 to the locked scoring. |
| `docs/PUBLIC-SIGNUP-CONTROLLED-OPEN-CONTRACT.md` | Controlled-open behaviour for public signup. |
| `docs/PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-CONTRACT.md` | External settings that must be verified before opening. |
| `docs/PUBLIC-SIGNUP-IMPLEMENTATION-CONTRACT.md` | Public-signup implementation behaviour. |
| `docs/PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-CONTRACT.md` | Readiness conditions before implementation. |
| `docs/PUBLIC-SIGNUP-OPENING-GATE-CONTRACT.md` | The gate that must pass before signup opens. |
| `docs/PUBLIC-SIGNUP-SMTP-READINESS-CONTRACT.md` | SMTP readiness before signup opens. |

### Live tooling input

| Document | Its one job |
| --- | --- |
| `docs/CANDIDATE-TEAM-POOL-BRIEF.md` | The candidate pool and draw-slot rules that `scripts/assign-candidate-teams.mjs` reads. |

### Directory zones (not individually indexed)

| Path | Its one job |
| --- | --- |
| `docs/archive/` | Frozen history. Every file carries the ARCHIVED banner. Never current guidance. |
| `docs/reference-prototypes/` | Approved prototypes — binding content/interaction contracts (CLAUDE.md §1). |
| `docs/design programme/` (note the space) | **PROPOSED, NOT ADOPTED.** Governs nothing. Cite only as "(design programme — proposed, not yet adopted)". |
| `docs/design-workshop/locked-design-docs-v9/` | The locked v9 design pack — a frozen source snapshot. |
| `docs/design-baselines/` | Visual baseline captures used for review and regression. |
| `docs/future-templates/` | Templates not yet in use. |

---

## 3. Pending — not classified, and deliberately so

**Deferred behind the Leagues boundary.** These eight are closed stage records and belong in
`docs/archive/`, but each is asserted by a league-named audit script, and an interrupted Leagues
session's work must rebase cleanly. Archiving them would force edits to exactly those scripts. They
stay at the top of `docs/` and are allowed by `audit:doc-structure` as an explicit, named exception —
**not** because they are living. Archive them once Leagues recovery lands.

`STAGE-11-LEAGUES-AND-SHARED-PREDICTIONS.md`, `STAGE-13G-B-LEAGUE-LIFECYCLE.md`,
`STAGE-13G-C2-LEAGUE-RACE-STORY.md`, `STAGE-13G-C3-LEAGUE-RACE-SUMMARY.md`,
`STAGE-13G-C4-COMPACT-LEAGUE-STANDINGS.md`, `STAGE-13G-C5-LEAGUE-DETAIL-DESTINATION.md`,
`STAGE-13G-C6-COMPACT-LEAGUE-SHELL.md`, `STAGE-LEAGUE-SETUP-AND-INVITES-1.md`.

**Owner to confirm.** Kept living pending a ruling, because archiving a document asserts it records
*completed* work — and for this one that assertion may be false:

- `docs/STAGE-WELCOME-PAGE-CONTRACT.md` — says "draft candidate — not yet approved". That is pending work, not completed work; the ARCHIVED banner would assert something untrue about it. Approve, reject, or archive.

**Resolved 2026-07-15 (owner ruling).** `ADMIN-SCENARIO-RUNNER-BRIEF.md` is superseded by
`LOCAL-SCENARIO-RUNNER-RUNBOOK.md` and is archived. `STAGE-13G-HANDOVER-20260705.md` stopped being
load-bearing when the return-point anchor moved to `PROJECT-CONTROL.md`, and is archived.
