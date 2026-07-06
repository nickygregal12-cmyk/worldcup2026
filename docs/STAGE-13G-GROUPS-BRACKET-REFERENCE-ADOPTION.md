# Stage 13G-REF-2 — Groups and Original Bracket Reference Prototype Adoption

Status: **SCHEDULED — docs/audit only**  
Package date: 2026-07-04
Amended package: includes Groups decisions 9 and 10 before local application  
Branch target: `euro28-development`

This package records the approved **Groups** and **Original Bracket** reference prototypes before any build work. It follows the established format: ledger rows first; rebuild natively in the real Euro design system; the prototype's behaviour, hierarchy and copy are the spec; conflicts with confirmed rules are flagged, never silently resolved.

Reference artefacts:

- `docs/reference-prototypes/euro28-groups-page-prototype.html`
- `docs/reference-prototypes/euro28-bracket-page-prototype.html`

These are **reference artefacts, not code to port**. Do not import their sample data, prototype switches, Google-hosted fonts, CDN flags, single-file structure or hardcoded demo picks/results.

Scope locks:

- no UI build
- no route implementation
- no scoring change
- no resolver change
- no Supabase write
- no fixture-data implementation
- no score-stepper UI implementation
- no Migration 019
- active migrations remain 18

## Stage 13F-K3 preservation repair

The Stage 13F-K3 staging acceptance evidence marker must remain preserved across later documentation amendments.

Required preserved marker:

`b7f50de`

Required register line:

`Stage 13F-K3 staging acceptance evidence remains recorded at commit b7f50de and must remain preserved across later Stage 13G and Stage 16A documentation amendments.`

This package includes an idempotent application script that restores the marker if it has been dropped.

## Groups — ledger rows first

| Ledger row | Status | Record |
| --- | ---: | --- |
| 13G Groups reference prototype adoption | SCHEDULED | Approved Groups prototype adopted as behavioural, hierarchy and copy spec; rebuild natively and do not port prototype code. |
| S3.1 Joker control | AMENDED / CLOSED | The bare `J` circle is retired. The joker control is a pill with star icon, `Joker` label and `2×` when armed. Gold fill and gold card border appear when on. Disabled treatment appears at cap. |
| Groups joker meter | SCHEDULED | A five-dot gold JOKER METER sits in the page controls. The same meter pattern is used everywhere jokers exist, including Groups and KO. |
| S3.3 Groups view switcher | AMENDED / CLOSED | `By group | By date` uses the design-system segmented control. Phase defaults follow the recorded rule: by group while predicting, by date once play begins. |
| Groups context banner | SCHEDULED | Context banner changes by phase: privacy before lock; results, points and live-table context once play begins. |
| 4.2 Predicted tables | AMENDED / CLOSED | Predicted tables show qualification edges for top two and third place, are derived live and include `Calculated live from your predictions.` |
| 4.3 Third-place table | AMENDED / CLOSED | Beneath every group table, the third-place ranking across all six groups renders from the same primitive in predicted and real contexts. Top four are marked as bracket-bound with the one-line explainer. |
| Part 1.3 bracket coherence | AMENDED / CLOSED | Warning appears once per session on first group edit. Re-derivation uses FLAG-FOR-RE-PICK. Stale picks are visibly flagged for re-pick and never silently kept or dropped. |
| Lucky Dip placement and behaviour | SCHEDULED | Lucky Dip is a light action beside group progress. It fills only blank scores in the current group and triggers the same save and bracket-coherence flow as manual entry. |
| In-tournament group card anatomy | SCHEDULED | Cards show result, points chip, `You predicted ...` line and joker chip. Joker-doubled points are shown where applied. |
| Match card meta line | AMENDED / SCHEDULED | Every group match card, editable and finished, carries date · venue with the host country's circle flag · group. Venue and host-country data live centrally with fixture data. Provisional venues are data like provisional teams. |
| Score steppers | AMENDED / SCHEDULED | Desktop score-stepper affordance is shown at ≥640px only. Phones keep numeric keypad input only. Steppers clamp 0–15, treat blank as zero on first increment and drive the identical save, coherence-warning and standings flow as typed entry. |
| Stepper accessibility resolution | FLAGGED / REQUIRED | Final implementation must either pad score-stepper hit areas to the standard target size or record a pointer-only exemption in the charter. Undersized 24px targets must not ship silently. |
| Autosave, privacy and zero dev text | SCHEDULED | Autosave pill, privacy context banner and zero dev text are required. |

