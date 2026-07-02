# EURO 2028 PREDICTOR
## AI Agent Working Rules and Updated Build Roadmap
### Version 3.6 — Stage 13A v6 replaces non-portable v5 package; awaiting local verification

> **Authority:** The Consolidated Decision Register governs product rules. The Design Charter governs visual behaviour. This document governs working process and stage sequencing. Where they conflict, the register wins on product decisions and this document wins on process.

## PART 1 — AGENT RULES

### A. Environment boundaries

1. Work only on `euro28-development`.
2. Never commit to, merge into or generate instructions targeting `main`.
3. The only permitted hosted database is Euro staging `gcfdwobpnanjchcnvdco`.
4. The WC26 production project is blocked and must never appear in new code, configuration, migrations or terminal commands.
5. Never run `npx supabase db reset --linked`; local resets only.
6. Never use `sudo`, `npm audit fix --force` or `git add .`.
7. Never ask for, print or embed passwords, access tokens, service-role keys or database secrets.
8. Work in `~/Desktop/euro28predictor` and use British English.

### B. Checkpoint and verification discipline

9. Before generating a package, state the exact expected commit and require a clean tree, correct branch and correct linked project reference.
10. Stop on any failed precondition; do not work around it.
11. Never claim a check passed without the output from Nicky's terminal. Agent-side package testing is supporting evidence only.
12. `npm run check` must pass before any commit.
13. Database work follows: package → local checks → local reset → linked-ref verification → remote dry run → one migration push → hosted verification → docs → commit → push → clean tree.
14. One sequential migration per database batch; never edit a hosted migration.
15. Every package includes a complete file manifest, per-package checksum, exact guarded commands and no undeclared deletion.
16. Review `git diff --stat` against the manifest before testing and before commit.
17. Superseded ZIPs are deleted from Downloads; package names and install commands use exact versions, never wildcards.

### C. Scope and decision control

18. Confirmed register decisions are not silently changed in implementation.
19. Provisional scoring and tie-break values remain central and versioned.
20. New ideas enter the roadmap before code; no feature creep inside an active batch.
21. Never invent tournament data. Sample data is allowed only where the register explicitly defines it as provisional and visibly labelled.
22. Preserve architectural invariants:
    - one canonical bracket resolver;
    - live and predicted contexts never blend;
    - slot references rather than hardcoded teams;
    - one best-third matrix with all 15 combinations tested;
    - one versioned scoring source;
    - RLS on every protected table and no direct browser writes;
    - Original and KO points never combine.
23. No WC26 change is permitted from this workstream.

### D. Communication and honesty

24. Explain plainly what a change does and why before commands.
25. Challenge weak ideas without gold-plating the agreed scope.
26. State uncertainty honestly.
27. Every completed work-batch response states the expected commit, migration count and next single task.
28. When context is running long, provide a cold-safe handover.
29. Full installation guides must appear directly in chat as copy-and-paste Terminal blocks, as well as downloadable files where practical.

### E. Quality gates

30. New logic ships with Vitest coverage in the same batch.
31. New database objects ship with a numbered pgTAP suite and audit script wired into `npm run check`.
32. New external boundaries use Zod validation.
33. New UI includes loading, empty, error and partial-failure handling, focus visibility, keyboard support, reduced motion and both themes.
34. Privacy gates—especially post-lock aggregate visibility—must be enforced server-side as well as hidden in the UI.

## PART 2 — UPDATED ROADMAP

## Current state

- Expected commit: `4e1ae38`.
- Migration count: 14.
- Stages 1–12 complete.
- Stage 13A v1–v3 superseded and never installed.
- Stage 13A v4 generated but never installed.
- V4 is now superseded because its Bracket tab switches to KO while Groups remains fixed; Design Charter v1.4 requires the confirmed three-state lifecycle, with Groups switching to KO only at full Round of 16 readiness and Bracket remaining permanent.
- No code is changed by this reconciliation batch.

## Immediate operational tasks

### OB-1 — Dependabot — BLOCKED

Blocked while `main` remains the repository default branch because GitHub only reads Dependabot configuration from the default branch. Do not modify WC26 `main`. Revisit when Euro has its own repository or safely becomes the default branch.

### OB-2 — Database backup and restore — IMPLEMENTED AT CHECKPOINT AFTER 505d31a

Guarded Euro staging logical backup and destination-safe restore rehearsal. Run and verify a fresh labelled backup before every future hosted migration. The tool records roles, app schema, app data and migration history; Supabase-managed Auth/Storage internals remain outside its scope.

### OB-3 — Staging admin access for Nicky — IMPLEMENTED AFTER 9232d57

The reviewed SQL-generation and SQL Editor procedure grants, verifies and revokes explicit Euro staging administrator access without exposing a service-role key or adding a browser grant path. Product-owner testing uses `owner` because Stage 12 contains owner-only controls.

Requirements enforced:

- verify Euro staging project before the operation;
- name the account, role and audit note explicitly;
- preserve browser self-grant blocking;
- generate SQL outside the repository;
- use the existing audited `private.euro28_set_tournament_admin` function;
- document grant, independent verification, app test and revocation;
- never expose service-role credentials;
- never grant an account silently.

## Stage 13 — Shared design system and mobile-first rebuild

### Stage 13A v6 — Design system, app shell and Home

Package correction: v5 was never committed and is superseded because its lockfile contained private build-environment registry URLs. V6 preserves the same product scope, uses only public npm registry URLs, and adds `audit:package-lock` to the permanent gate.

