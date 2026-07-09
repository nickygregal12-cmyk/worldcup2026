> **PACK SNAPSHOT — do not work from this copy.** Part of the locked v9 install pack, frozen at its 2026-07-06 state. If a canonical version exists it lives outside the pack (docs/ or docs/archive/); a filename search that lands here should follow the canonical copy.

# Stage — CONTRACTS-REF-LOCKED-SURFACES-3

## Status

Draft stage for repo recording.

## Purpose

Record all locked visual contracts and the missing-surface/home-clarity decisions that were approved during the design workshop after `DESIGN-CONTRACTS-APPROVAL-1`.

This stage exists so the repo has an accurate record before final design sweep, implementation or seeded-team testing.

## Base state

- Branch: `euro28-development`.
- Known package head before this stage: `96a9624 Record approved visual contracts`.
- Active migrations: 18.
- Migration 019: not present and not approved.
- WC26 production: inactive / fail-closed.

## Scope

Docs/reference only.

Install/record approved references for:

- Home B.
- Match Centre A.
- Player View A.
- Points Breakdown A.
- Account B.
- Tournament Overview A.
- How to Play / Rules Hub A.
- Admin Control Room A.
- Results.
- Leaderboards.
- Offline Player Claim.
- Bracket Health.
- Team Profile Sheet.
- Shared States.

Record roadmap decisions from `Euro 2028 Predictor Build Brief.pdf`:

- functional smoothness / no wrong-state flicker rule;
- Home Clarity;
- Review Picks;
- Prediction Trends;
- Welcome / onboarding;
- invite/join states;
- League Settings / Manage League;
- Activity / Updates;
- Match Centre trends;
- Tournament Picks placement;
- More menu treatment;
- Support and Privacy requirements;
- old WC26 pages not to revive as-is;
- global contextual return rule.

## Non-goals

- No `src/` implementation.
- No Supabase schema changes.
- No migrations.
- No Migration 019.
- No scoring/resolver/Auth/service-role/RLS changes.
- No seeded users or data writes.
- No final-sweep editing of approved HTML in this recording stage.

## Acceptance

The stage is complete when:

- all approved HTML contracts are present in `docs/reference-prototypes/` or recorded as already present;
- all existing-surface replacements use the existing filename, with exactly one reference file per surface;
- Shared States source header and six-state inventory are verified before install;
- Design Charter records the full approved inventory and suffix convention;
- Decision Register records the new user-journey and route decisions;
- Functional Ledger records recording-stage rows and implementation follow-ons;
- Roadmap records the recommended build order;
- final sweep checklist is recorded;
- contextual return rule is recorded;
- `npm run check` passes;
- commit is pushed to `euro28-development`;
- deployed verifier passes.


## Additional locked notes added in v6

- Result corrections are not normal Home content. Home should not promote a standing correction card; exceptional corrections should be explained only where they affect visible points, normally Results, Match Centre or Points Breakdown.
- Prediction Trends requires detailed live-tournament scope: post-lock aggregate snapshot first, then group-stage and knockout-stage trend stories from More, with Original Predictor primary and KO Predictor trends clearly secondary.


## v6 required corrections

- Install approved candidates for existing surfaces into the existing reference filenames, not new filenames.
- Assert one reference file per surface after install.
- Record the 13G-C correctness queue explicitly in the roadmap/ledger. Home Clarity may go first, but Review Picks and dependent visual adoptions must not silently bypass the queue.
- Add the confirmed Original and KO Predictor final-standings tie-break ladders to the Decision Register.
- Verify the Shared States source file header and six-state inventory before copying it byte-exact.
- Preserve the Results corrected-result card as the exceptional corrected-result state; do not remove it during the final sweep.
## v6 source added after v4

This recording stage also preserves the Candidate Team Pool and Draw Slot Assignment brief as future staging/admin data guidance.

It does not implement the candidate pool. It does not approve Migration 019. It does not change public UI, scoring, resolver, Auth, Supabase or WC26 production.

The brief should be recorded so the later seeded-team/testing setup uses realistic candidate teams while keeping official draw slots and public participant claims safe.

## v6 note — Admin Scenario Runner source docs

The v6 pack adds future Admin Scenario Runner / simulation safety source docs.

This does not change the locked visual contract recording scope.

Do not implement Scenario Runner during the locked-contract recording commit. Record it only as a future
stage and safety boundary.


## Additional v6 recording requirement

Record the Admin Scenario Runner and Simulation Safety source briefs as future-stage documentation only.
Do not implement them in this commit.
