# Stage 13G-PLAYER-REF — Player View / Viewing Player Predictions Reference Prototype Adoption

## Status

SCHEDULED / REFERENCE ADOPTED — docs/audit-only.

This document records the approved `euro28-player-view-prototype.html` reference for the dedicated Player View / Viewing Player Predictions destination. It does not implement UI, routes, resolver logic, scoring logic, Supabase writes or database migrations.

The reference belongs in Stage 13G before implementation of the League dedicated player destination and before the next Groups build slice, because it settles what viewing another member's predictions must look like.

## Reference artefact

- `docs/reference-prototypes/euro28-player-view-prototype.html`

The prototype is a reference artefact, not code to port. Rebuild natively in the Euro design system using existing tokens, CSS Modules, shared primitives, PlayerIdentity, TeamLabel, Score/Result chips, Tabs/Dialog/Sheet patterns and the approved circle-flag asset pipeline.

## Ledger rows

| Ledger row | Status | Record |
|---|---:|---|
| 13G Player View reference prototype adoption | SCHEDULED | Approved player-view prototype adopted as the reference for viewing another member's predictions. Rebuild natively; do not port prototype code. |
| Player View privacy state | SCHEDULED | Before global Original Predictor lock, predictions are hidden and the page shows only the informative privacy placeholder. |
| Player View header | SCHEDULED | Header card is always visible because it contains no private prediction detail: avatar, display name, league/rank context, Original points, KO state and recent-form summary. |
| Player View post-lock tabs | SCHEDULED | Post-lock view uses three top-level tabs: Predictions, Bracket and Tables. |
| Player predictions rows | SCHEDULED | Prediction rows show fixture, predicted score, result/status, points chip and joker chip where applied. |
| Player bracket summary | SCHEDULED | Bracket tab shows champion, semi-finalists and quarter-finalists, with knocked-out teams struck through for bracket-health clarity. |
| Player predicted tables | SCHEDULED | Tables tab shows the player's predicted group tables, using the same qualification-edge and third-place logic as the Groups destination. |
| Player View links | SCHEDULED | Header actions route to real Head-to-head and Points breakdown destinations. Prototype stub buttons are not imported. |
| Player View prototype exclusions | SCHEDULED | Do not import sample data, lock switch, toast stubs, Google fonts or single-file structure. |

## Decisions the prototype settles

### 1. Player View destination

Viewing another member's predictions is a dedicated destination/surface, not an inline expansion under the league table. A league row tap opens this view. This reinforces the accepted League reference decision that inline H2H below the league table is retired.

### 2. Privacy / pre-lock state

Before the global Original Predictor lock, the view shows only the informative privacy placeholder for prediction content. The player’s group scores, jokers, bracket and predicted tables are under wraps until predictions lock at first kick-off. The user is also reminded that their own predictions are private too.

No private prediction rows, bracket picks or predicted tables are exposed before the global Original Predictor lock.

### 3. Always-visible header

The header card remains visible before and after lock because it contains no private prediction detail. It shows avatar/player identity, league/rank context, Original points, KO Predictor state and recent-form summary.

The KO Predictor state remains separate from Original Predictor points and may say “Starts at the knockouts” before KO readiness.

### 4. Post-lock information architecture

After lock, the view has three top-level tabs:

- Predictions
- Bracket
- Tables

### 5. Predictions tab

The Predictions tab supports By date / By group switching. Rows show fixture, predicted score, result or upcoming status, points chip and joker chip where applied. Joker display uses the same approved star/joker visual language as Groups and KO.

### 6. Bracket tab

The Bracket tab summarises the player’s Original Bracket with champion, semi-finalists and quarter-finalists. Teams knocked out of the real tournament are struck through for bracket-health clarity.

The full chart opens from the real app if needed. This Player View does not duplicate the full wall chart by default.

### 7. Tables tab

The Tables tab shows the player’s predicted group tables. It uses the same qualification-edge treatment and third-place-table logic as the Groups destination. Predicted tables remain derived from that player’s predictions.

### 8. Head-to-head and Points breakdown

Header actions route to the real Head-to-head and Points breakdown destinations. Prototype stubs are not imported.

### 9. Competition boundary

Original Predictor and KO Predictor stay separate. Before KO readiness, the KO state may say “Starts at the knockouts.” KO points are not blended into Original totals.

## Not part of the spec

Do not import sample players, sample fixtures, the prototype lock switch, toast stubs, Google-hosted fonts, CDN flags if the app already has a local/approved flag pipeline, or the prototype's single-file structure.

## Delta list — current player surfaces vs reference

| Area | Current / recorded state | Required delta |
|---|---|---|
| League row action | League reference already retires inline H2H below the table. | Record this prototype as the approved destination opened by a player row. |
| Privacy | Server-authorised release rules already exist. | Surface pre-lock privacy with an informative placeholder and no private prediction content. |
| Header | PlayerIdentity and rank/points context already exist in model surfaces. | Make the header always visible and privacy-safe. |
| Tabs | Player comparison surfaces exist separately. | Establish Predictions / Bracket / Tables as this destination's post-lock IA. |
| Predictions | Shared prediction release rules exist. | Add compact prediction rows with predicted score, result/status, points chip and joker chip. |
| Bracket | Original bracket health exists. | Add compact champion / semi-finalists / quarter-finalists summary with struck-through eliminated teams. |
| Tables | Groups predicted table logic exists. | Reuse Groups qualification-edge and third-place-table logic for another player's predictions. |
| H2H / breakdown | Existing destinations exist. | Header buttons route to real destinations; no stubs. |
| Prototype artefacts | Prototype includes sample data, lock switch, toast and Google fonts. | Exclude these from product implementation. |

