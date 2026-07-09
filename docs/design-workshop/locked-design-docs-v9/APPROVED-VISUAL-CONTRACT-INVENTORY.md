> **SUPERSEDED SNAPSHOT — do not work from this copy.** This file is part of the locked v9 install pack and is frozen at its 2026-07-06 pack state. The canonical, maintained version is `docs/APPROVED-VISUAL-CONTRACT-INVENTORY.md`, which has moved on since this pack was installed. If a filename search brought you here, use the canonical copy.

# Approved visual-contract inventory — locked set v2

This inventory records the approved/confirmed visual contracts after the design workshop.

The visual-contract rule remains:

> Every page must look like the same approved Euro 2028 Predictor design system. The content changes by page, but the visual language, chrome, tone, hierarchy and interaction style must stay consistent.

## Already recorded at `96a9624`

| Surface | Contract | Status |
|---|---|---|
| Groups | Approved Groups Night Broadcast contract | Recorded in repo |
| Leagues | League table D / Leagues refinement | Recorded in repo |
| Original Bracket | Bracket G | Recorded in repo |
| KO Predictor | KO Predictor F | Recorded in repo |

## Locked after `96a9624` — to record

| Surface | Approved contract | Notes |
|---|---|---|
| Home | Home B | Visual contract confirmed. Final sweep must remove KO Predictor presence before readiness and align matchday content. |
| Match Centre | Match Centre A | Visual contract confirmed. Must support contextual return to source. |
| Player View | Player View A | Visual contract confirmed. Rows opened from leagues/leaderboards must have return context. |
| Points Breakdown | Points Breakdown A | Visual contract confirmed. Return to Player View when opened from Player View. |
| Account | Account B | Removes retired Account-page guest import buttons. Only one-time keep/start-fresh choice after guest sign-in remains. |
| Tournament Overview | Tournament Overview A | Visual contract confirmed. Content needs final improvement later. |
| How to Play / Rules Hub | Candidate A | Confirmed. Keep user-friendly, no audit/spec wording. |
| Admin Control Room | Candidate A | Confirmed. Admin-only tone allowed; still same visual system. |
| Results | Uploaded approved Results prototype | Three tabs: Groups, Tables, Knockouts. Every result opens Match Centre. Results and Leaderboards stay separate. |
| Leaderboards | Uploaded approved Leaderboards prototype | Separate destination from Results. Original/KO toggle; standings never combined; every row opens Player View. |
| Offline Player Claim | Uploaded approved claim prototype | Code-based claim via league admin; history intact; one-way; preview strip approved. |
| Bracket Health | Uploaded approved Bracket Health prototype | Health tab inside Bracket, not standalone nav. Shows predicted route vs live/real route and points still available. |
| Team Profile Sheet | Uploaded approved Team Profile Sheet prototype | Objective team info only. “How players see them” locked until prediction lock. No squad/player/odds content. |
| Shared States | Uploaded approved Shared States prototype | More menu, shimmer loading, calm error, unknown route, invite/join, privacy placeholders. |

## Contract boundaries

The approved references are not product code to port blindly. They are binding visual and interaction references.

Implementation must preserve:

- Original Predictor priority over KO Predictor;
- Original and KO points never combined;
- predicted and live brackets never blended;
- match/result click-throughs to Match Centre where approved;
- player-row click-throughs to Player View;
- contextual return to the entry source;
- no wrong-state flicker on dynamic pages.

## File suffix convention

Canonical filename suffix going forward:

`*-prototype.html`

Approval status is recorded in the file header comments and in docs. Do not rename existing approved files only to change `prototype` to `contract` unless a later naming-cleanup stage is explicitly scoped.