## Groups — delta list current vs reference

| Area | Current / recorded state | Required delta |
| --- | --- | --- |
| Joker control | Joker caps and locks are already contracted. | Replace any bare/minimal joker UI with the approved pill: star icon, `Joker`, and `2×` when armed. |
| Joker meter | Joker counts exist in rules/contracts. | Add the five-dot gold JOKER METER in Groups controls and reuse it in KO. |
| Disabled at cap | Cap enforcement exists. | Disabled treatment must be visible at cap. |
| View switcher | Groups has phase-aware navigation concepts. | Use the design-system segmented control: `By group | By date`. |
| Phase default | Lifecycle exists. | Predicting defaults to `By group`; in-tournament defaults to `By date`. |
| Context banner | Current page copy is not locked to final wording. | Add the privacy context banner and in-tournament results/points banner. |
| Predicted tables | Predicted tables/resolver exist. | Add qualification edges and `Calculated live from your predictions.` |
| Third-place table | Resolver supports best-third logic. | Surface third-place ranking below every group table in predicted and real contexts. |
| Bracket coherence | Previous register contract exists but presentation needed final wording. | Adopt warning-once and flag-for-re-pick presentation. |
| Lucky Dip | Behaviour is carried from earlier WC26-era decision. | Place beside group progress, fill blanks only in current group and trigger normal save/coherence flow. |
| In-tournament cards | Result/scoring data exists. | Add result + points chip + `You predicted ...` + joker chip anatomy. |
| Match card meta line | Fixture venue data is provisional and central fixture data is already the correct destination for official schedule data. | Add date · venue with host-country circle flag · group to every editable and finished group match card. Venue/host-country values live centrally with fixture data and reuse existing circle-flag assets. |
| Score steppers | Charter already carried desktop stepper affordance. | Add compact score steppers at ≥640px only; phones keep numeric keypad only. Clamp 0–15, blank increments from zero, and trigger the same save/coherence/table flow as typed entry. |
| Stepper accessibility | Prototype displays 24px stepper buttons at desktop width. | Do not ship undersized targets silently. Either pad hit area to the standard target or record a pointer-only exemption in the charter before implementation closes. |
| Autosave and privacy | Autosave journey exists. | Surface compact autosave pill and privacy banner. |
| Prototype exclusions | Prototype includes sample data, phase switch and truncated date list. | Do not import; real date view lists every matchday, next kick-off first. |


## Groups — decisions 9 and 10 register entries

### Decision 9 — Match card meta line

Every group match card, editable and finished, carries the same meta-line structure: date · venue with the host country's circle flag · group. Hampden maps to Scotland, Wembley to England, Aviva to Ireland, Casement to Northern Ireland and Principality to Wales. Venue and host-country data live centrally with the fixture data. Official venue/schedule values are entered at Stage 17; provisional venues are data in the same sense as provisional teams. The venue flag reuses the existing circle-flag asset pipeline and does not create a new asset class.

### Decision 10 — Score steppers

The existing charter line for desktop stepper affordance is implemented as compact up/down chevrons flanking each score input at `≥640px` only. Phones keep the numeric keypad as the sole score input so cards remain compact. Steppers clamp scores to `0–15`, treat a blank field as zero on first increment, and drive the identical save, coherence-warning and standings flow as typed score entry. This is the same save, coherence-warning and standings flow as typed entry.

