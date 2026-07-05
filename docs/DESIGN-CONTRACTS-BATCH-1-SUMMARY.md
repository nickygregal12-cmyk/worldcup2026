# DESIGN-CONTRACTS-BATCH-1 — Bracket and KO Predictor candidate contracts

Status: approved Groups and League anchors supplied; Bracket and KO Predictor remain unapproved candidate references for Nicky approval.
Scope: `docs/reference-prototypes/` and this summary only.
Programme rule: these are self-contained HTML reference prototypes, not production code to port.

## Files produced

- `docs/reference-prototypes/euro28-groups-page-prototype.html` — approved Groups Night Broadcast anchor, not a candidate
- `docs/reference-prototypes/euro28-league-page-prototype.html` — approved League visual contract, not a Bracket/KO candidate
- `docs/reference-prototypes/euro28-bracket-contract-A.html`
- `docs/reference-prototypes/euro28-bracket-contract-B.html`
- `docs/reference-prototypes/euro28-ko-predictor-contract-A.html`
- `docs/reference-prototypes/euro28-ko-predictor-contract-B.html`
- `docs/reference-prototypes/euro28-ko-predictor-contract-C.html`

## Approved anchors supplied

The supplied `docs/reference-prototypes/euro28-groups-page-prototype.html` is the approved final Groups Night Broadcast visual contract. It is not part of the Bracket/KO approval choice and must not be redrafted unless Nicky explicitly reopens Groups.

The supplied `docs/reference-prototypes/euro28-league-page-prototype.html` is also approved as the League visual contract. It is not part of the Bracket/KO approval choice and must not be redrafted unless Nicky explicitly reopens Leagues.

The contract establishes the visual language for the remaining pages:

- navy broadcast hero band with watermark treatment;
- glass-pill view toggle and joker meter;
- ticket-style match cards with a gold joker spine/glow;
- green qualification and amber third-place markers;
- light and dark theme support;
- five-position navigation shown only as prototype framing unless a later product-stage explicitly changes global navigation.

The recorded Groups behaviour remains preserved: by-group/by-date views, five-joker cap, Lucky Dip filling empty scores only, live predicted tables, third-place ranking, bracket re-derivation dialog, save pill, all provisional teams and in-tournament points chips. This Batch 1 package does not change Groups product code.

## Preserved decisions across the batch

- The approved Groups Night Broadcast direction remains the identity anchor and is not redrafted.
- The approved League visual contract is recorded as a separate approved anchor and is not redrafted in this batch.
- Bracket is the Original pre-tournament bracket surface.
- Original Bracket remains winner-only.
- Original Bracket has no score inputs, method controls or joker controls.
- Bracket remains separate from KO Predictor.
- Bracket mobile layout is stacked below 900px.
- Bracket desktop layout uses a converging wall chart at 900px and wider.
- Slot source labels such as `1B`, `2A` and `3DEF` remain visible.
- KO Predictor is a separate real-knockout competition.
- KO Predictor supports 90-minute score, advancing team, method and five separate KO jokers.
- KO Predictor uses only real confirmed knockout fixtures; unresolved or partial fixtures are hidden or unavailable, not playable.
- Original and KO points never combine.
- Predicted and live bracket contexts never blend.
- No scoring, resolver, route, Auth, signup, Supabase write or migration change is proposed.
- Active migrations remain 18; Migration 019 is not introduced by this programme.

## Bracket candidate A — Broadcast bracket command deck

This variant gives the Original Bracket a strong match-broadcast feel while keeping the controls simple.

It chooses:

- a large mobile hero explaining the Original/KO boundary;
- a champion pick card directly under the hero;
- sticky round completion pills for quick progress scanning;
- stacked mobile round cards with hard cases: long names, provisional third-place slot, stale/re-pick state and loading state;
- a broad desktop wall chart that converges into a central champion cup card;
- a compact desktop legend for confirmed, provisional, review and KO-boundary states.

Best if Nicky wants the Bracket to feel like a big pre-tournament centrepiece.

## Bracket candidate B — Review room with evidence rail

This variant is more practical and review-led.

It chooses:

- a mobile top summary for saved picks and champion;
- route-based mobile cards rather than one full round stack;
- an explicit empty state when group predictions have not populated part of the bracket;
- a desktop side rail explaining context, attention and KO boundary;
- the same converging desktop wall chart, but with more supporting guidance around it.

Best if Nicky wants the Bracket to feel easier to audit and less trophy-first.

## KO Predictor candidate A — Match-night fixture runway

This variant makes the active playable fixture the main object.

It chooses:

- a separate-competition hero;
- a visible five-joker dock near the top;
- round tabs;
- large match cards with 90-minute score, advancing team choice, method choice and joker state;
- explicit hidden-fixture panel for unresolved Round of 16 matches;
- one armed-joker example and one unarmed/saved example.

Best if Nicky wants a casual mobile player to immediately understand what to fill in.

## KO Predictor candidate B — Compact KO control room

This variant is denser and more status-led.

It chooses:

- a top stats deck for playable, hidden and joker counts;
- compact match cards using team rows and controls below;
- unavailable states for later rounds;
- loading state that keeps existing predictions visible;
- separate Original and KO totals shown only as separate context pills, never combined.

Best if Nicky wants KO Predictor to feel more like a focused competition dashboard once knockout activity is busy.


## KO Predictor candidate C — Before/after bracket-health gate

This variant directly answers the readiness-state question.

It chooses:

- a side-by-side contract showing the KO Predictor before groups finish and after real teams are known;
- a locked pre-knockout state with bracket-health/readiness checks instead of placeholder prediction controls;
- a playable post-readiness state once all eight Round of 16 pairings are real;
- clear separation between Original Bracket and KO Predictor;
- explicit note that any bottom navigation shown in the HTML is preview chrome only and does not authorise app-wide navigation changes.

Best if Nicky wants the contract to remove ambiguity around what the page looks like while the real knockout bracket is unavailable.

## Flagged proposed decisions

None. The candidates are composition/layout alternatives within the already recorded functional decisions. The navigation shown inside prototypes is preview chrome only; the current app-wide bottom navigation remains unchanged unless separately approved. The approved Groups contract also shows this chrome as visual framing, not a global-nav change request.

## Current approval state

Approved and binding anchors:

- Groups: approved.
- Leagues: approved.

Not approved yet:

- Bracket A/B are candidates only.
- KO Predictor A/B/C are candidates only.

## Approval options

Nicky should pick one option per remaining unapproved surface:

- Bracket: A or B, or a named mix of A/B.
- KO Predictor: A, B or C, or a named mix of A/B/C.

If a mix is chosen, the next step is to produce a merged file for re-approval before recording a binding contract.

## Safety record

This candidate/anchor batch changes no product code. It does not open public signups, does not create Migration 019, does not use service-role secrets and does not touch WC26 production.
