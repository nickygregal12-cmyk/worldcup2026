> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Next chat prompt — CONTRACTS-REF-LOCKED-SURFACES-3

You are continuing the Euro 2028 Predictor project.

This is a recording stage, not implementation.

Use the supplied v9 locked design docs pack as the latest source package.

## Repo context

Expected branch:

`euro28-development`

Known package head from the design workshop:

`96a9624 Record approved visual contracts`

Known database boundary:

- active migrations: 18;
- no Migration 019;
- Migration 019 is not approved.

WC26 production must remain untouched and fail-closed.

## Stage name

`CONTRACTS-REF-LOCKED-SURFACES-3`

## Purpose

Record the v9 pack into the repo before implementation.

This should install/record:

- locked visual contracts;
- corrected reference file install map;
- Home and missing-surface build brief;
- candidate team pool brief;
- Admin Scenario Runner brief;
- Simulation Safety Guidelines;
- Streamlined Remaining Jobs Plan;
- updated Decision Register / Roadmap / Ledger / Charter drafts;
- final design sweep checklist;
- contextual return rule;
- scoring/tiebreak lock notes.

## Hard boundaries

Do not change:

- product source routes/components;
- Supabase schema;
- migrations;
- scoring logic;
- resolver logic;
- Auth settings;
- service-role tooling;
- RLS;
- official result entry;
- fake result writes.

Do not create Migration 019.

## Key v9 sequencing decision

After this recording stage, future implementation should follow this grouped order unless Nicky explicitly
re-sequences it:

```text
1. STAGE-RULES-SCORING-LOCK-1
2. STAGE-ENTRY-AND-REVIEW-JOURNEY-1
3. STAGE-MORE-ACCOUNT-TRUST-1
4. STAGE-TOURNAMENT-STORY-SURFACES-1
5. STAGE-LEAGUE-MANAGEMENT-1
6. STAGE-CONTEXTUAL-SURFACES-1
7. STAGE-CANDIDATE-TEAM-POOL-1
8. STAGE-ADMIN-SCENARIO-RUNNER-1
9. STAGE-LEGACY-REFERENCE-CLEANUP-1
10. STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1
```

## Reference-file safety

Use the corrected one-contract-per-surface install map.

If a surface already has a reference file, replace that existing file for that surface. Do not create a second
filename for the same surface.

After install, assert exactly one reference file per surface in `docs/reference-prototypes/`.

## Scenario Runner note

Record Scenario Runner and simulation safety as future-stage docs only.

Do not implement Scenario Runner in this recording commit.

## Candidate Team Pool note

Record Candidate Team Pool as a future admin/data stage only.

Do not implement slot assignment in this recording commit.

## Stop point

After the recording patch is applied and gates pass, stop for Nicky's terminal evidence.

## v9 additional source brief

The v9 pack adds:

- `sources/Unresolved Group Tiebreaker Prompt.pdf`
- `UNRESOLVED-GROUP-TIEBREAKER-PROMPT.md`
- `V9-ADDITIONS.md`

Record this as a locked decision.

Do not implement the resolver or user prompt during the recording commit.

Stage placement after recording:

- `STAGE-RULES-SCORING-LOCK-1` records resolver/rules behaviour.
- `STAGE-ENTRY-AND-REVIEW-JOURNEY-1` implements the Groups/Review user flow.


## v9-specific reminder

Also record the unresolved predicted group tiebreaker prompt.

This must be recorded as a decision now, but not implemented during the recording stage.


## v9-specific reminder

Also record the Edge-Case Rules Addendum.

This includes:

- unresolved in-group tiebreaker prompt;
- best third-place resolver prompt;
- bracket invalidation after group-score edits;
- joker confirmation modal;
- group goals auto-calculated only;
- locked prediction snapshot;
- joining league after lock;
- KO Predictor scoring examples;
- delayed/postponed/suspended/abandoned/replay/result-pending match states.

Record only. Do not implement during this commit.