Accessibility resolution required before implementation closes: the prototype shows 24px stepper targets, which are below the standard target size. The final implementation must either pad the hit area to the standard target or explicitly document a pointer-only desktop exemption in the charter. Undersized targets must not ship silently.

## Groups — Part 1.3 register entry

### Part 1.3 — Bracket coherence after group prediction edits

Approved behaviour: group-score edits re-derive the predicted group tables and therefore the Original Bracket slots that depend on those tables.

On the first group-score edit in a session, the user is shown the approved warning:

`This changes your bracket. Your predicted tables feed your bracket. Editing group scores re-derives it — any picks for teams that drop out of a slot will be flagged for you to re-pick.`

Invalidation behaviour is **FLAG-FOR-RE-PICK**. If a stored Original Bracket pick no longer matches either team feeding that tie after group-table re-derivation, the pick is not silently kept and not silently dropped. The affected tie is visibly flagged for the user to re-pick; the stale pick is never silently kept and not silently dropped.

Tests must cover warning-once behaviour, re-derivation after group edits and flagged-pick presentation on affected bracket ties.

## Original Bracket — ledger rows first

| Ledger row | Status | Record |
| --- | ---: | --- |
| 13G Original Bracket reference prototype adoption | SCHEDULED | Approved Bracket prototype adopted for both mobile stacked and desktop wall-chart layouts. |
| Charter v1.8 wall chart | CONTRACT CHANGE / MOVED INTO 13G | Converging wall chart moves from backlog into 13G scope. |
| Bracket responsive split | AMENDED | Below 900px, the bracket is a vertical stacked layout with per-round pick-progress counters. At ≥900px, it becomes the converging wall chart. |
| Shared bracket state | SCHEDULED | ONE state, ONE set of tie/slot primitives and two arrangements. No layout-specific logic. |
| Slot anatomy | SCHEDULED | Every slot displays its slot-reference origin as a small source code, such as `1B`, `2A` or `3DEF`. |
| Resolved and unresolved slots | SCHEDULED | Resolved slots show flag and name and are tappable to advance. Unresolved slots are dashed placeholder chips and non-interactive. |
| Pick mechanics | SCHEDULED | Tap-to-advance, winner-only. Changing an upstream pick clears only downstream picks that are no longer fed; surviving picks persist. |
| Re-pick presentation | SCHEDULED | A tie whose stored pick no longer matches either feeding slot receives partial/amber treatment and the flag `Re-pick — your tables changed this tie`. |
| Champion strip and champion box | SCHEDULED | Champion strip at top and centred champion box on the wall chart. |
| KO mention compliance | AMENDED | The strip sub-line `winner picks only — scores and jokers are handled in the KO Predictor` is the page's only KO Predictor mention. |
| Predicted context banner | SCHEDULED | Banner wording: `Your group predictions decide this bracket. Live results will not change your saved picks.`. |
| Original Bracket control absence | TEST REQUIRED | Assert that no score inputs, no method controls and no joker controls exist anywhere on the Original Bracket. |

## Original Bracket — delta list current vs reference

| Area | Current / recorded state | Required delta |
| --- | --- | --- |
| Mobile layout | Original bracket is functional but not locked to final stacked anatomy. | Use vertical stacked layout below 900px with per-round pick counters. |
| Desktop layout | Wall chart was recorded backlog/charter scope. | Move converging wall chart into 13G at ≥900px. |
| State model | Winner-only Original Bracket contract exists. | Preserve one state and one primitive set across mobile and desktop. |
| Slot origins | Resolver owns slot references. | Make slot-reference origin visible on every slot. |
| Placeholder slots | Placeholder standards exist. | Use dashed placeholder chips, non-interactive. |
| Pick mechanics | Winner-only bracket confirmed. | Tap-to-advance; clear only downstream picks no longer fed; surviving picks persist. |
| Stale picks | Groups Part 1.3 settles invalidation behaviour. | Show amber re-pick treatment on exactly affected ties. |
| Champion | Winner pick exists. | Add champion strip and desktop champion box. |
| KO mention | Original and KO are separate competitions. | Only the approved one-line KO mention is allowed. |
| Scores, methods and jokers | Contract says none exist on Original Bracket. | Add an audit/test so they cannot creep in. |
| Live bracket | Live resolver context exists separately. | Same primitives may be used only under a distinct live-context banner. |

