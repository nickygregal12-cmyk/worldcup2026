# v6 additions — Admin Scenario Runner and simulation safety

This v6 pack keeps the v5 locked visual-contract and missing-surface records intact, and adds two
new source briefs as future staging/admin testing scope:

- `Euro 2028 Predictor — Admin Scenario Runner.pdf`
- `Simulation Safety Guidelines.pdf`

These additions do **not** approve immediate implementation. They record the intended future stage and
the non-negotiable safety model for simulated/fake scores.

## New future stage

Suggested stage:

`STAGE-ADMIN-SCENARIO-RUNNER-1`

Purpose:

- pair the Admin fake clock with safe simulated result controls;
- allow Admin to simulate the tournament to a fake-clock time, checkpoint, or exact match;
- test Home, Results, Match Centre, group tables, best third-place ranking, KO readiness,
  Bracket Health, Prediction Trends, scoring surfaces, Leaderboards, Player View and Points
  Breakdown without manually entering every official result.

## Hard safety rule

Fake clock + fake scores may simulate the tournament for testing, but they must never become the
official result source of truth.

Simulated results must never:

- become official results by accident;
- award real points in normal mode;
- pollute real leaderboards;
- alter official Bracket Health;
- alter official Prediction Trends;
- survive into live/official tournament operation in a way that normal scoring can read;
- touch WC26 production.

## Preferred safety model

A future implementation must choose one of these safe models after inspecting the current repo:

1. Preview-only simulation.
2. Separate simulation namespace/source.
3. Local/staging-only seeded scenario with strict source separation.

If the app cannot guarantee that normal product scoring ignores simulated results, the Scenario Runner
must remain preview-only.

## Required source separation

Official results and simulated results must never share an ambiguous state.

Possible safe result metadata/concepts include:

- `source = simulation`
- `is_simulated = true`
- `scenario_id`
- `simulation_run_id`

The exact implementation must follow the current repo structure. No Migration 019 is approved unless a
genuine schema/read-contract gap is proved and Nicky explicitly approves it.

## Admin controls to record

The future Scenario Runner should support:

- apply simulated results up to fake-clock time;
- simulate to checkpoint;
- simulate up to match number;
- at least one live-match state;
- deterministic default scenario;
- clear simulated results;
- reset scenario state;
- return to clean pre-results state;
- admin-visible simulation status/audit.

## Acceptance carry-forward

The stage is not acceptable unless:

- fake clock does not create official results;
- normal scoring ignores simulated results;
- simulated results cannot award real points unless the whole app is explicitly in simulation/test mode;
- simulated results can be cleared safely;
- user predictions are not changed by simulation;
- official results are not changed by simulation;
- real leaderboards are not polluted;
- Bracket Health and Prediction Trends do not read fake scores in normal mode;
- pre-launch/live-mode checks warn or fail if simulated results are present;
- WC26 production remains fail-closed.
