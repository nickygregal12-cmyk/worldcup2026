# Stage 13G-REF — Home and League reference prototype adoption

Status: scheduled and accepted as a docs/audit-only reference-adoption package.

This package records two approved reference artefacts and the owner amendments that must govern the next Home and League presentation build. It does not implement UI, change routes, write data, change scoring, change resolver logic, change Supabase policy, add service-role tooling or create a database migration.

Reference artefacts preserved for documentation only:

- `docs/reference-prototypes/euro28-home-page-prototype.html`
- `docs/reference-prototypes/euro28-league-page-prototype.html`

The reference files are not app code. They must not be imported into production, bundled into the app, used as single-file architecture, copied for Google-hosted fonts, copied for CDN flags, copied for sample data, copied for prototype toasts or copied for prototype-only state/readiness switches. Future implementation must rebuild the accepted behaviour, hierarchy, spacing intent and copy register natively in the Euro design system: existing semantic tokens, primitives, CSS Modules, shared components, `PlayerIdentity`, shared Tabs, Dialog and Sheet patterns.

## Placement

This is a Stage 13G reference-adoption insertion that must be recorded before any further Stage 16 seeded-acceptance implementation is expanded.

Recommended follow-up sequence:

1. `13G-REF-0` — ledger, register and charter amendment for approved Home and League prototypes.
2. `13G-HOME-1` — Home countdown and pre-tournament state contract.
3. `13G-HOME-2` — Home signed-out hook and guest path.
4. `13G-HOME-3` — Home matchday hub and match-centre row routing.
5. `13G-HOME-4` — Home KO readiness fan-out and zero pre-readiness presence.
6. `13G-LEAGUE-1` — League pure table presentation.
7. `13G-LEAGUE-2` — League dedicated player view routing.
8. `13G-LEAGUE-3` — League management sheet/dialog/toast/freshness patterns.
9. `13G-LEAGUE-4` — League KO readiness and central rules strip.

## Home prototype adoption with two owner amendments

The Home prototype is approved as the reference for three Home states: signed-out hook, signed-in pre-tournament and matchday hub. It is adopted with two amendments that override the prototype wherever they differ.

### Amendment 1 — one countdown, not two

The register confirms the prediction lock is the first tournament kick-off: one moment. Home must not show separate side-by-side “First match” and “Predictions lock” countdowns because two tickers to the same second imply two different deadlines.

Home must show one countdown card only.

Approved wording proposal:

- Eyebrow: `First match & prediction lock`
- Headline: `Euro 2028 starts in`
- Countdown units: days, hours, minutes
- Sub-line: `Predictions lock at first kick-off.`
- Supporting line: `One deadline. Your Original Predictor locks when the opening match kicks off.`

Component note required when implemented:

> This card intentionally reads the same central first-kick-off timestamp used by prediction-lock enforcement. If the register ever separates tournament start from prediction lock, this is the only Home countdown surface that changes.

Required future config-to-surface test:

- the Home countdown timestamp;
- the displayed prediction-lock deadline; and
- Original Predictor lock enforcement

must all read the same central provisional first-kick-off config value.

### Amendment 2 — KO Predictor zero Home presence pre-readiness

Owner amendment accepted: before KO Predictor readiness, the Home destination must carry no KO Predictor element at all. This supersedes the earlier quiet-tease-card decision recorded under Home lifecycle work and corrects the prototype where it shows pre-readiness KO tease cards.

Pre-readiness, the KO Predictor is discoverable only in two places:

1. the More sheet, as a modest explanatory entry describing what is coming and when; and
2. the how-to-play guide, where the second-chance framing is explained with the line: `everyone starts the knockouts on zero`.

At readiness, the full KO Predictor card may appear on Home and the existing navigation lifecycle proceeds as already confirmed.

The one-signal lifecycle rule is extended. The same central KO readiness signal must govern all of the following together:

- the navigation tab state;
- the Home KO card existence;
- the More sheet KO entry state; and
- league KO standings availability.

Lifecycle tests must assert all four surfaces flip together from the same readiness source. No separate local Home readiness flag, League readiness flag or More readiness flag is permitted.

### Corrected Part 5.1 wording

Before KO Predictor readiness, Home shows no KO Predictor card, locked tease, countdown, banner, prompt or placeholder. Home remains focused on the Original Predictor, matchday context, points, rank, predictions, bracket status and leagues.

The KO Predictor is explained pre-readiness only in the More sheet and the how-to-play guide. The guide carries the second-chance contract: everyone starts the knockouts on zero.

When the central KO readiness signal becomes true, Home may show the full KO Predictor card. That same signal also changes the navigation lifecycle, the More sheet state and league KO standings availability. These surfaces must be tested as a single lifecycle group.