## Decisions proposed for sign-off: Bracket items 8–10

### 8. Connector lines

Recommendation: **without connector lines for the first build**.

Reasoning: the approved wall chart already carries the bracket shape through columns and convergence. Connector lines add visual noise on dark mode, can become fragile across responsive widths, and are a common failure point for share-card rendering. Build the line-free wall chart first. Produce a with-lines mock only if visual review or share-card readability proves it is needed.

Proposed sign-off text:

`Proceed without connector lines in 13G. Produce a later with-lines mock only if the line-free wall chart fails visual review or share-card readability.`

### 9. Share-card rendering

Recommendation: **share-card rendering lands in its own follow-on batch**, not inside the first Bracket reference rebuild.

Honest implementation approach: first build the accessible bracket DOM using the shared tie/slot primitives. Then create a dedicated fixed-size share-card export surface that uses the same bracket data and app-owned fonts/tokens. Do not rely on the live responsive viewport as the export target because share cards need stable dimensions, background and theme handling.

Proposed sign-off text:

`Share-card rendering remains recorded 13G follow-on scope, not part of the first Bracket reference rebuild. First build the real wall chart and stacked layout; then implement a dedicated fixed-size share-card export surface using the same bracket data and primitives.`

### 10. Tablet band

Recommendation: **confirm the 900px single breakpoint** for this surface.

Reasoning: below 900px, the stacked layout is more readable than a cramped seven-column bracket. Adding a third 700–900px layout would create another visual and test surface and would undermine the clear contract: one state, two arrangements.

Proposed sign-off text:

`Confirm 900px as the single breakpoint for this surface. Portrait tablets below 900px use the stacked layout. No third intermediate layout is added unless real-device review proves the stacked layout is too weak in the 700–900px band.`

## Original Bracket — register entries for decisions 1–7

### Original Bracket reference adoption — responsive layout and mechanics

The approved Original Bracket reference is adopted for both layouts.

Below 900px, the bracket renders as a vertical stacked layout with per-round pick-progress counters. At 900px and above, it renders as a converging wall chart: Round of 16 on the outer wings, quarter-finals and semi-finals converging inward, with the final and champion box centred.

Both layouts use one bracket state, one tie primitive and one slot primitive. There must be no layout-specific bracket logic.

Every slot displays its slot-reference origin, such as `1B`, `2A` or `3DEF`. Resolved slots show flag and team name and are tappable to advance. Picked slots receive success fill and tick treatment. Unresolved slots are dashed placeholder chips, non-interactive and styled to the existing placeholder standard.

Original Bracket pick mechanics remain tap-to-advance and winner-only. Changing an upstream pick clears only downstream picks that are no longer fed by the bracket. Surviving downstream picks persist.

If a stored pick no longer matches either feeding slot after group-table re-derivation, the tie shows the approved partial/amber treatment with the flag: `Re-pick — your tables changed this tie`. The pick is never silently kept and never silently dropped.

The page includes a champion strip at the top and, in the wall-chart layout, a centred champion box. The approved strip sub-line is: `winner picks only — scores and jokers are handled in the KO Predictor`. This is the Original Bracket page's only KO Predictor mention.

The predicted-context banner wording is approved as: `Your group predictions decide this bracket. Live results will not change your saved picks.`. A live bracket, when present, may use the same primitives only under its own distinct live-context banner.

Original Bracket compliance is enforced by absence: no score inputs, no method controls and no joker controls may exist anywhere on this page.

## 13G placement and contract changes

Recommended placement after the Stage 13F-K3 marker repair:

