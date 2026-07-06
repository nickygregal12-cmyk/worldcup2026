# Candidate Team Pool and Draw Slot Assignment Brief

## Status

This is a proposed future staging/admin data stage. It is not a visual-contract implementation and it is not approval for a database migration.

Suggested stage name:

`STAGE-CANDIDATE-TEAM-POOL-1`

## Purpose

Use a realistic candidate team pool for staging, admin setup and future draw assignment, while keeping the official Euro 2028 tournament structure slot-based until the real draw is known.

This avoids weak testing with random/fake teams, improves visual testing with real names and flags, and prepares the app for the later official draw without hardcoding team identities into fixtures.

## Core rule

Tournament slots and real team identities must stay separate.

The official competition structure remains:

- A1, A2, A3, A4
- B1, B2, B3, B4
- C1, C2, C3, C4
- D1, D2, D3, D4
- E1, E2, E3, E4
- F1, F2, F3, F4

The candidate team pool is a separate admin/testing list. A candidate team can later be assigned to a draw slot when it is safe and official to do so.

## Concept model

| Concept | Meaning |
|---|---|
| Tournament | Euro 2028 |
| Draw slot | Official group position such as A1, A2, B3 or F4 |
| Candidate team | A realistic UEFA team that may qualify or be useful for testing |
| Slot assignment | Admin assignment of a candidate/qualified team to an official draw slot |
| Fixture | Still uses the slot structure, but displays the assigned team where available |

Example after the draw:

| Slot | Assigned team |
|---|---|
| A1 | Scotland |
| A2 | Germany |
| A3 | Hungary |
| A4 | Switzerland |

## Public-facing rule

Candidate teams must not be presented publicly as confirmed Euro 2028 teams before they are officially qualified and drawn.

Before official assignment, public UI should continue to use calm placeholder language such as:

- Team TBC
- Qualifying slot
- Participants TBC
- Draw position TBC

The candidate pool is for staging/admin/testing unless explicitly approved for public display.

## Suggested statuses

| Status | Meaning |
|---|---|
| candidate | Team is in the pool for testing/admin selection |
| qualified | Team is confirmed qualified but not assigned to a draw slot |
| assigned | Team is assigned to an official Euro 2028 slot |
| eliminated | Team is no longer eligible / did not qualify |
| archived | Retained for history or future tournaments |

Not all statuses need to be implemented immediately if the current schema already supports a simpler safe model.

## Suggested initial candidate team pool

- Albania
- Austria
- Belgium
- Bosnia and Herzegovina
- Croatia
- Czech Republic
- Denmark
- England
- Finland
- France
- Georgia
- Germany
- Greece
- Hungary
- Iceland
- Israel
- Italy
- Kosovo
- Netherlands
- Norway
- Poland
- Portugal
- Republic of Ireland
- Romania
- Scotland
- Serbia
- Slovakia
- Slovenia
- Spain
- Sweden
- Switzerland
- Turkey
- Ukraine
- Wales
- Northern Ireland

Normalise `N.Ireland` to `Northern Ireland`. A short display label such as `N. Ireland` may be used in tight UI if needed.

This list is realistic testing/admin data only. It must not be described publicly as a confirmed qualifier list.

## Admin assignment workflow

A later Admin section may be called:

`Tournament Team Assignments`

Example table:

| Slot | Current team | Action |
|---|---|---|
| A1 | TBC | Assign team |
| A2 | TBC | Assign team |
| A3 | TBC | Assign team |
| A4 | TBC | Assign team |

Admin should eventually be able to:

- assign a team to a slot;
- clear a slot;
- change an assignment before lock/draw finalisation;
- see duplicate assignment warnings;
- mark the assignment set as official/final when appropriate;
- avoid accidental public claims before assignment is official.

## Display flow after assignment

Once a team is deliberately assigned to a slot, the display identity should flow through:

- Groups;
- fixtures;
- Home;
- Results;
- Match Centre;
- Original Bracket;
- KO Predictor where relevant;
- Team Profile;
- Review Picks;
- Prediction Trends;
- Leagues;
- Leaderboards where team labels appear;
- share/export surfaces where applicable.

## Safety rules

1. Slot identity must remain stable. Predictions remain tied to fixture/slot structure.
2. Assignment must not rewrite user predictions. Changing an assignment must not delete, rewrite or corrupt scores, jokers, bracket picks or Review state.
3. Prevent duplicate active assignments. The same team must not be assigned to two active Euro 2028 slots at the same time.
4. Public UI must not imply confirmation too early.
5. Post-lock changes must be controlled and admin-only.
6. No migration unless truly needed. Do not create Migration 019 unless a genuine schema/read-contract gap is proved and explicitly approved.
7. No scoring or resolver change unless separately approved.
8. WC26 production remains untouched and fail-closed.

## First-pass scope

The first pass should be small and safe:

1. Inspect current schema/source to confirm how teams, participants and slots are represented.
2. Confirm whether a candidate team pool can be added without Migration 019.
3. Add or document the candidate team pool in the safest existing place.
4. Keep official draw slots unchanged.
5. Add/admin-document a future assignment workflow.
6. Ensure no user predictions are rewritten by assignment.
7. Ensure public UI still treats unassigned participants as TBC/provisional.
8. Run existing gates.

## Acceptance criteria

A future candidate-team-pool stage is acceptable only if:

- official draw slots remain stable;
- candidate teams are separate from official slot assignments;
- public UI does not claim candidate teams are confirmed;
- assigned teams flow through the app only where assignment is deliberate;
- duplicate active slot assignment is prevented or the risk is explicitly documented;
- no predictions are overwritten;
- no Original/KO scoring logic changes;
- no resolver logic changes unless separately approved;
- no Supabase schema migration unless explicitly approved;
- WC26 production remains untouched.

## Source

Derived from `sources/Euro 2028 Predictor Brief.pdf`, uploaded after v4 to add the Candidate Team Pool and Draw Slot Assignment brief.
