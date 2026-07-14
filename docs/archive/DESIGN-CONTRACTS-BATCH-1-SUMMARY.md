> **SUPERSEDED — Night Broadcast visual direction (2026-07-10, Stage DESIGN-PROGRAMME-ADOPTION-1).**
> The Night Broadcast visual direction recorded here is superseded by `docs/design programme/`,
> the binding visual authority. The content/interaction contracts of the referenced prototypes
> remain binding until each page's re-cut is approved; only their visual treatment is retired.
> This file is retained for provenance. See `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`.

# DESIGN-CONTRACTS-BATCH-1 — Approved visual contracts recorded

Status: approved and recorded after Nicky review.
Scope: `docs/reference-prototypes/`, governing docs and audit markers only.
Programme rule: these are binding visual contracts for layout, hierarchy, page composition and state coverage, but remain reference artefacts only and must be rebuilt natively in the Euro design system.

## Approved visual contracts

- `docs/reference-prototypes/euro28-groups-page-prototype.html` — approved Groups Night Broadcast contract and identity anchor.
- `docs/reference-prototypes/euro28-league-page-prototype.html` — approved Leagues / League table contract, refined as League table D.
- `docs/reference-prototypes/euro28-bracket-page-prototype.html` — approved Original Bracket contract, refined as Bracket G.
- `docs/reference-prototypes/euro28-ko-predictor-contract.html` — approved KO Predictor contract, refined as KO Predictor F.

## Bracket G approval

Bracket G is the approved Original Bracket visual contract. It keeps the liked Night Broadcast design direction and fixes the desktop layout into a proper wall chart:

- Round of 16 sits on the outside edges.
- Quarter-finals and semi-finals step inward.
- The final sits in the centre.
- The match card uses a small slick `vs` treatment rather than an oversized divider.
- Match cards include date, time, stadium and host-country flag.
- Review state shows saved picks, empty picks and re-pick items.
- The surface remains Original Predictor only and winner-only. It has no score inputs, method controls or joker controls.

## KO Predictor F approval

KO Predictor F is the approved KO Predictor visual contract. It keeps the same Groups/Leagues Night Broadcast design language and removes Bracket Health wording from the KO surface:

- Before real knockout teams are known, the page stays quiet and locked.
- Once real teams are known, the real fixtures appear.
- Fixture cards support 90-minute score, advancing team, method and five separate KO jokers.
- KO Predictor remains a separate competition with separate points and winner.

## League table D approval

League table D is the approved Leagues refinement:

- Compact Match Centre entry sits at the top.
- Full user rows are clickable to view picks.
- Rows use subtle chevrons instead of repeated tap-to-view text.
- Movement arrows are retained.
- Last-score clutter is removed because names/rows open the user’s picks.

## Still not approved

Bracket Health remains unapproved and should be redrafted later as `your predicted route vs the real route`: exact match-ups, still-alive picks, shifted routes, earlier meetings and impossible picks. It must not be implemented or recorded as binding until Nicky approves a dedicated visual contract.

## Shared design rule

Every page must look like the same exact design system as the approved Groups and Leagues contracts, with only page-relevant content changing. Future candidate HTML pages must not introduce a different identity, layout language, navigation model or style direction unless Nicky explicitly approves a rule change.

## Safety record

This approval-recording package changes no product code. It does not open public signups, does not create Migration 019, does not use service-role secrets and does not touch WC26 production. Original Predictor and KO Predictor remain separate, and predicted/live bracket contexts never blend.