1. **13G-REF-1:** preserve the Stage 13F-K3 acceptance marker.
2. **13G-REF-2:** record Groups and Original Bracket prototype adoption.
3. **13G-GROUPS-1:** joker pill, joker meter and disabled-at-cap tests.
4. **13G-GROUPS-2:** view switcher, context banner and phase defaults.
5. **13G-GROUPS-3:** predicted tables and third-place ranking primitive.
6. **13G-GROUPS-4:** bracket-coherence warning and flag-for-re-pick tests.
7. **13G-GROUPS-5:** Lucky Dip and in-tournament card anatomy.
8. **13G-BRACKET-1:** shared slot/tie primitives and stacked mobile layout.
9. **13G-BRACKET-2:** desktop converging wall chart at ≥900px.
10. **13G-BRACKET-3:** pick mechanics, downstream persistence and re-pick flags.
11. **13G-BRACKET-4:** champion strip, context banner and absence audit.

Contract changes flagged:

- Groups Decision 9 adds a match-card meta-line contract: date · venue with host-country circle flag · group on editable and finished group match cards, with venue/host-country data centralised in fixture data and no new asset class.
- Groups Decision 10 adds a score-stepper contract: ≥640px only, 0–15 clamp, blank increments from zero, same save/coherence/table flow as typed entry, and an accessibility resolution before closure.

| Contract | Change |
| --- | --- |
| S3.1 Joker control | Closed. Joker pill replaces the bare `J` circle everywhere. |
| Joker meter | New shared meter pattern for Groups and KO. |
| S3.3 Groups switcher | Closed. Segmented `By group | By date` with phase defaults. |
| 4.2 Predicted tables | Closed. Live-derived predicted tables with qualification edge treatment. |
| 4.3 Third-place table | Closed. Required below every group table in predicted and real contexts. |
| Part 1.3 Bracket coherence | Closed. Flag-for-re-pick after group edits. |
| Original Bracket layout | Converging wall chart moved from backlog into 13G. |
| Original Bracket compliance | Absence of score, method and joker controls becomes testable. |
| Original Bracket KO mention | Only approved one-line mention allowed. |
| Share-card rendering | Kept as separate follow-on unless separately signed off. |

## Checkpoint

- Branch target: `euro28-development`.
- Current known pushed checkpoint before this package: `dcc5042 Record Stage 13G reference prototype adoption`.
- Stage 16A-P1 synthetic identity plumbing was committed at `86eb8d2`.
- Active migrations remain 18.
- Migration 019 must not exist.
- This package repairs the missing Stage 13F-K3 marker `b7f50de` and records Groups/Bracket reference adoption only.

Next single task after this package: `13G-GROUPS-1 — joker pill, shared joker meter and disabled-at-cap tests`.

Audit phrase locks: Stage 13G-REF-2; Groups decisions 9 and 10; euro28-groups-page-prototype.html; euro28-bracket-page-prototype.html; star icon; Joker label; 2×; five-dot gold JOKER METER; bare J circle is retired; By group | By date; third-place ranking across all six groups; Calculated live from your predictions; This changes your bracket; FLAG-FOR-RE-PICK; Lucky Dip; fills only blank scores in the current group; You predicted; date · venue with the host country; host-country circle flag; fixture data; ≥640px; clamp 0–15; blank as zero; pointer-only exemption; autosave pill; privacy context banner; zero dev text; below 900px; ≥900px; converging wall chart; ONE state, ONE set of tie/slot primitives; 1B; 2A; 3DEF; dashed placeholder chips; tap-to-advance; winner-only; downstream picks that are no longer fed; Re-pick — your tables changed this tie; winner picks only — scores and jokers are handled in the KO Predictor; group predictions decide this bracket; live results will not change your saved picks; no score inputs; no method controls; no joker controls; without connector lines; share-card rendering lands in its own follow-on batch; 900px single breakpoint; active migrations remain 18; no Migration 019.