Start from `4e1ae38` and reuse v4's compliant work, but implement the confirmed Design Charter v1.4 navigation lifecycle.

Primary navigation before the full KO readiness boundary:

**Groups | Bracket | Home | Leagues | More**

Primary navigation after the full KO readiness boundary:

**KO | Bracket | Home | Leagues | More**

Requirements:

- Position 1 changes label, icon and destination together.
- Position 2 Bracket never changes destination.
- The ordinary switch trigger is confirmed Option B with all four readiness conditions:
  1. all 36 group matches have authoritative completed results;
  2. final standings are confirmed;
  3. all eight Round of 16 fixtures have both participant slots populated by the canonical resolver;
  4. no best-third or bracket-allocation errors remain unresolved.
- Before that full switch, More exposes KO Predictor once at least one Round of 16 fixture has both teams resolved.
- Early KO access renders only fully resolved fixtures; TBC and partially resolved fixtures are hidden.
- Groups remains Position 1 throughout the early-access state, including when group matches are complete but the Round of 16 is still only partially populated.
- Group stage review moves into More only after the full switch and remains permanently reachable.
- Central competition readiness drives every state; no component date logic.
- Route and rendering tests cover:
  - no early KO fixture;
  - at least one complete Round of 16 pairing;
  - groups complete but Round of 16 partial;
  - the exact all-eight-fixtures transition boundary;
  - permanent Bracket routing;
  - atomic label/icon/destination switching;
  - TBC fixture hiding;
  - permanent Group stage review after the switch.
- No Migration 015 unless a genuinely missing server-side phase field is discovered and separately approved.

### Stage 13B — Groups predictor and review flow

- Rebuild all 36 group match cards.
- Implement the shared `<TeamLabel>` primitive with circular ISO-keyed flags and neutral unresolved-slot labels.
- Implement the shared score input and visible saved, saving, submitted, locked and grace states.
- Implement consistent joker controls and mobile interaction safety.
- Preserve permanent Group stage review access after the navigation switch.

### Stage 13C — Original bracket and KO Predictor

- Original bracket remains a permanent destination throughout every phase.
- Real KO Predictor remains a separate competition and visual context.
- Use the shared `<TeamLabel>` and flag assets.
- Never blend predicted and live participants or points.

### Stage 13D — Leagues, results, shared predictions and responsive polish

- Separate Original and KO standings.
- Results and live tables.
- Member comparison and shared predictions.
- Final removal of development and inherited presentation language.
- Share-card design mini-spec before implementation.

### Stage 13E — Team Profile Sheet

Implement once through `<TeamLabel>` and present as a bottom sheet.

Allowed sources only:

1. centrally stored, admin-edited curated facts;
2. app-owned tournament results, standings and fixtures;
3. post-lock prediction aggregates plus the viewing user's prediction.

Binding gates:

- no external football-data API;
- aggregates unavailable before global lock at every data boundary;
- deliberate tap on team flag/name only;
- score, joker and match-card controls cannot open the sheet;
- tests for privacy gate and accidental-open prevention;
- charter tokens, both themes, loading, empty, error and partial-failure states;
- one provisional sample team is enough until Stage 17.

## Stage 14 — Observability and resilience

- Sentry in the ErrorBoundary and Netlify functions with source maps.
- Scheduled-function heartbeat and health endpoint.
- Zod validation retrofitted to all external function boundaries.

## Stage 15 — End-to-end browser testing

- Playwright in GitHub Actions.
- Begin with sign in → save prediction → verify staging persistence.
- Expand only where unit/database tests cannot cover real browser interaction.

## Stage 16 — Seeded full-tournament test

- One command can place staging in pre-lock, mid-groups, knockout-live and final-complete states.
- Use realistic sample nations, including host nations such as Scotland.
- Mark every sample team provisional in data and visibly in every relevant UI.
- Test groups, standings, both competitions, jokers, scoring corrections, all 15 best-third combinations and Team Profile Sheets.
- Test that sample nations can be replaced later by data-only ISO/slot-reference changes.

## Stage 17 — Real tournament data

- Replace provisional nations with confirmed teams by data update only.
- The acceptance gate must prove zero component or resolver code changes are required.
- Add official draw positions, kick-off times, venues and tie-break rules.
- Finalise and lock the scoring ruleset.

## Stage 18 — Optional late integrations

### Stage 18A — Optional Google sign-in

- Supabase OAuth only after Stage 17 and before invitations.
- Existing email/password accounts remain functional and keep the same data.
- No duplicate profiles, predictions, memberships or admin status.
- Dedicated regression test for existing accounts.
- Document redirects, linking behaviour, errors, rollback and provider disablement.
- Optional; not a go-live blocker.

### Stage 18B — Optional results provider

- Provider selected close to the tournament.
- Validated through Stage 14 Zod boundaries.
- Manual results remain authoritative and the fallback.

## Stage 19 — Go-live hardening

- Match-night runbook.
- Uptime and health monitoring.
- Full dress rehearsal.
- Load and query review at realistic scale.
- Backup/restore rehearsal.
- Environment lockdown and secret review.

## Open decisions

- Final joker multiplier.
- Official tie-break rules.
- Confirmed teams, draw and times.
- Whether optional Google sign-in is enabled.
- Results provider.
- Awards categories.

## Next single task

Stage 13A v6 and OB-2 are complete through `9232d57`. OB-1 remains blocked by the default-branch boundary. Complete the explicit OB-3 staging owner grant and verification, then begin Stage 13B.

**Starting commit for OB-3:** `9232d57`
**Migration count:** `14`
