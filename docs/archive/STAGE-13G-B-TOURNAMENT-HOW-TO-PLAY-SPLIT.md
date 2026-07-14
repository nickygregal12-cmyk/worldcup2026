> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage 13G-B-TOURNAMENT-1 — Tournament / How to Play split

Status: implementation package.
Scope: Part A only from the Stage 13G destination reference adoption package.

## Purpose

This slice corrects the stale tournament facts and splits the old combined Tournament/rules destination into two focused More/footer destinations:

- `#/tournament` — football tournament facts: hosts, venues, dates, format and provisional groups;
- `#/how-to-play` — predictor mechanics: Original Predictor, KO Predictor, scoring, locks, jokers and mechanics FAQ.

Account, Admin and Match Centre reference prototypes remain recorded for later focused batches. They are not implemented in this slice.

## Source-of-truth correction

`src/config/tournament.js` now records the UEFA-confirmed 12 November 2025 facts:

- tournament dates are 9 June 2028 to 9 July 2028;
- host nations are England, Scotland, Wales and Republic of Ireland;
- Northern Ireland is not a final-schedule host nation after Casement Park was removed from the confirmed venue list;
- the opening match is at the National Stadium of Wales in Cardiff;
- the semi-finals and final are at Wembley Stadium in London;
- nine confirmed venues are recorded across eight cities;
- the format remains 24 teams, six groups of four, top two plus four best third-placed teams to the Round of 16, straight knockout and no third-place play-off.

Group participants and match-specific kick-off times remain explicitly unconfirmed. The UI uses plain `Qualifying under way` copy and does not use defensive FAQ framing around missing real teams.

## Implementation boundaries

This package does not:

- add a migration;
- create Migration 019;
- write to Supabase;
- change scoring logic;
- change resolver logic;
- rebuild Account, Admin or Match Centre;
- add connector lines, share cards or Tournament Picks player entry.

## Acceptance

Required gates:

```bash
npm run audit:stage13g-tournament-how-to-play-split
npm run check
npm run build
npm run verify:foundation-page
```

The audit enforces the route split, config facts, docs alignment, `npm run check` wiring, no Migration 019 and continued separation of Original Predictor and KO Predictor rules.
