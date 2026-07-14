> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage 13G-H0 — Housekeeping and record corrections

Date: Friday 3 July 2026
Starting checkpoint: `5c9f415 Centralise KO readiness signal`
Scope: governance documents, ledger truthfulness and next-batch housekeeping
Database change: none
Migration 019: none

## Purpose

## Constitution amendment

Section 5 now adds principle 14: slick and frictionless is the product sensibility. The product should choose restraint over abundance, opinionated defaults over settings, and the shortest route between opening the app and what the player came for. User-facing machinery such as refreshing, syncing, drafts, versions and row counters should be removed from ordinary player copy. If a screen feels busy, remove before rearranging.

The previous Section 5 access principle remains active and is renumbered to principle 15.

This docs-only correction batch records missed and clarified 13G items before the next product build. It does not change product behaviour, scoring, database schema, privacy rules, routes or migrations.

The governing principle is recorded-equals-real: contract, admin readiness or engine work must not be described as a complete player-facing feature when an ordinary user cannot yet perform the action.

## Corrected records

### Tournament Picks

The Tournament Picks contract remains valid, but the player-facing feature is not functional yet.

The existing audit proved:

- the Original Predictor-only tournament-pick contract;
- total tournament goals, top scorer and highest-scoring team;
- 20 points each;
- global-lock boundary;
- no joker;
- no KO Predictor points;
- Admin readiness/dependency visibility.

It did not prove that an ordinary player can enter those picks. There is currently no player-facing entry surface for total goals, top scorer or highest-scoring team. The functional ledger must therefore distinguish the functional contract from the partial product feature.

### Player Insight, H2H and points breakdown

The existing player insight and H2H engines remain useful, but the current inline strip is not the intended product shape.

The intended product is a dedicated player view opened from player-name activation. It should contain overview, predictions, bracket, predicted tables, links to a dedicated H2H page and a dedicated points-breakdown page. Before privacy release, the view must show informative placeholders explaining when predictions will appear.

### Guest signup import flow

The agreed flow is:

1. a guest signs up with a valid local draft;
2. the account is created or signed in;
3. a dominant prompt appears: “Import your saved Euro 2028 predictions?”;
4. copy states that group scores, bracket and KO Predictor draft were found on this device;
5. primary action: “Import predictions to my account”;
6. secondary action: “Start fresh”;
7. `importGuestPredictionBundle()` is the engine;
8. signed-in users never see “browser draft” language again.

Silent automatic import is rejected for now because a local draft may be old, experimental or from a shared device. A dominant one-tap confirmation is clear and safe.

### FAQ list for sign-off

The user-facing FAQ should answer questions normal players actually ask:

1. When do predictions lock?
2. Can I change my group scores?
3. Can I change my bracket?
4. What is a joker?
5. How many jokers do I get?
6. What is the KO Predictor?
7. Do Original Predictor and KO Predictor points combine?
8. What happens if a knockout match goes to extra time or penalties?
9. How are points scored?
10. When can I see other players’ predictions?
11. How do private leagues work?
12. Can I play as a guest and save later?
13. What are Tournament Picks?

The FAQ must not include “What happens if a result is corrected?” because ordinary users should not have to think about correction mechanics.

Any points, caps, scoring values, lock times or release rules must render from central contracts/configuration.

## Bypass-class sweep items for next housekeeping/tooling batch

1. `.env.example` currently defaults `VITE_ENABLE_TIME_TRAVEL=true`. The template default must become false, with a comment explaining that time travel is a staging-only owner tool.
2. Coverage enforcement must be added with thresholds based on current actual live `src/` coverage, excluding legacy and fixtures. The threshold should ratchet by no-decrease, not aspiration.
3. `eslint-disable` governance must be added. Every disable must carry a reason comment and the total count must be ratcheted downward from the current baseline.
4. The frozen bridge/compat stylesheet rule must be strengthened. Any batch reworking a screen must migrate that screen's compat styles to modules in the same batch. Ratchet numbers must fall across a stage.
5. Visual fixture production gating must be answered definitively. Fixture modes must follow the Stage14ErrorFixture standard and be proved unreachable in the deployed bundle.
6. Size governance must state that 200/250 is review guidance while 400/400 is the enforced cap, with any over-cap allowlist listed in the ledger and ratcheted. `adminOperationsModel.js` is not allowlisted and must be split during the admin rebuild. The hard cap also applies to test fixtures.

## Prediction surface quality items for sign-off before build

### Joker design

Create a design-system joker element. A custom mark is permitted by the icon rules. Recommended shape: a gold special-action token using a `×2` joker/multiplier mark, not a hard-coded `J` in a circle. It must support off, on, disabled-at-cap and locked states, with existing accessible labels preserved.

### Bracket layout defect

The bracket slot primitive must be fixed so “Pick to advance” and “Selected to advance” controls cannot overlap team names. Long-name fixtures must be added to baselines.

### Shared switcher

Group/KO-round switch tabs, By group/By date and future prediction-view switchers must use one design-system Tabs treatment rather than separate lookalikes.

## Dedicated player-view target

Tapping a player name should open a dedicated player view, not an inline strip.

Required sections:

1. overview: points by competition, rank, movement where available and honest recent form from actual scored data;
2. group predictions: By date and By group using the shared switcher;
3. predicted bracket and predicted tables;
4. KO Predictor evidence released fixture by fixture;
5. links to a dedicated H2H page and a dedicated points-breakdown page.

Potential routes are:

- `#/player/:userId`;
- `#/player/:userId/head-to-head?against=me`;
- `#/player/:userId/points`.

The existing PlayerHeadToHead work is the engine, not the final destination shape.

## Wall-chart / converging bracket status

The converging wall-chart bracket/share-image work remains scheduled for Stage 13P-A. It must not be left as unowned backlog. The desktop bracket experience should not reach the tournament as an unscaled mobile layout.

## Contract and schedule flags

- Moving Tournament Picks player entry earlier than Stage 17A is a schedule change and must be explicitly accepted before build.
- Dedicated player, H2H and points-breakdown routes are a route/deep-link contract change and must be accepted before build.
- Guest signup import via dominant one-tap confirmation supersedes the older manual import wording and must be treated as the accepted account-conversion contract.
