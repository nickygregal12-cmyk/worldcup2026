# Admin Scenario Runner / Simulated Results Brief

## Status

Future staging/admin testing stage. Not implemented by the recording commit.

Suggested stage name:

`STAGE-ADMIN-SCENARIO-RUNNER-1`

This is separate from the locked visual-contract recording stage and separate from official result entry.

## Purpose

The Admin fake clock can test time-based states, but it cannot fully test result-dependent states.
The app also needs a safe Admin-controlled way to apply simulated/fake results based on:

- selected fake date/time;
- selected tournament phase;
- selected checkpoint;
- exact match number.

This allows the team to test the full tournament lifecycle without manually entering every result through
the proper official result-entry section.

## Core idea

Admin should be able to choose exactly how far through the tournament to simulate, for example:

- first match live;
- after first match;
- end of a matchday;
- end of group matchday 1;
- end of the group stage;
- Round of 16 generated;
- Round of 16 complete;
- Quarter-finals complete;
- Semi-finals complete;
- Final complete;
- full tournament complete.

## Relationship with fake clock

The fake clock controls perceived tournament time.

The Scenario Runner controls which simulated results exist at that perceived time.

Ideal test flow:

1. Admin chooses fake date/time.
2. Admin chooses scenario/checkpoint.
3. Admin applies simulated results up to that fake time or match.
4. The app updates as if the tournament has progressed.
5. Admin reviews Home, Results, Match Centre, Bracket Health, Prediction Trends and Leaderboards.
6. Admin clears simulation when done.

## Required behaviours

When simulated results are active in an explicit simulation/test mode, the downstream product should be
testable as if those matches have completed, including:

- Home matchday states;
- Results page;
- Match Centre;
- group tables;
- best third-place ranking;
- knockout bracket progression;
- KO Predictor readiness;
- Original Bracket Health;
- Original Predictor scoring surfaces;
- KO Predictor scoring surfaces where relevant;
- Leaderboards;
- Prediction Trends;
- Player View;
- Points Breakdown.

## Deterministic scenarios

Simulated scores should be deterministic, not random every time.

A first pass only needs one deterministic default scenario. Later scenarios may include:

- favourites win;
- mixed results;
- upset-heavy;
- draw-heavy groups;
- high-scoring;
- low-scoring;
- penalty-heavy knockouts;
- full tournament complete.

## Relationship with candidate team pool

The Scenario Runner should work with the candidate team pool / draw-slot assignment model.

If real teams are assigned to slots, simulated results should use those teams.

If slots are unresolved, simulated results may use slot labels.

Do not hardcode fake team names directly into scenario results if slot assignment can provide realistic
teams.

## Boundary from official result entry

This is not normal official result entry.

It must be separate from the proper official result-entry/admin results section.

The Scenario Runner must not be a shortcut into official results.

If an admin wants to enter real tournament results, they must use the official result-entry process.