## Contract changes flagged

| Contract | Change |
|---|---|
| League player-row destination | Confirmed as dedicated Player View, not inline expansion. |
| Player prediction privacy | Pre-lock content is hidden behind an informative placeholder. |
| Player View tabs | Predictions / Bracket / Tables becomes the approved IA. |
| Player bracket display | Compact summary in Player View; full chart remains separate. |
| Player predicted tables | Must reuse Groups table and third-place logic. |
| Original / KO split | Header may show KO state, but points and content remain separate. |

## Placement

Place this after `13G-REF-2 — Groups and Original Bracket Reference Prototype Adoption` and before `13G-GROUPS-1 — joker pill, shared joker meter and disabled-at-cap tests`.

Recommended sequence:

1. `13G-REF` — Home and League references recorded.
2. `13G-REF-2` — Groups and Original Bracket references recorded.
3. `13G-PLAYER-REF` — Player View / Viewing Player Predictions reference recorded.
4. `13G-GROUPS-1` — joker pill, shared joker meter and disabled-at-cap tests.

## Prompt for future build handoff

```text
13G PLAYER VIEW BATCH — REFERENCE PROTOTYPE ADOPTED
(established format: ledger rows first; rebuild natively in the real design system; the prototype's behaviour, hierarchy and copy are the spec; conflicts with confirmed rules flagged, never silently resolved)

ATTACHED: euro28-player-view-prototype.html — approved reference for the dedicated Player View / Viewing Player Predictions destination. This is the destination opened from league rows and other player-entry points. It implements the previously accepted S5 shape: a dedicated player view with rank context, Original and KO kept separate, and real destinations for Predictions, Bracket, Tables, Head-to-head and Points breakdown. It supersedes any inline H2H-below-the-league presentation.

As with the other approved references, this is a REFERENCE ARTEFACT, not code to port. Rebuild it natively in the Euro design system using existing tokens, CSS Modules, shared primitives, PlayerIdentity, TeamLabel, Score/Result chips, Tabs/Dialog/Sheet patterns and the existing circle-flag asset pipeline. Do not import sample data, Google-hosted fonts, prototype switches, stub toasts or single-file structure.

DECISIONS THE PROTOTYPE SETTLES — RECORD IN THE REGISTER

1. PLAYER VIEW DESTINATION
Viewing another member's predictions is a dedicated destination/surface, not an inline expansion under the league table. League row tap opens this view.

2. PRIVACY / PRE-LOCK STATE
Before the global Original Predictor lock, the view shows only the informative privacy placeholder for prediction content. The approved copy direction is: the player's group scores, jokers, bracket and predicted tables are under wraps until predictions lock at first kick-off. The user is reminded that theirs are private too. No private prediction rows, bracket picks or predicted tables are exposed pre-lock.

3. ALWAYS-VISIBLE HEADER
The header card remains visible before and after lock because it contains no private prediction detail. It shows avatar/player identity, league/rank context, Original points, KO Predictor state and recent-form summary.

4. POST-LOCK INFORMATION ARCHITECTURE
After lock, the view has three top-level tabs: Predictions, Bracket and Tables.

5. PREDICTIONS TAB
The Predictions tab supports By date / By group switching. Rows show fixture, predicted score, result or upcoming status, points chip and joker chip where applied. Joker display uses the same approved star/joker visual language as Groups and KO.

6. BRACKET TAB
The Bracket tab summarises the player's Original Bracket with champion, semi-finalists and quarter-finalists. Teams knocked out of the real tournament are struck through for bracket-health clarity. The full chart opens from the real app; this view does not duplicate the full wall chart by default.

7. TABLES TAB
The Tables tab shows the player's predicted group tables. It uses the same qualification-edge treatment and third-place-table logic as the Groups destination. Predicted tables remain derived from that player's predictions.

8. HEAD-TO-HEAD AND POINTS BREAKDOWN
Header actions route to the real Head-to-head and Points breakdown destinations. Prototype stubs are not imported.

9. COMPETITION BOUNDARY
Original Predictor and KO Predictor stay separate. Before KO readiness, the KO state may say “Starts at the knockouts.” KO points are not blended into Original totals.

10. NOT PART OF THE SPEC
Do not import sample players, sample fixtures, prototype lock switch, toast stubs, Google-hosted fonts, CDN flags if the app already has a local/approved flag pipeline, or the prototype's single-file structure.

REQUIRED OUTPUT

1. Ledger rows for Player View reference adoption.
2. Delta list: current player comparison/member prediction surfaces vs this reference.
3. Register entries for decisions 1–9 as they will be written.
4. 13G placement with contract changes flagged.
5. Checkpoint, migration count and next single task.
```

## Acceptance gates

- `npm run audit:stage13g-player-view-reference-adoption`
- `npm run check`
- `npm run build`
- `npm run verify:foundation-page` after deploy

## Scope guard

This package records reference adoption only. It must not implement UI, routes, resolver logic, scoring logic, Supabase writes or database migrations.

Active migrations remain 18. Migration 019 is not created.
