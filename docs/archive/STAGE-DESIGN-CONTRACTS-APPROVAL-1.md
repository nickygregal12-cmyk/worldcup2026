> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# STAGE DESIGN-CONTRACTS-APPROVAL-1 — Approved visual contracts

## Status

Accepted for application after Nicky approved the revised HTML contracts in chat.

## Scope

Docs/reference/audit only. No `src/`, `supabase/`, test, migration, scoring, resolver, route, Auth, signup, service-role or Supabase write change is included.

## Approved contracts recorded

- Groups: `docs/reference-prototypes/euro28-groups-page-prototype.html`
- Leagues / League table D: `docs/reference-prototypes/euro28-league-page-prototype.html`
- Original Bracket G: `docs/reference-prototypes/euro28-bracket-page-prototype.html`
- KO Predictor F: `docs/reference-prototypes/euro28-ko-predictor-contract.html`

## Approved Bracket G details

The Original Bracket contract uses a proper desktop wall-chart layout, with Round of 16 ties on the outside edges, quarter-finals and semi-finals stepping inward, and the final centred. It keeps a small slick `vs`, date/time/stadium/host-flag match detail, and review states for saved, empty and re-pick items. It remains winner-only with no score inputs, method controls or joker controls.

## Approved KO Predictor F details

The KO Predictor contract shows pending teams before readiness and real teams once the knockout fixtures are known. It includes 90-minute score, advancing team, method and five separate KO jokers. Bracket Health wording is deliberately absent from the KO Predictor contract.

## Approved League table D details

The Leagues contract keeps Match Centre compact at the top, makes the full user row clickable to view picks, uses subtle chevrons instead of repeated tap-to-view copy, preserves movement arrows and removes last-score clutter.

## Not approved

Bracket Health remains unapproved. The next Bracket Health candidate should compare `your pick vs the real match-up`, show how many picks are still alive on the same route, identify teams due to meet before the picked route, and mark shifted-route or impossible picks.

## Safety

Active migrations remain 18 and Migration 019 is not created. WC26 production remains untouched and inactive. Original Predictor and KO Predictor points remain separate. Predicted and live bracket contexts never blend.
