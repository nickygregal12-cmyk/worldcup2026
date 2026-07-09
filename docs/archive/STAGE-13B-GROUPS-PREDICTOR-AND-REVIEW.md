> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13B — Groups predictor and review flow

## Scope

Stage 13B rebuilds the Original Predictor group-stage experience without changing database, scoring, lock, grace or saving rules.

It introduces:

- one shared `<TeamLabel>` primitive;
- locally bundled circular flags selected by central ISO/association code;
- visibly neutral unresolved slots;
- one shared numeric `<ScoreInput>` with mobile keypad support and desktop steppers;
- all 36 group fixtures in consistent cards;
- explicit saved, saving, submitted, locked, grace, conflict and error presentation;
- a five-joker meter and match-level joker control;
- a group jump strip and progress by group;
- a dedicated review screen that explains reversible submission;
- six light/dark responsive baselines.

## Safety boundaries

- The score input and joker button are the only prediction controls inside a match card.
- A future Team Profile Sheet may open only from the TeamLabel identity itself.
- The surrounding match card never opens a profile.
- Group scores still save through the existing atomic bundle contract.
- Saved predictions count whether review mode is active or not.
- The first tournament kick-off still locks prediction content globally.
- A joker remains movable only while its selected match has not started.
- Original Predictor points remain separate from the KO Predictor.

## Team data

`<TeamLabel>` reads the central team metadata code. Replacing provisional teams with confirmed teams later must remain a data update. No component contains a tournament team name or bracket position.

## Database

No Migration 015 is added. Active migrations remain 14.