### Home decisions settled by the prototype

1. Signed-out hook: thesis headline, three-beat how-it-plays, account-first CTAs, guest path directly beneath and guest-draft promise stated plainly.
2. Matchday hub row anatomy: kickoff/live/FT column, stacked teams with flags, meta line with group and stadium plus predicted score or points chip, joker gold edge, and chevron to that fixture's match centre.
3. Matchday hub order: live first, then upcoming by kick-off, then finished.
4. Points/rank strip leads the matchday state.
5. Bottom navigation alignment: the Home circle overlaps the bar line, and all five labels share a baseline.
6. Pre-tournament cards: prediction progress with meter and joker count; bracket status including the `updates if your group predictions change` contract line; leagues one-row summary.

### Home exclusions from the prototype

Do not import sample data, stub toasts, prototype state switcher, prototype readiness switch, Google-hosted fonts, CDN flag loading, single-file HTML/CSS/JS structure or any prototype-only implementation shortcuts.

## League prototype adoption

The League prototype is approved and supersedes the earlier WC26 screenshot reference and any current league presentation where they differ. It is a reference artefact, not code to port.

### League decisions settled by the prototype

1. League tables are pure: one running total per competition, no stat chips.
2. The earlier stat-chip question is closed as `NO`.
3. Gap-to-leader appears on every row. The leader shows points clear of second.
4. Top-three treatment uses designed rank badges: accent-filled first, accent outline second, quiet ring third. No gold anywhere because gold is joker-reserved. No emoji.
5. Player row tap opens the dedicated player view using the S5 shape: header with rank context, Original and KO stats strictly separate, then Full predictions / Head-to-head / Points breakdown as real destinations.
6. The inline-H2H-below-the-league presentation is retired.
7. League switching uses the design-system bottom sheet.
8. Delete league uses the small danger-ghost action plus shared confirmation dialog.
9. Copy invite uses the confirmed-state plus toast pattern.
10. Freshness is passive only. No refresh controls.
11. KO pre-readiness: no KO tab and no KO table; show the single note: `KO Predictor standings arrive at the knockouts — everyone starts on zero.`
12. One central readiness signal drives the KO note, competition tabs and player-view KO line together.
13. The rules strip renders from the central versioned ruleset and must not hard-type values.

### League exclusions from the prototype

Do not import sample data, stub destinations behind the three player-view links, the prototype-only readiness switch, Google-hosted fonts, CDN flags or the single-file structure. Real routes, real signals and Section 11 architecture stand.

## Delta list — current Home vs reference

| Area | Current / recorded state | Required delta |
| --- | --- | --- |
| Signed-out Home | Functional shell exists but not the approved thesis hook structure. | Replace with approved hook: `Predict every match. Beat your mates.`, three-beat flow, account-first CTAs and guest path beneath. |
| Guest promise | Guest storage is browser-only and unscored. | Surface plainly: guest predictions save on this device; sign up later to keep them and score points. |
| Countdown | Prototype shows two countdown cards, now corrected. | Build one countdown only using the single first-kick-off / lock timestamp. |
| Pre-tournament prediction card | Groups and Review are active but Home does not yet use approved progress-card anatomy. | Add prediction progress card with meter, predicted match count and joker count. |
| Bracket card | Bracket contracts exist. | Add bracket status card with `updates if your group predictions change`. |
| KO pre-readiness | Earlier quiet tease decision existed. | Remove all Home KO pre-readiness presence. |
| KO readiness | Groups/KO navigation lifecycle exists. | Extend same readiness signal to Home KO card existence, More sheet state and league KO standings. |
| Leagues summary | Home shell does not yet use approved one-row summary. | Add one-row leagues summary. |
| Matchday hub | Match-centre support exists, but Home row anatomy is not final. | Add hub ordered live → upcoming by kick-off → finished. |
| Match rows | Match surfaces exist elsewhere. | Use kickoff/live/FT column, stacked teams with flags, group/stadium/meta, predicted score or points chip, joker edge and chevron. |
| Points/rank strip | Player insight exists. | Make points/rank strip lead the matchday Home state. |
| Bottom nav | Corrected spec exists. | Amend charter wording: circle overlaps bar line; all five labels share baseline. |

## Delta list — current League vs reference

