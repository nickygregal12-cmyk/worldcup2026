# Simulation Safety Guidelines

## Critical rule

Simulated/fake results must never become real results.

Fake clock + fake scores may simulate the tournament for testing, but they must never become the
official result source of truth.

## Required separation

The system must clearly separate:

| Result type | Purpose | Can affect real user scoring? |
|---|---|---|
| Official results | Real tournament operation | Yes |
| Simulated results | Admin/testing scenario only | No, unless the app is explicitly in simulation mode |
| Preview-only scenario output | Calculation preview without writing | No |

Official results and simulated results must not share an ambiguous state.

A fake score must never look like a real score to the scoring engine, leaderboard engine, Bracket Health,
Prediction Trends or public Results page unless the whole app is intentionally running in a clearly marked
simulation/test mode.

## Preferred safety models

The implementation should choose the safest model after repo inspection:

### Option A — preview-only simulation

The Scenario Runner calculates simulated tournament states without writing results into the official results
table.

This is safest, but may not test the full app as deeply.

### Option B — separate simulation namespace

Simulated results may be stored, but only in a clearly separate simulation namespace/source that cannot be
read by normal scoring unless simulation mode is active.

Possible concepts:

- `source = simulation`
- `scenario_id`
- `simulation_run_id`
- `is_simulated = true`

### Option C — local/staging-only seeded scenario

Simulated results can be applied only in local or Euro staging, behind strict environment checks, and must
be cleared before any real tournament operation.

This still needs source separation so fake data cannot accidentally be treated as official.

## Real scoring protection

The real scoring engine must only score from official result data.

It must ignore:

- simulated results;
- preview-only results;
- scenario-runner results;
- test fixtures;
- fake clock-generated scores;
- stale simulation data;
- any result marked `source = simulation` or equivalent.

If the app cannot guarantee this, the Scenario Runner must remain preview-only.

## Fake clock protection

Changing the fake clock must not automatically:

- create official results;
- award real points;
- mark real matches complete;
- publish real standings;
- change production-visible Bracket Health.

If simulated scores are generated based on fake clock time, they must remain inside simulation mode or a
simulation source.

## Pre-tournament safety

The system must prevent this failure case:

1. Admin applies fake results before the tournament for testing.
2. Fake results remain in the database.
3. The real tournament starts.
4. Users are awarded points from the fake results.
5. Leaderboards become wrong.

This must be impossible.

Required protections:

- simulated results clearly marked as simulated;
- normal scoring ignores simulated results;
- clear/reset simulation control;
- warning if simulated results exist;
- admin-visible simulation status;
- deployment/pre-launch check that fails or warns if simulated results are present in live/official mode;
- no simulated result can become official without an explicit, separate official result-entry action.

## Reset and cleanup controls

Admin Scenario Runner must include safe reset controls:

- Clear simulated results.
- Reset scenario state.
- Return to clean pre-results state.

Clearing simulated results must not affect:

- user predictions;
- official results;
- official scoring;
- league membership;
- accounts;
- real configuration.

## Environment guardrails

The Scenario Runner must fail closed outside approved environments.

At minimum:

- allowed in local development;
- allowed in Euro staging if explicitly enabled;
- blocked for WC26 production;
- blocked for any live/official production environment unless a future explicit admin-only simulation
  design is approved.

## Admin audit and visibility

Admin should be able to see:

- whether simulation mode is active;
- which scenario is active;
- who applied it;
- when it was applied;
- fake clock time used;
- checkpoint/match simulated up to;
- whether simulated results have been cleared.

This audit trail is admin-only.

## Acceptance criteria — simulation safety

The Scenario Runner is not acceptable unless:

- simulated results cannot be mistaken for official results;
- normal scoring ignores simulated results;
- fake clock does not create official results;
- simulated results cannot award real points unless the app is explicitly in simulation/test mode;
- simulated results can be cleared safely;
- user predictions are not changed by simulation;
- official results are not changed by simulation;
- real leaderboards are not polluted by fake scores;
- Bracket Health does not use fake scores in normal mode;
- Prediction Trends does not use fake scores in normal mode;
- pre-launch checks warn or fail if simulated results are present in live/official mode;
- WC26 production remains untouched and fail-closed.
