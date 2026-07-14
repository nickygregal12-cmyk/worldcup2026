> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage 13G-BRACKET-REF — Original Bracket Reference Adoption

Status: approved reference adoption and owner-sign-off record.  
Scope: docs/audit only. No UI rebuild, route implementation, scoring change, resolver change, Supabase write or migration.  
Reference artefact: `docs/reference-prototypes/euro28-bracket-page-prototype.html`.

## Purpose

This batch records the approved `euro28-bracket-page-prototype.html` as the reference for the Original Bracket destination in both layouts. The prototype behaviour, hierarchy and copy are the specification for the real rebuild, except for sample teams, pre-seeded picks, hardcoded sample R16 resolution, Google fonts and the prototype's single-file structure.

Any conflict with confirmed rules must be flagged and resolved through the register. No conflict may be silently resolved in implementation.

## Contract change — wall chart moved into Stage 13G

The charter v1.8 converging wall-chart decision is brought forward from backlog/share-card scope into Stage 13G Original Bracket scope. This is a contract change and must be visible in the ledger, register, design charter and agent roadmap.

The new contract is:

- Stage 13G Original Bracket includes the responsive stacked/wall-chart destination rebuild.
- The wall-chart-to-image share card remains a follow-on batch, not part of the first Bracket implementation.
- The first build records and implements the interactive bracket surface only.

## Ledger rows to record

| Ledger row | Status | Record |
| --- | ---: | --- |
| Stage 13G-BRACKET-REF — Original Bracket reference adopted | ACCEPTED / SPEC SOURCE | `euro28-bracket-page-prototype.html` is the approved reference for Original Bracket behaviour, hierarchy and copy in both layouts. |
| Charter v1.8 converging wall chart | CONTRACT CHANGE | Wall-chart layout moves from backlog into Stage 13G Original Bracket scope. |
| Original Bracket responsive split | ACCEPTED / SCHEDULED | `<900px` stacked vertical layout with per-round counters; `≥900px` converging wall chart. |
| Original Bracket slot anatomy | ACCEPTED / SCHEDULED | Source code visible on every slot; resolved flag/name slots are tappable; picked state gets success fill and tick; unresolved slots are dashed placeholder chips. |
| Original Bracket pick mechanics | ACCEPTED / TEST REQUIRED | Tap-to-advance, winner-only. Upstream changes clear only downstream picks no longer fed; surviving picks persist. |
| Original Bracket re-pick presentation | ACCEPTED / TEST REQUIRED | Stale stored pick gets amber/partial flag: `Re-pick — your tables changed this tie`. |
| Original Bracket champion treatment | ACCEPTED / SCHEDULED | Champion strip and centred wall-chart champion box. Empty prompt: `Pick through to the final`. |
| Original Bracket KO mention | ACCEPTED / COPY LOCKED | Only KO Predictor mention: `winner picks only — scores and jokers are handled in the KO Predictor`. |
| Original Bracket predicted-context banner | ACCEPTED / COPY LOCKED | `Your group predictions decide this bracket. Live results will not change your saved picks.`. |
| Original Bracket compliance by absence | ACCEPTED / AUDIT REQUIRED | No score inputs, no method controls and no joker controls anywhere on Original Bracket. |
| Connector lines | SIGNED OFF / WITHOUT LINES | First 13G Bracket build ships without connector lines; revisit only after visual/share review proves need. |
| Share-card rendering | SIGNED OFF / FOLLOW-ON | Share-card image rendering lands in its own batch after interactive bracket acceptance. |
| Tablet band | SIGNED OFF / SINGLE BREAKPOINT | Keep one `900px` breakpoint; no third `700–900px` layout unless real-device review proves need. |

## Decisions settled by the prototype and owner sign-off

### 1. Responsive split

Below `900px`, the bracket is a vertical stacked layout with per-round pick-progress counters such as `3/8 picked`.

At `≥900px`, the bracket becomes the converging wall chart: R16 ties on the outer wings, quarter-finals and semi-finals converging inward, and the final plus champion box centred.

