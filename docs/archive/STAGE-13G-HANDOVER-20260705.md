> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.


# Stage 13G handover — destination builds closed and next scope alignment
Current deployed head: `8ee70ec`

Date: 2026-07-05  
Branch: `euro28-development`  
Latest deployed commit before this handover package: `64f2f3e Restyle Stage 13G admin control room`  
Development site: `https://euro28-predictor-dev.netlify.app`

## Closed since the previous handover

These stages are complete, committed, pushed and deployed:

| Commit | Stage | Closed status |
| --- | --- | --- |
| `3eac133` | Stage 13G destination reference adoption | Recorded Tournament, How to Play, Account, Admin and Match Centre references. |
| `94934dd` | Stage 13G-B-TOURNAMENT-1 | Split `#/tournament` and `#/how-to-play`; corrected confirmed tournament facts in config/docs. |
| `734ad9b` | Stage 13G-ACCOUNT-1 | Rebuilt signed-in Account; one-time keep/start-fresh guest transfer dialog; Original-only clear action; retired `src/pages/Profile.jsx`. |
| `06d5218` | Stage 13G-ADMIN-1 | Restyled protected Admin control room only; preserved Admin contracts, roles, RPCs and audits. |

Post-deploy `npm run verify:foundation-page` passed after `06d5218`. Active migrations remain 20. Migration 019 is applied.

## New files reviewed in this handover

The uploaded expanded brief repeats completed work for Parts A-C, but adds or clarifies the following still-open items:

1. **Match Centre group-match upgrade** — the approved decisions now distinguish group fixtures from knockout fixtures. Group fixtures must hide the KO Predictor tab, show group-table live/final projection context, add a read-only bracket-point preview, and replace knockout-style “points on the line” framing with “This match’s predictions”.
2. **Player View, Head-to-head and Points Breakdown** — the existing Player View reference is still only a reference. Two new page prototypes now define the dedicated Head-to-head and Points Breakdown destinations. The implementation should reuse `PlayerHeadToHead`/`loadLeagueHeadToHead` and `PointsBreakdown`/`normalisePointsBreakdown`, not rebuild engines.
3. **UI-copy hygiene / spec-echo governance** — one uploaded script, `check-user-facing-spec-echo.mjs`, catches user-facing UI copy pasted verbatim from `docs/*.md`. The expanded brief also names `check-user-facing-copy-hygiene.mjs` and `user-facing-copy-hygiene-policy.mjs`, but those two files were not present in this upload. Treat the spec-echo script as a reference until the missing companion files are supplied or recreated.
4. **Legacy `src/pages/` retirement** — `src/pages/Profile.jsx` is already retired. The expanded brief also names `src/pages/AdminPanel.jsx`, `src/pages/HeadToHead.jsx`, `src/pages/PointsSummary.jsx`, and eventually the whole legacy `src/pages/` directory as dead-code retirement candidates. Do not delete the whole directory without a dedicated audited cleanup or Player View implementation stage that confirms zero live imports.

## Reference artefacts now recorded

The following new files are recorded under `docs/reference-prototypes/`:

- `euro28-stage13g-expanded-agent-prompt.md`
- `euro28-guest-transfer-modal-prototype.html`
- `euro28-head-to-head-page-prototype.html`
- `euro28-points-breakdown-page-prototype.html`
- `check-user-facing-spec-echo.mjs`

The existing `docs/reference-prototypes/euro28-tournament-split-agent-prompt.md` is refreshed with the expanded prompt so the next agent has the latest all-part brief in the repo.

## Recommended next order

1. **Stage 13G-MATCH-CENTRE-REF** — docs/audit-only adoption of the eight signed-off Match Centre decisions. This is low-risk and should happen before the model/UI build.
2. **Stage 13G-MATCH-CENTRE-1** — implementation of the group-match panels and conditional tabs using existing resolver/scoring contracts. No migration expected.
3. **Stage 13G-PLAYER-DESTINATIONS-REF** — docs/audit-only adoption of the two new Head-to-head and Points Breakdown prototypes plus the already-adopted Player View reference.
4. **Stage 13G-PLAYER-1** — dedicated Player View and sub-destinations, league-row rewire, and audited legacy `src/pages/` retirement if zero live imports are proved.
5. **Stage 13G-UI-HYGIENE-1** — wire copy-hygiene and spec-echo audits once all three audit files are present. If only `check-user-facing-spec-echo.mjs` is available, record the gap rather than wiring a broken script.

## Non-negotiable boundaries for the next chat

- Stay on `euro28-development`; never work on `main`.
- Active migrations remain 20 unless a genuine schema/read-contract gap is proved and explicitly approved.
- WC26 production must remain fail-closed.
- Original Predictor and KO Predictor stay separate.
- Predicted and live brackets never blend.
- Match Centre projections are read-only screen projections only; they must never write to bracket predictions, persisted standings or scores.
- Player View and sub-destinations must reuse existing engines and normalisers.
- User-facing copy should be written for players, not pasted from stage docs or audit marker prose.
