# Stage 13G Destination Reference Adoption — Tournament, How to Play, Account, Admin and Match Centre

Status: approved reference adoption and sequencing record.  
Scope: docs/audit only. No UI rebuild, route implementation, source-of-truth config correction, scoring change, resolver change, Supabase write or migration.  
Reference brief: `docs/reference-prototypes/euro28-tournament-split-agent-prompt.md`.

## Purpose

This package records five approved reference prototypes before any product code changes are made. They are references for information architecture, content hierarchy, copy register and data-source discipline. They are not pixel-perfect markup to port, and they are not permission to merge four independent builds into one batch.

The adopted reference artefacts are:

- `docs/reference-prototypes/euro28-tournament-page-prototype.html`;
- `docs/reference-prototypes/euro28-how-to-play-page-prototype.html`;
- `docs/reference-prototypes/euro28-account-page-prototype.html`;
- `docs/reference-prototypes/euro28-admin-page-prototype.html`;
- `docs/reference-prototypes/euro28-match-centre-page-prototype.html`.

The prototypes use static sample data, inline CSS, demo switches, Google fonts and single-file HTML. Those details are explicitly excluded from implementation. Real builds must use the Euro design system, central routes, semantic tokens, existing services/models and canonical config/contracts.

## Sequencing decision

The reference brief contains four independent parts. They must be sequenced as separate scoped stages or pull requests unless Nicky explicitly accepts a combined package later.

1. **Part A — Stage 13G-B-TOURNAMENT-1:** Tournament / How to Play split and canonical tournament fact correction.
2. **Part B — Account destination rebuild:** new scoped Stage 13G family batch after Part A unless an existing governance row is proved to own it.
3. **Part C — Admin cosmetic restyle:** visual-language update only; no Admin operation or permission contract change.
4. **Part D — Match Centre group-match upgrade:** extend Match Centre usefulness for group matches without weakening the separate KO Predictor and Original Predictor boundaries.

Part A is first because it corrects the source-of-truth tournament facts and fixes the incorrect single-page IA before more destination polish builds on it.

## Part A — amended Stage 13G-B scope

Stage 13G-B already owns tournament comprehension and match organisation. The Tournament / How to Play split amends that existing stage in place; it does not create a duplicate stage.

The next implementation batch is:

`Stage 13G-B-TOURNAMENT-1 — Tournament / How to Play split and canonical tournament fact correction`

Scope:

- correct `src/config/tournament.js` and `docs/STAGE-1-TOURNAMENT-MODEL.md` so confirmed Euro 2028 facts are no longer stale;
- treat tournament dates, host nations and venues as confirmed;
- keep group participants and match-specific kick-off times explicitly unconfirmed;
- split the current combined `#/tournament` destination into `#/tournament` for tournament facts and `#/how-to-play` for Predictor mechanics;
- update routing, Site Access Map, More/footer entries and copy so Tournament and How to Play are separate destinations;
- rebuild the old TournamentOverview into separate components/models that read from `TOURNAMENT_CONFIG`, `EURO_SCORING_CONFIG` and resolver/tournament config sources;
- remove defensive “why can’t I see real teams yet” framing and use calm qualifying-status copy instead;
- add and wire a Stage 13G-B audit for the split and corrected facts.

No migration is expected. Active migrations must remain 18. Migration 019 must not be created.

### Confirmed tournament fact correction to implement in Part A

The source-of-truth correction belongs in the implementation batch, not this docs-only reference adoption package.

Part A must record the following as confirmed public facts:

- tournament dates: 9 June 2028 to 9 July 2028;
- opening match: Cardiff;
- semi-finals and final: Wembley;
- host nations: England, Scotland, Wales and Republic of Ireland;
- Northern Ireland is not a host nation in the final venue schedule;
- venue count: nine venues across eight cities;
- format: 24 teams, six groups of four, top two plus four best third-placed teams advance to the Round of 16, no third-place play-off.

Part A must not invent:

- final qualified teams;
- group draw participants;
- match-specific kick-off times that remain post-draw confirmations.

## Part B — Account reference adoption

The Account prototype is adopted as the reference for a later focused Account destination rebuild, not as part of Stage 13G-B-TOURNAMENT-1.

Recorded direction:

- signed-in Account must become useful after name setup, with identity header, editable display name, read-only email and real account quick stats;
- guest transfer must move from a recurring signed-in Account card to a one-time post sign-in/sign-up modal when a valid device draft exists;
- accepted guest-transfer copy must be reopened and recorded before changing locked C1 wording;
- “Clear my predictions” is new destructive functionality and requires its own service/test/audit coverage;
- `src/pages/Profile.jsx` must be confirmed dead before deletion; if dead, retirement belongs in the Account batch;
- notification rows stay “Coming soon” only and do not create push/PWA functionality.

No Account implementation is included in this reference-adoption package.

## Part C — Admin reference adoption

The Admin prototype is adopted as a cosmetic reference for the protected Admin control room.

Recorded direction:

- visual hierarchy, section navigation and card styling may be refreshed;
- existing owner/results-admin permission boundaries, audit detail, fixture scheduling, reconciliation and Tournament Picks readiness contracts must not change;
- no fake Admin function, operation shortcut or unaudited recovery action may be introduced;
- this remains cosmetic unless a later scoped brief proves a real functional gap.

No Admin implementation is included in this reference-adoption package.

## Part D — Match Centre reference adoption

The Match Centre prototype is adopted as the reference for extending Match Centre from a strong knockout-match surface into a useful group-match surface too.

Recorded direction:

- group matches need group-impact context, table movement, live comparison and points-on-the-line content;
- knockout-specific bracket impact must remain KO-only and must not be faked for group matches;
- live, predicted and official contexts stay visibly separated;
- previous/next navigation must remain chronological and fixture-owned;
- no scoring, resolver or Supabase write change is authorised by the reference adoption alone.

No Match Centre implementation is included in this reference-adoption package.

## Compliance and exclusions

This package does not:

- change `src/config/tournament.js`;
- create `#/how-to-play`;
- rebuild TournamentOverview;
- rebuild AccountAccess;
- restyle Admin;
- change Match Centre;
- alter scoring values, resolver logic or Supabase data;
- add a migration.

It does:

- add the approved reference artefacts under `docs/reference-prototypes/`;
- amend roadmap, ledger and charter records so the next build has a stable scope;
- add `audit:stage13g-destination-reference-adoption` to `npm run check`.

## Next single task

After this docs/audit package is committed and pushed, the next single implementation task is:

`13G-B-TOURNAMENT-1 — Tournament / How to Play split and canonical tournament fact correction`