The product contract is one state and one set of tie/slot primitives. There must be no layout-specific business logic. The only difference between layouts is arrangement.

### 2. Slot anatomy

Every slot displays its slot-reference origin as a small source code. Examples include `1B`, `2A` and `3DEF`.

Resolved slots show flag and team name and are tappable to advance. Picked slots use success fill and a tick. Unresolved slots are dashed placeholder chips, for example `3rd A/B/C`, and are non-interactive. Placeholder styling must follow the existing unresolved-slot standard.

### 3. Pick mechanics

Original Bracket is tap-to-advance and winner-only.

When an upstream pick changes, it clears only downstream picks that are no longer fed. Downstream picks that still match their feeding slots persist. This behaviour must be covered by tests before the implementation closes.

### 4. Re-pick presentation

This surface implements the approved Part 1.3 flag-for-re-pick behaviour.

A tie whose stored pick no longer matches either feeding slot gets amber/partial treatment and the exact flag:

`Re-pick — your tables changed this tie`

The pick is never silently kept and never silently dropped. Test coverage must prove group edit → bracket re-derivation → exactly affected ties get the flag.

### 5. Champion

Original Bracket has a champion strip at the top and a centred champion box in the wall-chart layout.

The empty prompt is:

`Pick through to the final`

The champion strip sub-line is:

`winner picks only — scores and jokers are handled in the KO Predictor`

This is the page's only KO Predictor mention.

### 6. Context

The Original Bracket predicted-context banner copy is locked as:

`Your group predictions decide this bracket. Live results will not change your saved picks.`

The live bracket may later use the same primitives under its own distinct banner. It must never reuse this predicted-context banner.

### 7. Register compliance by absence

Original Bracket must not contain:

- score inputs;
- method controls;
- joker controls.

This becomes a testable audit assertion so KO Predictor controls cannot creep into the Original Bracket.

## Decisions 8–10 signed off

### 8. Connector lines

Signed off: **without lines** for the first 13G Bracket implementation.

Rationale: the prototype carries bracket shape through columns, spacing and convergence. Connector lines would add visual noise and raise share-card rendering risk. They may be revisited only after real light/dark and share-card review proves the line-free wall chart lacks clarity.

### 9. Share-card rendering

Signed off: **follow-on batch**.

The first Bracket build implements the interactive Original Bracket surface. The share-card batch must create a dedicated fixed-size export surface using the same bracket data and primitives. It must not become a second bracket implementation. Copy-text fallback remains acceptable if image capture is unavailable.

### 10. Tablet band

Signed off: **single 900px breakpoint**.

`<900px` uses the stacked layout. `≥900px` uses the wall-chart layout. No intermediate `700–900px` layout should be added silently. If portrait tablet review later proves the stacked layout is too long, tune spacing first before adding a third arrangement.

## Delta list — current Bracket vs adopted reference

### Mobile delta

The real Bracket destination must gain the stacked reference treatment below `900px`: per-round counters, source-code slot labels, dashed unresolved slot chips, picked success/tick treatment and the amber re-pick flag.

### Desktop delta

The real Bracket destination must gain the `≥900px` converging wall chart. This is the contract change moved into Stage 13G. The desktop view must use the same bracket state and the same tie/slot primitives as mobile.

### Compliance delta

Original Bracket tests/audits must assert absence of scores, methods and jokers.

## Not part of the spec

The following prototype details are not implementation specification:

- sample teams and pre-seeded picks;
- hardcoded sample R16 resolution;
- the stale tie as data pattern;
- Google fonts;
- single-file structure;
- any prototype-only script structure.

The real surface derives from the canonical resolver and predicted tables.

## Checkpoint

- Latest closed implementation before this package: `13G-GROUPS-1` at commit `2a101fe`.
- Active migrations remain 18.
- Migration 019 is not created.
- No Supabase writes are introduced.
- WC26 bundle remains inactive.

## Next single task

After this docs/audit package is committed, the next single implementation task is:

`13G-BRACKET-1 — Original Bracket responsive stacked/wall-chart rebuild with shared tie/slot primitives`