| Area | Current / recorded state | Required delta |
| --- | --- | --- |
| League page | Stage 13G-C6 compact shell exists. | Schedule full presentation rebuild against approved League prototype. |
| Table purity | Current compact table is rank/member/points but deeper details still exist nearby. | Keep default table pure; no stat chips. |
| Stat-chip question | Previously open. | Closed as `NO`. |
| Gap treatment | Race story exists in model. | Every row shows gap; leader shows clear of second. |
| Top-three | Current treatment is not final approved badge system. | Accent-filled first, accent outline second, quiet ring third. No gold, no emoji. |
| Current-user row | Existing anchoring exists. | Match prototype with accented row and clear `YOU` chip. |
| Player row action | Current compact shell opens detail below table. | Retire inline H2H below league; open dedicated S5 player view. |
| League switching | Current selector is not final. | Use design-system bottom sheet. |
| Delete league | Action exists but not final pattern. | Small danger-ghost plus shared confirmation dialog. |
| Copy invite | Existing invite code/copy exists. | Confirmed-state plus toast pattern. |
| Freshness | Existing loading/refresh mechanics may appear. | Passive freshness only; no refresh controls. |
| KO pre-readiness | Lifecycle exists. | No KO tab/table; one second-chance note. |
| Rules strip | Rules exist centrally. | Render strip from central versioned ruleset. |

## Conflicts and resolutions

No direct conflicts remain after the owner amendments are applied.

Resolved differences:

- Home prototype two countdowns → corrected to one countdown.
- Home prototype KO tease cards → superseded by zero Home KO pre-readiness presence.
- Earlier quiet-tease-card decision → retired.
- Earlier inline-H2H-below-league presentation → retired.
- Earlier league stat-chip question → closed as `NO`.
- Prototype fonts, sample data, CDN flags, state switches, readiness switches and toasts → excluded.

## Ledger rows to record

| Ledger row | Status | Record |
| --- | --- | --- |
| 13G Home reference prototype adoption | SCHEDULED | Approved reference adopted with two owner amendments. |
| 13G Home countdown contract | SCHEDULED | One countdown only; countdown and lock enforcement read the same first-kick-off config value. |
| 13G Home KO pre-readiness presence | AMENDED | Quiet tease card superseded; Home shows no KO Predictor element before readiness. |
| 13G Home readiness fan-out | SCHEDULED | One readiness signal governs nav tab, Home KO card existence, More entry and league KO standings. |
| 13G Home signed-out hook | SCHEDULED | Thesis headline, three-beat explanation, account-first CTAs and guest-draft promise adopted. |
| 13G Home matchday hub | SCHEDULED | Points/rank strip first; rows live → upcoming → finished; rows link to match centre. |
| 13G bottom-nav baseline | AMENDED | Home circle overlaps bar line; all five labels share one baseline. |
| 13G League reference prototype adoption | SCHEDULED | League prototype supersedes earlier WC26 screenshot reference and current presentation. |
| 13G League table purity | AMENDED | Pure tables only; one running total per competition; no stat chips. |
| 13G League gap/rank treatment | SCHEDULED | Gap every row; leader clear of second; top-three designed badges; no gold, no emoji. |
| 13G League player row destination | AMENDED | Inline H2H below league retired; player row opens dedicated S5 player view. |
| 13G League management patterns | SCHEDULED | Bottom sheet switching, danger-ghost delete with shared dialog, copy invite confirmed-state plus toast, passive freshness. |
| 13G League KO pre-readiness | SCHEDULED | No KO tab/table; one second-chance note only. |
| 13G League rules strip | SCHEDULED | Render from central versioned ruleset. |

## Contract changes flagged

| Contract | Change |
| --- | --- |
| Home countdown | Single first-kick-off timestamp is also prediction-lock timestamp. |
| KO readiness | One central readiness source fans out to nav, Home, More and league standings. |
| Home visibility | KO Predictor has zero Home presence before readiness. |
| More/how-to-play | KO pre-readiness discovery lives only in More and the guide. |
| League table | Pure competition totals only; stat chips prohibited. |
| League player-detail | League row opens dedicated S5 player view, not inline H2H. |
| Rules strip | League rules strip reads central versioned ruleset. |
| Bottom navigation | Home circle overlaps bar line; labels share baseline. |

No database contract change is implied. Active migrations remain 18 and Migration 019 must not exist.

## Checkpoint

- Branch target: `euro28-development`.
- Latest confirmed pre-package commit: `2742a12 Repair Stage 16A scope alignment gates` unless Stage 16A-P1 has been committed locally since then.
- Deployed app-shell verification was last reported passing.
- Active migrations remain 18.
- Migration 019 is not created by this package.

Next single task after this docs/audit package: build `13G-HOME-1` as the first narrow implementation slice, starting with the single countdown contract and config-to-surface test.


Audit phrase locks: no UI build; no route implementation; no scoring change; no resolver change; no Supabase write; no Migration 019; not as code to port; same central first-kick-off config value; No gold and no emoji.

prototype switches
