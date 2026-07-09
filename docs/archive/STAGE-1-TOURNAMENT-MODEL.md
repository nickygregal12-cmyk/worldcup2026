> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 1 — Tournament Model

## Batch 1: Provisional group slots

Completed: 30 June 2026

### Migration

Applied migration:

`supabase/migrations/202606300002_euro28_provisional_group_slots.sql`

Remote migration history confirms:

- Local: `202606300002`
- Remote: `202606300002`

### Provisional tournament structure

The Euro staging database contains 24 neutral tournament slots:

- Group A: A1, A2, A3, A4
- Group B: B1, B2, B3, B4
- Group C: C1, C2, C3, C4
- Group D: D1, D2, D3, D4
- Group E: E1, E2, E3, E4
- Group F: F1, F2, F3, F4

No real teams have been assigned.

### Hosted verification

Verified in Euro staging:

- Tournament slots: 24
- Unresolved slots: 24
- Provisional slot flags: 24
- Group memberships: 24
- Provisional membership flags: 24
- Position code mismatches: 0
- Groups with the wrong slot count: 0

Each of the six groups contains exactly four positions.

## Confirmed UEFA 2028 facts

UEFA confirmed the final tournament schedule and venue list on 12 November 2025. The canonical project model now treats these as confirmed facts:

- Tournament dates: 9 June 2028 to 9 July 2028.
- Host nations: England, Scotland, Wales and Republic of Ireland.
- Northern Ireland is not a final-schedule host nation after Casement Park was removed from the confirmed venue list.
- Opening match: National Stadium of Wales, Cardiff, Friday 9 June 2028.
- Semi-finals: Wembley Stadium, London, Tuesday 4 July and Wednesday 5 July 2028.
- Final: Wembley Stadium, London, Sunday 9 July 2028.
- Confirmed venues: Wembley Stadium and Tottenham Hotspur Stadium in London, National Stadium of Wales in Cardiff, Manchester City Stadium in Manchester, Everton Stadium in Liverpool, St James' Park in Newcastle, Villa Park in Birmingham, Hampden Park in Glasgow and Dublin Arena in Dublin.

The format remains 24 teams, six groups of four, the top two in each group plus the four best third-placed teams advancing to the Round of 16, then a straight knockout with no third-place play-off.

Group participants and match-specific kick-off times remain unconfirmed. The model must not invent them.

## Batch 2: Official venues and group-stage schedule

Completed: 30 June 2026

### Migration

Applied migration:

`supabase/migrations/202606300003_euro28_official_group_schedule.sql`

Remote migration history confirms:

- Local: `202606300003`
- Remote: `202606300003`

### Official schedule data

The Euro staging database contains:

- 9 confirmed tournament venues across eight cities and four host nations;
- 36 official group-stage matches;
- official group-stage dates from 9 June 2028 to 21 June 2028;
- official match numbers 1 to 36;
- 72 home and away match slots.

Each group contains six matches. Each provisional group position appears in three matches.

### Certainty model

Schedule certainty and participant certainty are separate.

Every group-stage match currently uses:

- `schedule_status = official_date_venue`;
- `participants_status = provisional`;
- `kickoff_at = null`.

UEFA has confirmed each group match's date and venue. Match-specific kick-off times will not be confirmed until after the final tournament draw. No kick-off times have been invented.

The A1 to F4 match sources currently resolve to provisional tournament slots only. They are not real qualified teams.

### Hosted verification

Verified in Euro staging:

- Tournament venues: 9
- Group-stage matches: 36
- Match slots: 72
- Matches missing an official date or venue: 0
- Matches with an invented kick-off time: 0
- Matches with confirmed participant status: 0
- Groups with the wrong match count: 0
- Provisional positions with the wrong appearance count: 0

## Batch 3: Official knockout match skeleton

Completed: 30 June 2026

### Migration

Applied migration:

`supabase/migrations/202606300004_euro28_official_knockout_skeleton.sql`

Remote migration history confirms:

- Local: `202606300004`
- Remote: `202606300004`

### Official knockout schedule

The Euro staging database contains the complete official knockout skeleton:

- Round of 16: matches 37 to 44;
- Quarter-finals: matches 45 to 48;
- Semi-finals: matches 49 and 50;
- Final: match 51.

All 15 knockout matches have their official date and venue. Match-specific kick-off times remain unset because UEFA will confirm them after the final tournament draw.

### Participant-source model

Knockout source rules remain separate from resolved teams.

The Round of 16 contains:

- 12 fixed group-position sources;
- 4 best-third-place sources;
- all 15 official best-third-place assignment combinations from Article 21 of the UEFA European Football Championship 2026–28 regulations.

From the quarter-finals onwards, the 14 participant slots point to the winner of an earlier official knockout match.

No knockout slot contains a real team. Every `resolved_tournament_team_id` and `resolved_at` value remains null.

### Hosted verification

Verified in Euro staging:

- Total tournament matches: 51
- Total match slots: 102
- Knockout matches: 15
- Knockout match slots: 30
- Round of 16 matches: 8
- Quarter-finals: 4
- Semi-finals: 2
- Final: 1
- Round of 16 group-position sources: 12
- Round of 16 best-third sources: 4
- Prior-match-winner sources: 14
- Best-third matrices with all 15 combinations: 4
- Knockout matches with an invented kick-off time: 0
- Resolved knockout teams: 0

## Current position

Stage 1 Batches 1, 2 and 3 are complete. The staging tournament model now contains all 51 official Euro 2028 match numbers, dates, venues and participant-source rules currently available from UEFA. The source-of-truth config now also records the confirmed final tournament date window, host nations, opening-match venue and Wembley final-week facts.

Real teams and match-specific kick-off times remain unresolved. Scoring, predictions, authentication, leagues and UI redesign have not started.
