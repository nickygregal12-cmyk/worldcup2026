**Stage DESIGN-PROGRAMME-ADOPTION-1 (2026-07-10 — owner rulings, final)** adopts the
`docs/design programme/` package as the binding visual authority for the Euro 2028
Predictor and records the owner rulings that resolved the prior verification. All rulings
in this entry are dated 2026-07-10 and are final. This entry is docs/authority-only: it
changes no `src/`, `supabase/`, test, scoring runtime, resolver, Auth, service-role,
fake-result-write or migration; active migrations remain 21 and Migration 020 is applied.
It supersedes only *appearance*; every functional decision, competition boundary and gate
recorded elsewhere in this register remains untouched.

*Binding boundaries (recorded verbatim):*

1. The design programme governs appearance only — it changes nothing functional.
2. Existing contracts and this Decision Register govern everything else. Where a concept
   omits something the contracts require, the contract wins and the element gets styled
   into the new system, never dropped.
3. The per-page finalisation standard (recorded 2026-07-09) applies to every re-cut stage:
   each exits FINAL — flaws fixed in-stage, CSS modularised in-stage, no scaffold UI,
   fail-loud provisional indicators are features and stay; exit = owner gallery approval →
   visual blessing (once the Playwright visual tier is present) → FINAL.

**A. Scoring (the locked contract governs everywhere; see `docs/RULES-SCORING-LOCKED-CONTRACT.md`).**
Group matches 5 exact / 3 correct result; group positions 2 per correct position, +5 for a
perfect group; Top Scorer 30, entered on Review (player pool pending Stage 17A); group-goals
total tiered 25 / 15 / 5 (exact / within 5 / within 10, bands inclusive by distance),
auto-calculated from the 36 group predictions and never player-entered. **Highest-Scoring
Team is dropped and ceases to exist.** Top Scorer ties pay the full 30 to anyone who picked
any tied official winner. The superseded 30/10 match values and flat-20 tournament picks are
dead and must not be written, asserted or pinned anywhere; the earlier "Scoring model" and
"Extra tournament picks" prose in §2/§3 of this register is superseded on this date (see the
banners added there) and by Stage STAGE-RULES-SCORING-LOCK-1.

**B. Joker multiplier amendment.** A joker doubles that match's score points only — group
matches and KO Predictor matches; never position points, never bonuses, never anything on
the Original Bracket (bracket jokers do not exist). The locked contract previously defined
caps (5 group / 0 bracket / 5 KO) but no multiplier; the multiplier is added to that contract
as this recorded amendment.

**C. KO draw-bonus amendment — RESOLVED 2026-07-10 (Stage DP-SCORING).** The KO Predictor
match now scores as three additive +5 components: correct advancer (any method), correct
draw call (predicted level at 90 and it was), and exact 90-minute score. Regulation maximum
10, extra-time maximum 15; a joker doubles the match total. This resolves the previously
unset draw bonus — **the bonus is the +5 draw-call component**, not a separate value. The
locked contract (`docs/RULES-SCORING-LOCKED-CONTRACT.md`) and CLAUDE.md §4 carry the scheme.

**D. Design rulings.** Gold is joker-exclusive (`#A6790A` family); the sky family
(`#5FC7F5` / `#38BDF8`) is the broadcast/chrome accent — no gold in mastheads, tabs, marks or
borders. Palette findings: **F1** — light-palette text uses gain-authored ink variants ~6–12%
darker at the same hues (the originals stay for fills/chrome); **F3** — the
`text-muted-on-chrome` token is approved; **F2/F4/F5** — accepted as analysed in the
dark-palette copy-back; **F6** — the concepts' improvised muted/border values are retired via
per-page extraction, with no bundle re-render. `docs/design programme/Euro 2028 Predictor -
Dark Theme Palette.html` is the dark-theme authority. Team badges are circular ISO-keyed
(neutral dashed placeholder chip for unresolved slots). The 4px spacing scale holds with the
owner compact bias (between two steps take the smaller). Mobile bottom-nav auto-hide is the
approved amendment (hysteresis rules per CLAUDE.md §5). Mobile score steppers are mandatory:
vertical arrows above and below each score, plus direct numeric entry, 48px targets.
High-score confirm fires at 7+ on typed entry only, shown once. Contextual watermark glyphs
appear per surface (the Group A page shows "A", etc.). Dark mode is a manual toggle (top bar
and More), not system-driven. Mobile and desktop receive equal polish. Contrast ≥4.5:1 in
both themes remains required.

**E. Guest mode.** Permanently alive. Guests get the same experience on their two proper
pages (Groups, Bracket) with exactly two differences — no lock and no points. Completed
matches show real scores with the guest's remaining picks applied (route-tracker). A post-lock
guest transfer keeps the picks but awards no points, and the explicit missed-deadline message
is a required Guest Transfer modal state. This is a contract-level requirement, not a visual
option.

**F. Fonts.** Prototypes and design artifacts may load Google Fonts via CDN; the product app
self-hosts via fontsource at stage DP-0 — no runtime Google Font requests in product code.

**G. Supersession recorded.** This adoption makes `docs/design programme/` (Design Direction
and Components; the two Concepts bundles; the approved Home re-cut prototype
`euro28-home-recut-prototype-PROPOSED.html`; the approved Dark Theme Palette) the binding
visual authority. It supersedes (i) the Design Charter's *visual direction* — the Charter's
non-visual rules (line caps, CSS Modules requirement, component discipline, dependency
direction, WCAG enforcement mechanism, completion terminology) remain live — and (ii) the
Night Broadcast direction/contract set. The 21 live `docs/reference-prototypes/` files keep
their content/interaction contracts binding until each page's re-cut is approved; only their
visual treatment is superseded. The design programme is registered in
`AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md` per the current tree's governance; item 69's
documentation-constitution sweep (Mac-stranded) re-homes this registration under the
constitution when it syncs.

*Contract-wins list (from the prior verification — the contract wins where a concept omits it):*

- **CW1** — Home Leaderboards card deep-links into both competitions.
- **CW2** — Review is the tournament-picks entry surface (Top Scorer entered there).
- **CW3** — Points Breakdown itemises ALL point sources.
- **CW4** — Match Centre keeps its personal bracket-impact helper.
- **CW5** — Navigation State 2 (early KO access via More) is preserved.
- **CW6** — Guest mode per ruling E above is a contract-level requirement carried into every
  re-cut.

**Stage CONTRACTS-PROTOTYPE-V2-INSTALL** is accepted as a docs-only supersession of four approved visual contracts. `docs/reference-prototypes/euro28-home-page-prototype-v2.html`, `euro28-groups-page-prototype-v2.html`, `euro28-ko-predictor-prototype-v2.html` and `euro28-bracket-page-prototype-v2.html` are now the binding visual contracts for Home, Groups, KO Predictor and the Original Bracket, replacing their v1 predecessors. The v1 files are retained, not deleted, renamed with a `-v1-superseded` suffix: `euro28-home-page-prototype-v1-superseded.html`, `euro28-groups-page-prototype-v1-superseded.html`, `euro28-bracket-page-prototype-v1-superseded.html` and `euro28-ko-predictor-contract-v1-superseded.html`. Note the KO Predictor v1 contract was named `euro28-ko-predictor-contract.html`, not `-prototype.html`.

Recorded contract changes. **Home v2:** a single countdown replaces the twin countdown grid because the prediction lock IS the first kick-off; the featured match card adopts the Groups card language; every match card taps through to Match Centre; content and order are state-dependent across pre-tournament, matchday-live and post-match; a small "How scoring works" link appears pre-tournament only. **Groups v2:** the hero, watermark and banner are removed in favour of a compact strip carrying the view toggle, joker count with the new playing-card icon, and progress; cards carry date, time, stadium and host flag; the predicted group table and third-place table are always reachable as collapsible sections; a "Continue to your bracket" flow CTA is added; in-tournament cards show the real score against the player's pick with points chips. **KO Predictor v2:** it adopts the same card language as Groups with score inputs labelled "90 mins"; a 90-minute draw expands the same card inline to capture Extra time or Penalties and then the advancing team; a one-time dismissible notice states that KO Predictor is a separate competition whose points do not combine; a round rail replaces by-group and by-date switching; there is no completion flow, and each round shows pending-fixture placeholders instead. **Bracket v2:** mobile defaults to portrait stacked pick-a-winner cards using the same card language with tap-to-pick and no score inputs or jokers; a reversible "View as wall chart" opt-in is available in mobile landscape and the wall chart remains native on desktop and tablet; the Locked state gains Bracket and Health sub-tabs which carry forward the existing approved Bracket Health contract (On your path, Alive on a different path, Route conflict, Out, plus the points-still-available strip); the predicted bracket remains strictly separate from live results.

This stage is docs-only and makes no `src/`, `supabase/`, test, audit-script, scoring, resolver, Auth, service-role, fake-result-write or migration change. Original Predictor and KO Predictor remain separate competitions and predicted/live bracket contexts must never blend. No implementation of any of the four pages is authorised here; each surface is separate, later work. It introduces no migration change; active migrations remain 21 and Migration 020 is applied. Active migrations remain 21 and Migration 020 is applied at the current head, corrected from the stale count of 19 that predated `202607080020_euro28_matches_venue_fk.sql`.

Follow-up closed: the three reference-adoption audits — `scripts/check-stage13g-reference-adoption.mjs`, `scripts/check-stage13g-groups-bracket-reference-adoption.mjs` and `scripts/check-stage13g-bracket-reference-adoption.mjs` — were repointed at the v2 contract files with rewritten v2 marker lists in commit `0889c72` ("Point stage13g reference audits at the v2 contracts") and pass. This record previously said they "now fail"; that was true only until that commit and is corrected here.

**Stage STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET** is accepted as the Original Bracket G live adoption slice under `STAGE-CORE-PAGE-ADOPTION-1`. The live Original Bracket now carries the approved native wall-chart markers, preserves stacked mobile and the ≥900px converging desktop wall chart, keeps outside-edge Round of 16 columns and a centred final, and remains winner-only with no scores, methods or bracket jokers. KO Predictor remains the separate real-fixture competition. This stage makes no scoring, resolver, Supabase write, Auth, service-role, fake-result, league-write or migration change; active migrations remain 21 and Migration 019 is applied.

**Stage STAGE-PLAYER-FACING-COPY-SWEEP-2** is accepted before Original Bracket 1B. It broadens the Groups copy repair into a player-facing language sweep across active public app roots, replacing internal/spec-style wording with plain help copy while preserving the Original/KO separation. A new audit gate is wired into `npm run check`. No scoring, resolver, Supabase write, Auth, service-role, fake-result, league-write or migration change is introduced; active migrations remain 21 and Migration 019 is applied.

# EURO 2028 PREDICTOR
## Consolidated Decision Register and Build Roadmap
### Version 4.15 — Design programme adopted as binding visual authority (2026-07-10 owner rulings)

> **Authority:** This is the product decision authority for the Euro 2028 Predictor. The Design Charter governs visual behaviour. The Agent Rules govern build process. Where they conflict, this register wins on product rules.

**Stage STAGE-CORE-PAGE-ADOPTION-1A-GROUPS-COPY-REPAIR** is accepted as a focused repair after the Groups Night Broadcast slice. It removes internal lifecycle/config/save-contract wording from the live Groups/Prediction Journey UI and replaces it with player-facing autosave, lock, joker and tables wording. The Groups audit and shared-primitives audit now enforce that terms such as `central provisional Euro 2028 lock configuration`, `irreversible tournament lock`, `euro28-prediction-journey-v3` and `atomic saving` do not appear on the live Groups journey. This is a copy/audit/docs repair only with no scoring, resolver, Supabase write, Auth, service-role, fake-result, league-write or migration change; active migrations remain 21 and Migration 019 is applied.

**Stage STAGE-CORE-PAGE-ADOPTION-1A-GROUPS** implements the first Groups slice under `STAGE-CORE-PAGE-ADOPTION-1`. The live Groups surface now adopts the approved Night Broadcast visual language natively, exposes guardrail chips for privacy/tables/jokers, and surfaces the shared predicted-tables and third-place components in the by-group flow while preserving the existing by-group/by-date switcher and sticky Tables path. This does not close the full STAGE-CORE-PAGE-ADOPTION-1 row: Original Bracket G and KO Predictor F remain pending. It makes no scoring, resolver, Supabase write, Auth, service-role, fake-result, league-write or migration change; active migrations remain 21 and Migration 019 is applied.

**Stage SCHEDULE-CORE-PAGE-CONTRACT-ADOPTION-1** is accepted as a docs-only sequencing fix. It inserts `STAGE-CORE-PAGE-ADOPTION-1` and `STAGE-CORE-PAGE-ADOPTION-2` into the v9+ order so the approved Groups, Original Bracket, KO Predictor, Results and Leaderboards visual contracts cannot silently remain unbuilt. It also hardens `STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1` so every approved visual contract in `docs/reference-prototypes/` must be implemented on its live surface or explicitly deferred with a recorded reason and owner before readiness can be accepted. The current countable inventory is 20 approved HTML contracts. This stage is docs-only and makes no `src/`, `supabase/`, test, audit, reference-prototype, scoring, resolver, Auth, service-role, fake-result-write or migration change; active migrations remain 21 and Migration 019 is applied.

**Stage CONTRACTS-REF-LOCKED-SURFACES-3** records the v9 locked design and planning package into live repo docs. It installs the approved reference contracts for Results, Leaderboards, Offline Player Claim, Bracket Health, Team Profile Sheet and Shared States into `docs/reference-prototypes/`, preserves the archived v9 pack under `docs/design-workshop/locked-design-docs-v9/`, and records the streamlined remaining batch order. Bracket Health is now approved only as the Health tab inside the Bracket page, not as a standalone bottom-nav item. This package is docs/reference-only: no `src/`, `supabase/`, test, migration, scoring, resolver, Auth, official-result-entry or fake-result-write implementation is included; active migrations remain 21 and Migration 019 is applied. Original Predictor and KO Predictor remain separate, predicted/live brackets never blend, and WC26 production remains fail-closed.

**Stage DESIGN-CONTRACTS-APPROVAL-1** records the approved visual contracts for Groups, Leagues / League table D, Original Bracket G and KO Predictor F. `docs/reference-prototypes/euro28-groups-page-prototype.html` remains the approved Groups Night Broadcast identity anchor. `docs/reference-prototypes/euro28-league-page-prototype.html` is the approved League table D contract. `docs/reference-prototypes/euro28-bracket-page-prototype.html` is the approved Bracket G contract with the proper desktop wall chart, outside-edge Round of 16 columns, inward quarter-final/semi-final progression, centred final, slick `vs`, and date/time/stadium/host-flag match detail. `docs/reference-prototypes/euro28-ko-predictor-contract.html` is the approved KO Predictor F contract, with pending teams before real fixtures and playable real fixtures once ready. Bracket Health is now separately approved only as the Health tab inside the Bracket page and must not be implemented as a standalone bottom-nav destination. This package is docs/reference/audit-only with no `src/`, `supabase/`, test or migration change, no route/scoring/resolver/Auth/signup change, no Supabase write, no service-role credential use/read/print, active migrations remain 21 and Migration 019 is applied. Original Predictor and KO Predictor remain separate, and predicted/live bracket contexts must never blend.

**Stage DESIGN-CONTRACTS-BATCH-0** records the visual-contract rule for the all-main-pages design drafting programme. Approved self-contained HTML files in `docs/reference-prototypes/` become binding visual contracts for layout, hierarchy, composition, state coverage and Night Broadcast identity treatment, but remain reference artefacts only and must be rebuilt natively in the Euro design system. Candidate batches must stop for Nicky approval; after approval, one contract per surface supersedes older references rather than accumulating alternatives. Functional decisions remain sacred: visual contracts cannot invent behaviours, scoring rules, routes, resolver logic, data reads/writes, signup state, Auth settings or moderation powers. Groups is already approved as the Night Broadcast identity anchor and must not be redrafted unless explicitly reopened. Batch 1 is Bracket plus KO Predictor; Admin remains last. This package is docs/reference-only with no `src/`, `supabase/`, test or migration change, no product-code change, no Supabase writes, no service-role credential use/read/print, no scoring/resolver/route/Auth/signup change, active migrations remain 21 and Migration 019 is applied. Original Predictor and KO Predictor remain separate, and predicted/live bracket contexts must never blend.

**Stage OWNER-SIGNUP-DECISIONS-1** records the remaining owner decisions for public signup readiness. Support uses generic Contact admin wording rather than publishing a personal address by default. Initial pre-SMTP capacity is 50 users and 20 leagues, with a post-SMTP target of 100 users and 20 leagues after email delivery is reviewed. Hosting/account-email planning is against the current low-cost/free setup, with hosting, Supabase Auth and email limits reviewed before any capacity increase. Email confirmation is ON for public registration. Privacy wording covers account, display name, league membership, predictions, scores and support/deletion request information, with no specific data-region claim until the actual project region is confirmed. Moderation must block racist, discriminatory, anti-immigrant, sectarian, abusive and inflammatory display names and league names, including the owner-provided example “stop the boats”. Public registration does not stay invite-only once moderation and remaining safety checks are complete, but public registration remains closed until those later implementation gates are accepted. This package is model/test/docs/audit-only: no signup flow is opened, no Auth configuration is changed, no Supabase writes, no Auth users, no prediction seeding, no service-role credential use/read/print, no scoring/resolver changes, no route change and no migration. Original Predictor and KO Predictor remain separate, active migrations remain 21 and Migration 019 is applied.

**Stage PUBLIC-SIGNUP-READINESS-1** centralises the current wider-public-registration answer in `src/auth/publicSignupReadiness.js`. The Rules Hub now consumes that model for its public-signup gate panel, and tests/audit prove public signups remain closed. Stage OWNER-SIGNUP-DECISIONS-1 now records the owner choices for support contact, capacity and tiers, email confirmation, privacy region, name moderation and registration mode, but public registration remains closed until later implementation gates are accepted. It is model/test/docs/audit-only with no Supabase writes, no Auth users, no prediction seeding, no service-role credential use/read/print, no scoring/resolver changes, no route change and no migration. Active migrations remain 21 and Migration 019 is applied.

**Stage RULES-1B-SIGNUP-GATE-STATUS** makes the unresolved public-signup gates visible on the `#/how-to-play` Rules Hub. The panel lists support contact, capacity and tiers, email confirmation, privacy region and name moderation as still-open owner/implementation gates. It deliberately does not open wide signups or invent owner choices: no support address, capacity number, Supabase/Netlify tier, auth-email budget, email-confirmation setting, data region or blocked-word list is selected. This package is UI/model/docs/audit-only with no Supabase writes, no Auth users, no prediction seeding, no service-role credential use/read/print, no scoring/resolver changes, no new route and no migration. Original Predictor and KO Predictor remain separate, active migrations remain 21 and Migration 019 is applied.

## 1. Current return point

- Expected Git commit before this scope package: `8ee70ec` — **Compact Stage 13G league shell**.
- Active branch: `euro28-development`; `main` remains protected WC26.
- Active migration count: **21**, aligned locally and on Euro staging (Migration 019 pushed to staging on 2026-07-07 after a verified backup; backfill and new function signatures verified read-only against the live schema).
- Stages 1–12, 13A–13E, 14, 14B, Stage 13F, Stage 13G-R0, Stage 13G-A, Stage 13G-B lifecycle slices, Stage 13G-C league simplification through C6 and Stage 13G destination reference adoption are accepted at the package level recorded in the ledger.
- Stage 16A-S0 is a scope-alignment package before implementation. No component, resolver, scoring, route, database or migration implementation is included.
- Migration 018 remains the latest active migration. Migration 019 has not been created.
- Original and KO Predictor totals remain permanently separate.

## 1A. Current package note

**Stage PRODUCT-GATE-DECISIONS-1** records the next product-completeness decision rows for tie-break ladders, display-name and league-name moderation, capacity planning and email confirmation. Later Stage OWNER-SIGNUP-DECISIONS-1 closes the signup owner-decision part by recording the exact signup support, capacity, hosting/email planning, email-confirmation, privacy, moderation and invite-only choices; tie-break and moderation implementation remain later scoped stages. This package is docs/audit-only: no Supabase writes, no Auth users, no prediction seeding, no service-role credential use/read/print, no scoring/resolver/route changes and no migration. Original Predictor and KO Predictor remain separate, active migrations remain 21 and Migration 019 is applied.

**Product completeness register alignment** remains accepted as the prior scale-gate package. It records RULES-1 as a signup gate, records moderation, scalable support, capacity planning, email confirmation, privacy/deletion, load reality-check and uptime/error monitoring gates, and keeps owner choices explicit where values are not yet selected.

**Stage 16A-P6A Seed write acceptance plan only** remains accepted as the prior no-write acceptance-plan checkpoint.

**Stage 16A-P5 Staging write preflight and teardown contract** remains accepted as the prior no-write preflight checkpoint.

**Stage 16A-P4 Seed SQL preview dry-run** remains accepted as the prior read-only SELECT preview package.

**Stage 16A-P3 seed manifest dry-run** records the local manifest dry-run before any staging write path exists. It plans 24 provisional team slots, 19 synthetic personas, 11 resettable time-phase cases, three league shapes, correction marker and dual-marker teardown selectors. It creates no seeded data, requires no service-role credentials, changes no product component, scoring rule, resolver or route, and keeps active migrations remain 21 and Migration 019 is applied.


## 2D. Stage PUBLIC-SIGNUP-READINESS-1 — Public signup readiness model

Stage PUBLIC-SIGNUP-READINESS-1 records a central application model for the current wider public-signup state. The current state is not open: support contact, capacity and tiers, email confirmation, privacy region and name moderation remain open gates. The Rules Hub consumes the same model, so the visible signup-gate panel and the app readiness answer cannot drift apart.

No owner choice is invented in this stage. It does not change Auth settings, open signups, close signups, create users, seed predictions, use service-role credentials, change scoring, change resolver behaviour, add a route or create a migration.

## 2. Existing confirmed product decisions

| Subject | Confirmed position |
|---|---|
| Original Predictor | 36 group-score predictions plus one winner-only pre-tournament bracket |
| KO Predictor | A separate competition using the 15 real knockout fixtures |
| Points separation | Original Predictor and KO Predictor totals never combine, including in private leagues |
| Original bracket | Winner-only; no score, method or joker controls |
| KO match score | The 90-minute score, including added time |
| KO advancement | Advancing team is predicted separately from the 90-minute score |
| KO decision method | Normal time, extra time or penalties is predicted separately |
| Penalty shoot-out score | Never predicted for points |
| Original jokers | Five group-stage jokers and no bracket jokers |
| KO jokers | Five separate KO Predictor jokers |
| Joker multiplier | 2× (doubles that match's score points only — group and KO Predictor matches; never positions, bonuses or the Original Bracket), through the versioned central scoring ruleset. Recorded 2026-07-10 (Stage DESIGN-PROGRAMME-ADOPTION-1); previously provisional. |
| Prediction save | One atomic full-bundle save |
| Submit | Reversible review state; saved but unsubmitted predictions still count |
| Global lock | Prediction content locks at the first tournament kick-off |
| Grace | One user, one competition and one unstarted match only |
| Original prediction visibility | Private until the global lock |
| KO prediction visibility | Match by match after the real fixture starts |
| Guest mode | Browser-only and unscored |
| Bracket resolver | One canonical resolver for guest, predicted and live contexts |
| Live vs predicted | Never blended in data or presentation |
| Best-third allocation | One matrix and one resolver; all 15 combinations tested |
| Results | Manual results are authoritative; one current result plus append-only revisions |
| Scoring correction | Replacement recalculation, never additive duplication |
| Admin security | Service-managed; browser self-grant is blocked |
| Direct writes | No direct browser writes to protected tables |
| External results API | Deferred; manual operation remains authoritative and the fallback |
| App name | **Euro 2028 Predictor** |
| Extra tournament picks | **SUPERSEDED 2026-07-10 — see the locked contract and Stage DESIGN-PROGRAMME-ADOPTION-1.** The live rule: Original Predictor only — group-goals total (tiered 25/15/5, auto-calculated) and Top Scorer (30, entered on Review); global lock; no joker; no KO points; Top Scorer ties pay full 30 to any picker of a tied winner. Highest-Scoring Team is dropped and does not exist. The old "20 points each" and highest-scoring-team wording is dead. |

## 2A. Product completeness gates for wider Euro 2028 scale

Euro 2028 is now planned as a larger semi-public predictor rather than only a friends-and-family league. The consolidated product completeness roadmap is recorded in `docs/PRODUCT-COMPLETENESS-ROADMAP.md`; the following entries are binding gates until superseded by a later owner decision.

### Signup gates

These items must be complete before registration is opened beyond the trusted WC26-style group:

| Gate | Decision | Owning follow-on |
|---|---|---|
| RULES-1 | Required. Public rules/trust page must render scoring from central config/constants where practical and must publish tie-breaks, correction policy, support contact, privacy note and deletion path. | Stage RULES-1 |
| Display-name and league-name moderation | Required. Minimum viable policy is admin rename power for any player/league, a small blocked-word check at registration and league creation, and published wording that inappropriate names may be changed. | Moderation signup gate |
| Support channel | Required. A dedicated scalable support contact is enough, but the exact channel/address is an owner decision and must be recorded before RULES-1 closes. | RULES-1 contact line |
| Capacity planning | Required. Planning range is 650–1,300 users, reflecting 10–20× WC26. The exact planning number, Supabase/Netlify tier and auth email budget remain owner decisions before wide signups. | Capacity decision register row |
| Email confirmation | Required decision before wide signups. Recommendation is ON for stranger-scale registration, but the final on/off choice must be recorded. | Signup auth policy row |
| Privacy note and deletion path | Required. The public note must state stored data, hosting/Supabase data region once confirmed, and how to request deletion. | RULES-1 privacy section |

### Tournament gates

These items must be complete before the first Euro 2028 match:

| Gate | Decision | Owning follow-on |
|---|---|---|
| Tie-break ladders | Required. Final standings and leaderboard tie-break ladders must be published and resolver-backed before scoring matters. | Tie-break/final standings stage |
| Load reality-check | Required. Stage 16A seeded data must exercise the owner-selected planning number against leaderboards, Match Centre and league pages; pagination/performance work must be scoped if large tables are slow. | Stage 16A load rehearsal |
| Uptime and error monitoring | Required. UptimeRobot or equivalent plus real error reporting must reach the owner before matchday one. | Operations/observability gate |

### Scheduled, not launch-blocking

The offline player lifecycle and growth mechanics remain scheduled. They are important, but they do not block the first wider-signup gate unless a later decision moves them. Unknown-route fallback is closed by Stage PRODUCT-UNKNOWN-ROUTE-1.

## 2B. Stage PRODUCT-UNKNOWN-ROUTE-1 — Unknown route fallback

Unknown app hashes such as `#/not-a-route` now render a friendly recovery surface instead of silently falling through to Home. The fallback tells the user that the requested screen is not available, confirms predictions have not been changed, and offers direct safe actions to Home, Groups and How to play. Invalid Admin sections remain protected Admin-route recovery and continue to resolve to the Admin overview section.

This slice is UI/test/docs/audit only: no Supabase writes, no Auth users, no prediction seeding, no service-role credential use/read/print, no scoring change, no resolver change and no migration. Active migrations remain 21 and Migration 019 is applied.

## 2C. Stage PRODUCT-GATE-DECISIONS-1 — Product gate decisions register

This stage records the next signup and tournament decision rows without pretending they are implemented or owner-approved. No owner choice is invented. The current planning range remains 650–1,300 users, but the exact capacity number, Supabase tier, Netlify tier and auth-email budget still require an owner decision before wide signups. Email confirmation remains a required owner decision before wide signups, with the recommendation still ON for stranger-scale registration. Display-name and league-name moderation remains a required signup gate, with implementation deferred to a later moderation stage. Tie-break ladders remain a required tournament gate, with resolver-backed implementation deferred to a later tie-break implementation stage.

This package is docs/audit-only. It introduces no Supabase writes, Auth users, prediction seeding, service-role credential use/read/print, scoring change, resolver change, UI route change or database migration. Active migrations remain 21 and Migration 019 is applied.

## 3. Scoring model

> **SUPERSEDED — do not use the values below.** The dead 30/10 match values, the flat-20
> tournament picks and Highest-Scoring Team are retired. This section was already superseded by
> Stage STAGE-RULES-SCORING-LOCK-1 and is re-flagged on 2026-07-10 by Stage
> DESIGN-PROGRAMME-ADOPTION-1. The single scoring authority is
> `docs/RULES-SCORING-LOCKED-CONTRACT.md`. The live values are summarised immediately below;
> the original prose is retained struck-through-in-spirit for provenance only and must not be
> pinned, quoted or implemented.

**Live scoring (authority: `docs/RULES-SCORING-LOCKED-CONTRACT.md`):** group match 5 exact /
3 correct result; group position 2 per team, +5 perfect-group bonus; Original Bracket team
progression R16 8 / QF 12 / SF 15 / Final 20 / Champion +25; group-goals total tiered 25 / 15
/ 5 (exact / within 5 / within 10), auto-calculated; Top Scorer 30, entered on Review. KO
Predictor: 90-minute score 10, advancing team 5, method +3 (requires correct advancing team),
first-goal bracket +3 (provisional/API). A joker doubles that match's score points only (group
and KO Predictor matches; never positions, bonuses or the Original Bracket). Highest-Scoring
Team does not exist.

*Retired prose (provenance only — values dead, do not use):*

- ~~Original Predictor — exact group score 30; correct group outcome 10.~~
- ~~KO Predictor — exact 90-minute score 30; correct 90-minute outcome 10; advancing team 10; decision method 5.~~
- ~~Extra tournament picks — total tournament goals 20; top scorer 20; highest-scoring team 20.~~
- Original bracket points accrue by a predicted team reaching each defined milestone (still true).
- Central versioning still holds: live values remain central, versioned and never duplicated into page components.
- The official player selector still activates only in Stage 17A.

## 4. Confirmed five-position mobile navigation

The mobile navigation has five fixed positions with Home centred and slightly larger. The Bracket destination is permanent. Position 1 changes from Groups to KO only at the confirmed readiness boundary in Section 6.

### State 1 — group stage active, no display-ready Round of 16 fixture

1. **Groups**
2. **Bracket**
3. **Home**
4. **Leagues**
5. **More**

KO Predictor is not shown in the primary navigation. More contains a deliberate explainer teaser, but the active KO workspace, unresolved fixtures and prediction controls remain unavailable until at least one Round of 16 fixture is display-ready.

### State 2 — early KO access while Groups remains primary

The five primary positions remain:

1. **Groups**
2. **Bracket**
3. **Home**
4. **Leagues**
5. **More**

Once at least one Round of 16 fixture has both participant slots resolved, **KO Predictor** becomes reachable from More. During this early-access state:

- only fixtures with both teams resolved are shown;
- any fixture containing an unresolved or TBC participant is hidden rather than shown as an empty prediction card;
- Groups remains Position 1 even if several knockout fixtures have already populated;
- the original Bracket remains Position 2.

### State 3 — KO becomes the primary Position 1 destination

The main navigation changes only when every condition in Section 6 is satisfied:

1. **KO**
2. **Bracket**
3. **Home**
4. **Leagues**
5. **More**

At this point Groups moves to More under **Group stage review** and remains permanently reachable.

### Binding navigation rules

- Position 1 begins as **Groups** and becomes **KO** only at the confirmed readiness boundary in Section 6.
- Position 2 is permanently **Bracket** and always opens the user's original pre-tournament bracket.
- The Bracket destination never changes, because the original bracket remains important after the group stage as real results score progression points against it.
- Before early access, More may explain KO Predictor without exposing the workspace. Early active access is through More only and never displaces Groups before the full switch.
- A knockout fixture is display-ready only when both participant slots are resolved. TBC or partially resolved fixtures are hidden from the early KO list.
- When Position 1 becomes KO, group-stage access moves to More under **Group stage review** and remains permanently reachable.
- The switching tab's label, icon and destination change together.
- The switch is driven by central competition phase/readiness and canonical resolver state, never by a hardcoded calendar date in a component.
- Dedicated route tests must cover every state and the exact transition boundary.
- Desktop navigation must preserve the same product distinction: the original Bracket remains permanent, early KO access may appear in a secondary destination, and Groups is replaced in the primary set only after the confirmed trigger.

## 5. Stage 13A v4 audit verdict — CONFIRMED

**Verdict: superseded; regenerate as Stage 13A v6.**

The generated v4 shell does not comply with the navigation decision above:

- It keeps Groups permanently in Position 1.
- It uses a phase-aware Position 2 that changes from Bracket to KO.
- Its route test explicitly asserts that Bracket becomes KO when `knockoutOpen` is true.

Nothing from v4 has been installed, so there is no rollback or repair migration. Stage 13A v6 should reuse v4's compliant work—semantic blue tokens, light/dark themes, Lucide, typography, accessible shell, Home dashboard and failure states—but reverse only the phase-aware navigation model and update its tests and documents.

## 6. Groups→KO trigger and early-access lifecycle — CONFIRMED

**Selected decision: Option B, with an early-access phase through More.**

The main Position 1 tab changes from Groups to KO only when all of the following are true:

1. all 36 group matches have authoritative completed results;
2. final group standings are confirmed;
3. the canonical resolver has populated both participant slots for all eight Round of 16 fixtures; and
4. there are no unresolved best-third allocation or bracket-resolution errors.

This is the validated Round of 16 readiness boundary. The switch must not occur merely because some knockout teams have become known, and it must never use a hardcoded date or elapsed-time check.

### Early KO access before the main switch

Before the full readiness boundary, More carries a non-interactive KO explainer. The active KO Predictor becomes reachable from More as soon as at least one Round of 16 fixture is display-ready.

A fixture is display-ready only when both teams are resolved. During early access:

- show only complete, real Round of 16 pairings;
- hide every TBC, partially resolved or unresolved fixture;
- keep Groups in Position 1;
- keep Bracket permanently in Position 2; and
- do not present an empty KO destination when no complete fixture is available; the earlier More entry remains an explainer only.

### After the main switch

When all four readiness conditions are satisfied:

- Position 1 changes from Groups to KO;
- the tab label, icon and destination change together;
- Groups moves into More as **Group stage review**;
- Group stage review remains permanently available; and
- Bracket remains a separate permanent destination.

### Required acceptance tests

1. During the group stage with no complete Round of 16 pairing, Position 1 is Groups; More shows only the KO explainer and cannot open active prediction controls.
2. When at least one Round of 16 pairing is complete but the full Round of 16 is not ready, Position 1 remains Groups, More exposes KO Predictor, and only complete fixtures are rendered.
3. When all group matches are complete but one or more Round of 16 fixtures remain unresolved, Position 1 still remains Groups.
4. At the exact moment all 36 group results, final standings and all eight Round of 16 pairings are valid, Position 1 changes to KO.
5. The switching tab's label, icon and route change atomically.
6. Bracket remains permanent in every state.
7. Group stage review appears in More after the switch and remains reachable.
8. No navigation decision depends on a component-level calendar date.

**Register status:** confirmed by Nicky.

## 7. Team Profile Sheet — CONFIRMED FUTURE STAGE

A dedicated **Stage 13E — Team Profile Sheet** is added immediately after Stage 13D.

### Interaction and architecture

- A profile opens by deliberately tapping the team identity—flag or team name—inside the single shared `<TeamLabel>` primitive.
- It appears as a bottom sheet, not a separate page.
- The five-position navigation does not change.
- The behaviour is implemented once in `<TeamLabel>` so it works consistently in fixtures, group tables, brackets and any other approved team display.
- Score inputs, joker controls and the surrounding match card must never open the profile.
- A dedicated interaction test must prove that prediction-entry controls cannot accidentally trigger it.

### Allowed data sources — exactly three

1. **Curated static data**
   - Ranking.
   - Qualifying route.
   - Best Euro finish.
   - Short editorial note.
   - Entered manually when teams are confirmed.
   - Stored centrally and editable through authorised admin controls.
   - Never hardcoded into components.

2. **App-owned tournament data**
   - Tournament results so far.
   - Current group position.
   - Next fixture.
   - Read only from the application's own tournament, result and standings data.

3. **Prediction aggregates**
   - Percentage predicting the team to win its group.
   - Percentage predicting the team to reach each knockout milestone.
   - The viewing user's own relevant prediction.

### Binding privacy and reliability rules

- Prediction aggregates are hidden before the global prediction lock.
- Pre-lock access to a team profile must not reveal aggregate prediction information through UI, RPC, API response or browser-readable table access.
- The post-lock aggregate gate requires dedicated tests.
- No external football-data API, scheduled third-party sync or recent-form feed may be used anywhere in this feature.
- In-tournament form is derived only from app-owned results.
- Loading, empty, error and partial-failure states are required.
- The profile uses charter tokens, works in both themes and belongs to the shared design system.
- One clearly labelled provisional sample team remains sufficient for early component tests only; Stage 16A replaces that narrow fixture with the full guarded 24-team provisional dataset.

## 8. Stage 16A seeded acceptance cast — CONFIRMED

Stage 16 opens with **Stage 16A — Provisional teams, synthetic users and deterministic scenario seeding** against Euro staging project `gcfdwobpnanjchcnvdco` only. The blocked WC26 production project `ouhxawizadnwrhrjppld` must always fail closed.

**Stage 16A-S0 — Stage 16A scope alignment** locks the launch gates before implementation. It records 16A-P1 privacy-safe synthetic identity plumbing, 16A-P2 staging-effective database time and the later data-seeding implementation slices. No component, resolver, scoring, route, database or migration implementation is included. Scope alignment is documentation/audit only; active migrations remain 21 and Migration 019 is applied.

### 8.1 Provisional teams

- `data/provisional-teams.json` contains exactly 24 teams: five hosts and nineteen likely qualifiers.
- Every row stores name, ISO code, group letter and `provisional: true`.
- `scripts/seed-provisional-teams.mjs` is guarded, idempotent and staging-only.
- Replace/confirm mode later applies the real 24 with `provisional: false`.
- Existing `TeamLabel` data-flag presentation remains the only provisional-team treatment.
- Stage 17 fails acceptance if confirmed-team replacement requires component or resolver changes.

### 8.2 Approved synthetic persona catalogue

| Key | Display name | Deterministic purpose |
|---|---|---|
| `exact_score_heavy` | Ada Exact | Exact on a fixed majority; correct-outcome non-exacts elsewhere. |
| `outcome_only` | Owen Outcome | Correct outcome on every eligible match, never exact. |
| `all_wrong` | Willa Wrong | Reverses every non-draw and converts every draw to a non-draw. |
| `partial_predictions` | Priya Partial | Fixed incomplete Original bracket/group and KO subsets. |
| `no_predictions` | Noah Empty | Valid account and profile with no prediction set. |
| `submitted_complete` | Sam Submitted | Complete deterministic baseline with submitted state. |
| `unsubmitted_identical` | Dana Draft | Byte-identical predictions to Sam, unsubmitted, and must score identically. |
| `joker_cap_reached` | Max Jokers | Exactly five group and five KO jokers; no sixth joker. |
| `zero_jokers` | Zoe Zero | Same control predictions as Max with no jokers. |
| `engineered_tie_a` | Taylor Tie | Fixed source mix engineered to the approved tie total. |
| `engineered_tie_b` | Morgan Tie | Different source mix reaching the same tie total. |
| `bracket_survives_deep` | Bea Bracket | Original bracket path survives to late milestones. |
| `bracket_dead_early` | Drew Deadend | Key Original bracket selections fail at the earliest stages. |
| `ko_only` | Kai Knockout | Complete KO entry and no Original entry. |
| `original_only` | Olivia Original | Complete Original entry and no KO entry. |
| `ko_advancing_only` | Alex Advance | Wrong 90-minute score, correct advancing team, wrong method. |
| `ko_method_variant` | Maya Method | Wrong 90-minute score, correct advancing team and method. |
| `ko_joker_variant` | Jules Double | KO control predictions with exactly five valid KO jokers. |
| `correction_sensitive` | Casey Correction | Known pre/post-correction totals proving replacement scoring. |

### 8.3 Synthetic identity, predictions and leagues

- `data/synthetic-personas.json` stores each persona's name, purpose and deterministic rules.
- Users are created through the Supabase Admin API using a local service credential that is never committed or printed.
- Every synthetic account requires both an `@synthetic.euro28.test` address and `synthetic_euro28: true` metadata.
- Expected points are precomputed independently for every Time & Phase preset and compared with canonical database output.
- The oracle must not import frontend scoring helpers or database scoring functions.
- Seed one large league of approximately fourteen members, one tiny league of two or three, one user in multiple leagues and at least one user in none.
- Membership supports both competition standings while Original and KO totals remain separate.

### 8.4 Exact teardown

- `scripts/remove-synthetic-data.mjs` deletes exactly and only accounts carrying both reserved markers.
- Cascaded predictions, scores and memberships are removed; provisional-team removal is optional.
- Real accounts, real administrators, tournament configuration and staging controls remain untouched.
- Seed → teardown → zero-residue assertion → reseed must be clean and repeatable.

### 8.5 Approved preconditions

Two genuine gaps are approved for separate guarded packages before Stage 16A execution:

1. privacy-safe synthetic identity plumbing: authorised reads expose only `is_synthetic`, and the shared identity primitive renders a subtle badge;
2. staging-effective database time: provisional Euro staging may exercise privacy/lock phases without mutating the irreversible real global lock.

Neither precondition may expose email/raw auth metadata, change scoring, alter the resolver or affect production/non-provisional tournament time.

### 8.6 Acceptance

- The full app is populated end to end across leaderboards, leagues, H2H, Match Centre, Bracket Health, profiles and player insight.
- Persona expected-points assertions pass at every phase, including post-correction recalculation.
- Deferred Stage 13D multi-user acceptance rows move only with recorded evidence.
- Teardown and clean reseed are demonstrated.
- The real irreversible global lock is never triggered on shared staging.

## 9. Staging admin access for product-owner testing — CONFIRMED

A documented, explicit service-side procedure will grant Nicky's staging account admin access for testing.

### Binding rules

- Browser self-grant remains blocked.
- The procedure uses an authorised service-side or direct controlled database operation only.
- It records the named account, who authorised the grant, when it was applied and how to revoke it.
- No account is granted admin silently or as a side effect of registration.
- The procedure includes grant, verification, test and revocation steps.
- It never prints or embeds a service-role key or other secret.
- It applies to Euro staging only and must refuse any other project reference.

### Roadmap placement

**OB-3 — Staging admin test access** is implemented after `9232d57`. It provides a local SQL generator plus a reviewed Euro staging SQL Editor procedure for grant, read-only verification and revocation. The explicit `owner` grant must be applied and verified before Stage 13 admin-screen visual acceptance, so the product owner can exercise authorised controls as the Stage 13 batches land.

## 10. Optional Google sign-in — CONFIRMED ROADMAP ITEM

Google sign-in is an optional late-stage addition through Supabase OAuth.

- It does not alter the existing authentication foundation during Stage 13.
- It is scheduled after real teams and final tournament configuration are in place, but before invitations are sent.
- Existing email/password accounts must retain access to the same profile, predictions, leagues and admin status.
- Enabling Google sign-in must not create duplicate profiles or orphan existing prediction data.
- A dedicated regression test must prove that existing email/password sign-in remains unaffected.
- OAuth configuration, redirect URLs, account-linking behaviour, failure handling and rollback must be documented before it is enabled.
- The feature remains optional and may be omitted without blocking go-live.

Roadmap placement: **Stage 18A — Optional Google sign-in**, before **Stage 18B — Optional results-provider integration**.


## 10A. 3 July 2026 functional-completion addendum

### Confirmed Decision 13 — Classic converging bracket and Share Card

The Original predicted bracket and the live bracket will each receive a classic converging wall-chart presentation: Round of 16 ties on the outer left and right, quarter-finals and semi-finals converging inward, and the final centred.

Binding constraints:

1. The feature is presentation-only. It is a second layout of the existing bracket destinations and must use the existing canonical resolver, existing slot references, the shared `<TeamLabel>` primitive in every team position and dashed placeholder chips for unresolved slots. It introduces no new bracket logic, data model, migration or change to any product invariant.
2. The converging layout applies only at the desktop/tablet breakpoint of `≥900px`. Phones retain the current vertical bracket using the same components and data in a different arrangement. The converging form must not be compressed onto phone widths.
3. The Original predicted bracket and the live bracket each receive the layout inside their own clearly bannered context. Predicted and live brackets remain separate and must never blend.
4. Implementation must follow all standing construction principles: shared primitives, semantic tokens only, enforced file-size limits, complete loading/empty/error/partial states, both themes and accessibility.

The Share Card decision is settled: the Share Card is the user’s completed bracket rendered from this converging wall-chart layout in the Euro 2028 Predictor identity as a shareable/downloadable image. It must work on every device, including phones, and is not a separate visual design or separate bracket implementation.

**Roadmap owner:** Stage 13P-A, the specialised converging-bracket/share-image batch after Stage 13F-K and every Stage 13G coherence batch have been accepted.

## 10B. Stage 13G information architecture and coherent UI pass — CONFIRMED

Stage 13G is one holistic coherence pass, not a collection of page-by-page fixes. The binding question is whether every capability is in the place a casual player expects and is presented through the same shared primitives and anatomy used everywhere else.

Confirmed decisions:

The Stage 13F-K1 database operations contract remains accepted and is the binding owner-only fixture, reconciliation, readiness and audit contract delivered by Migration 018.

1. The five-position mobile navigation remains Groups/KO, Bracket, Home, Leagues and More. No sixth position is added.
2. More is phase-aware and deliberately ordered. Before play it leads with Tournament & how to play; during live phases it leads with current competition needs. Admin is separated and authorised only.
3. Before a display-ready Round of 16 fixture, More may show a KO explainer teaser but not the active workspace, unresolved fixtures or prediction controls. Home gives KO at most modest secondary prominence.
4. Upcoming matches order by next real kick-off; completed results order most-recent-first. Match Centre previous/next follows chronology, not match number.
5. Group-stage fixtures support shared By group and By date presentations. By group is the pre-tournament default; By date is the live-tournament default; a manual choice is respected.
6. Tournament and How to Play are separate More/footer destinations. Tournament owns canonical football facts, hosts, venues, dates, format and provisional groups. How to Play owns predictor mechanics, competitions, scoring, locks, jokers and mechanics FAQ. Binding values and rules render from versioned contracts/configuration, never copied prose.
7. Every team name uses `TeamLabel`. Every player name uses one shared player identity activation primitive and opens one authorised overview containing predictions, permanent Original bracket, separate points stories and H2H.
8. League sharing uses a one-tap copy-link flow. Generic static Open Graph metadata is mandatory. Dynamic per-league title/description using a static Euro image is approved; dynamic image generation is rejected.
9. Inherited WC26 OG and icon assets are replaced with Euro identity assets. The deferred PWA manifest/service worker do not return before Stage 18C.
10. Scotland is the seeded reference Team Profile. Stage 13G-D proves curation through Admin and documents Stage 17 data entry for the remaining 23 teams.
11. Stage 13G is split into 13G-0 documents, 13G-A destinations/discovery, 13G-B tournament comprehension/chronology, 13G-C people/profiles/sharing and 13G-D seeded coherence.
12. Stage 13F-K completes first. Stage 16A supplies seeded acceptance data after 13G-C. Stage 13G-D and Stage 16A close in the same evidence window. Stage 13P-A begins only after Stage 13G acceptance.
13. Stage 13G-0 adds no migration. A narrow Stage 13G-C read contract for `is_synthetic` or invite-safe metadata must be proved and separately approved.

The full IA map, More ordering, hardwired-data evidence and batch contract live in `docs/archive/STAGE-13G-0-INFORMATION-ARCHITECTURE-AND-COHERENT-UI-SCOPE.md`.

## 10C. Stage 13F-K complete Admin operations backbone — CONFIRMED

Stage 13F-K completes the remaining normal launch/live operations through the existing Euro control room. It extends the secure Admin foundation; it does not duplicate already accepted result, safeguard, Time & Phase or content-correction behaviour.

Confirmed decisions:

1. Fixture date, kick-off, venue and schedule status become owner-only Admin operations with optimistic fixture revision and append-only before/after audit evidence.
2. Participant identities, group membership, match numbering, fixture code, resolver slots and knockout allocation remain outside browser editing.
3. Complete tournament points reconciliation is owner-only, note-gated, feature-controlled and replacement-based through the existing canonical scoring function with a null match scope.
4. Results admins retain result entry/correction, match status and one-match recalculation but cannot edit fixture scheduling or reconcile the entire tournament.
5. Migration 018 adds `fixture_revision`, protected tournament-venue reads, expanded match reads, the two owner RPCs, readiness output and exactly two new operation-event values: `fixture_schedule_updated` and `tournament_points_reconciled`.
6. Migration 018 preserves all accepted event values, including `team_profile_updated`, `time_control_updated` and `time_control_reset`; restoring the profile value corrects Migration 016 drift and is not extra product scope.
7. Migration 018 adds no tournament-pick storage, official players, participant assignment, scoring values, manual point edits, resolver change, external provider or new Admin role.
8. Tournament Picks receives one Admin readiness home in Stage 13F-K2. Stage 17A retains persistence, official player references, executable outcome entry, scoring and player-facing use.
9. Operational readiness is a read model, not a mutable approval table. It summarises fixtures, participants, results, scoring runs, Team Profiles, safeguards, health and the Stage 17A tournament-pick dependency.
10. Existing append-only Admin events remain authoritative. Stage 13F-K2 adds category filters and expandable detail without event mutation or deletion.
11. Stage 13F-K is delivered as K0 documents, K1 database, K2 frontend and K3 staging acceptance. Stage 13G-A may not begin before K3 closes.

The approved scope lives in `docs/archive/STAGE-13F-K0-ADMIN-OPERATIONS-SCOPE-AND-SERVER-CONTRACT.md`; the implemented database contract lives in `docs/archive/STAGE-13F-K1-DATABASE-OPERATIONS-CONTRACT.md`.

## 11. Updated build roadmap

### Completed

1. Reconciliation — complete.
2. Prediction storage — complete.
3. Canonical resolver — complete.
4. Guest foundation — complete.
5. Authentication and profiles — complete.
6. Atomic saving — complete.
7. Prediction journey — complete.
8. Competition split, jokers and grace — complete.
9. Results, scoring, live tables and separate leaderboards — complete.
10. Secure admin result operations — complete.
11. Leagues and controlled shared prediction viewing — complete.
12. Expanded admin tournament control room — complete.

### Immediate operational tasks

- **OB-1 — blocked:** Dependabot cannot be activated without placing its configuration on the repository default branch (`main`), which is the protected WC26 branch. Revisit after repository/default-branch separation.
- **OB-2 — implemented after `505d31a`:** guarded Euro staging logical backup, checksums and disposable-destination restore rehearsal. A fresh backup is mandatory before every future hosted migration. It covers roles, app schema/data and migration history, not Supabase-managed Auth/Storage internals.
- **OB-3 — implemented after `9232d57`:** Explicit staging-admin grant, read-only verification, app acceptance and revoke procedure for product-owner testing. No service-role secret and no browser self-grant path.

### Stage 13 — Shared design system and mobile-first rebuild

- **13A v6 — complete:** Charter-compliant design system, portable dependency lock, app shell and Home; corrected Groups→KO switch with permanent Bracket destination.
- **13B — complete in this batch:** all 36 group fixtures, shared `<TeamLabel>`, locally bundled circular ISO-keyed flags, neutral unresolved slots, shared score input, clear save/lock/grace states, safe five-joker controls and the reversible review flow. No Migration 015.
- **13C — complete:** permanent winner-only predicted bracket; separate real-fixture KO match centre with 90-minute score, advancing team, method, five KO jokers, separate points/rank and hidden unresolved fixtures. No Migration 015.
- **13D:** Leagues, results, shared predictions and responsive polish.
- **13E:** Team Profile Sheet implemented through `<TeamLabel>` with the three-source data boundary and post-lock aggregate gate.
- **13F:** Functional-completion sequence is 13F-0, 13F-A through 13F-K. Stage 13F-I owns the tournament-pick contract; Stage 13F-J owns player insight and points storytelling; Stage 13F-K0/K1/K2/K3 complete the Admin operations backbone before Stage 13G-A.
- **13G:** Holistic information architecture and coherent UI pass: 13G-0 scope, 13G-A destinations, 13G-B tournament comprehension/chronology, 13G-C people/profiles/sharing and 13G-D seeded coherence.
- **13P-A:** First specialised presentation batch after Stage 13G: converging predicted/live bracket layouts at `≥900px`, with the completed converging bracket rendered as the cross-device Share Card image.

### Later stages

- **Stage 14:** Observability and resilience—Sentry, scheduled-function heartbeat and Zod validation for external boundaries.
- **Stage 15:** Critical-path Playwright end-to-end testing in GitHub Actions.
- **Stage 16A:** Staging-only provisional teams, nineteen deterministic synthetic personas, prediction/scenario oracle, multi-league cast, correction rehearsal, exact teardown and zero-residue reseed. No resolver or scoring change; any genuine read/time-contract migration is separately packaged.
- **Stage 16 later batches:** Extend the accepted seeded cast through every best-third combination, load/performance exercises and any remaining tournament lifecycle rehearsals.
- **Stage 17:** Real teams and tournament data; use the rehearsed Stage 16A replace/confirm path with zero component/resolver changes; official times, venues and tie-break rules; final scoring-ruleset lock.
- **Stage 18A:** Optional Google sign-in via Supabase OAuth, with existing-account regression protection.
- **Stage 18B:** Optional results-provider integration; manual results remain authoritative and the fallback.
- **Stage 19:** Go-live hardening, runbook, monitoring, dress rehearsal, load review and environment lockdown.

## 12. Open decisions

- ~~KO Predictor draw-bonus point value.~~ Resolved 2026-07-10 (Stage DP-SCORING): the KO
  Predictor match scores three additive +5 components (advancer / draw call / exact 90-minute
  score); the draw bonus is the +5 draw-call component. See §1 amendment C.
- ~~Final joker multiplier.~~ Resolved 2026-07-10: 2× (doubles that match's score points only).
- Official Euro 2028 tie-break regulations.
- Final qualified teams, draw positions and kick-off times.
- Whether Google sign-in is enabled after its optional stage is completed.
- Results-provider selection in 2027.
- Final leaderboard tie-break policy beyond shared rank on equal points.

## 13. Exact next task

Stage 13F-K3 is the current acceptance package built from verified checkpoint `c4342f1`. It adds no product or database capability. It proves three-role deployed visibility, a same-value fixture update inside an exact rollback transaction and one real owner reconciliation with append-only event/run evidence while preserving separate Original/KO totals.

Stage 13F-K3 staging acceptance evidence remains recorded at commit b7f50de and must remain preserved across later Stage 13G and Stage 16A documentation amendments.

After the linked database gates, deployed role walkthroughs, reconciliation verification, full repository check, clean commit/push and final deployed verification pass, Stage 13F-K closes and **Stage 13G-A — destinations and discovery** becomes next. Stage 16A, Stage 17A and Stage 13P-A remain later.

**Starting commit:** `c4342f1`
**Migration count:** `18`; no Migration 019 in Stage 13F-K3


## 10D. Stage 13G-R0 canonical reconciliation — APPROVED

The standalone `EURO28-DECISION-REGISTER-ADDENDUM-2026-07-03.md` is superseded and removed as a separate governing authority when this batch is accepted. Its still-valid decisions are consolidated here. Where earlier wording conflicts with this section, this section governs.

### Truthful Admin correction

Stage 13F-F did not establish functional section navigation. Its audit proved only source strings, IDs and presentation markers. `AdminOperations.jsx` emits `#admin-*` links while `routeFromHash()` treats the hash as the application route; only `/admin` is registered and unknown routes fall through to Home. Therefore Admin fail-closed access remains functional, Admin section destinations are missing, Admin UI fit is incoherent and the complete operations backbone is partial until Stage 13G-A.

### C1 navigation — Option A approved

Retain the accepted five-position mobile navigation: `Groups | Bracket | Home | Leagues | More`, with Groups changing to KO only at the existing readiness boundary. Remove the duplicate persistent Groups/Bracket page switcher and use contextual previous/next actions where useful. No sixth destination and no `Original` merge.

### Original-bracket invalidation contract — approved

This contract applies only to the Original Predictor. It never modifies or combines the separate KO Predictor. It triggers when at least one Original Bracket pick exists and a group-score edit changes predicted group order, third-place order, best-third combination or a knockout slot occupant. The first affected edit per browser session shows the approved design-system warning with Cancel and `Update groups and review bracket`. Cancel saves nothing. Confirmation recalculates group tables, third-place order, best-third combination and all knockout occupants, then revalidates picks. A pick remains valid only when the selected team remains in the same tie and reachable through the same path. Invalid picks remain visibly preserved, are marked for review, do not count as complete, are not scored, are never silently dropped/transferred/replaced and cascade downstream where the old path is unreachable. Groups, Bracket and Review show one amber count/banner linked to the earliest affected tie. Submission cannot be complete until repaired. No Migration 019 is assumed; a schema/read-contract gap must be separately proved.

### Stage 13G approved sequence

1. **13G-R0:** canonical documents, truthful Ledger v1.21, fragment consolidation and contracts only.
2. **13G-A:** Admin route integrity, central tournament/lock configuration, autosave unblock, shared confirmations/selectors/refresh policy and naming ratchet.
3. **13G-B:** Home lifecycle, countdowns, today hub and one KO-readiness signal.
4. **13G-C:** group/date views, predicted standings, shared third-place table, bracket coherence and contract-derived tournament guide.
5. **13G-D:** PlayerIdentity/PlayerInsight coherence, league action hierarchy, sharing/OG architecture and auth-provider readiness or explicit deferral.
6. **16A:** seeded staging cast after identity/sharing contracts stabilise.
7. **13G-E:** whole-surface hardwired/native/refresh/empty-state/identity/theme/route acceptance.
8. **15E:** WC26 legacy retirement after 13G-E and before 13P-A, with `legacy-wc26-final` created immediately before exact-path deletion.


### Test strategy extension — approved after R0

This extension is binding for Stage 13G and later acceptance gates. It addresses the Stage 13F-F failure class by requiring rendered-route and link-target proof rather than source-string audits alone.

1. **Route-render integration tests:** implement first in Stage 13G-A, then require for every new destination. Render the real shell at each route and section hash, assert rendered content, cover every Admin section and add a dead-destination audit that fails when an internal link target does not resolve against the route table.
2. **Permission matrix pgTAP suite:** implement in the next database/protected-operation batches. Assert allow/deny for every RPC and protected table across anonymous, authenticated non-owner, owner and admin roles. New database objects must add matrix rows and unmapped objects fail the suite.
3. **Invariant tests:** implement with Stage 13G-C and scoring/resolver stages. Recalculation must be idempotent on identical input and resolver property tests must produce lawful brackets with all slots filled, valid third-place combinations and no duplicates.
4. **Lock-boundary suite:** implement as lock, countdown and grace surfaces land. Use the shared clock utility to test exact lock instant, joker kick-off second and grace expiry mid-operation on both sides of each boundary.
5. **Config-to-surface contract tests:** implement with Stage 13G-B/C. Displayed scoring values must equal the central ruleset, countdowns must equal central configuration and KO readiness must come from one central signal on Home, leagues and navigation.

Rejected for now to prevent test gold-plating: mutation testing, broad visual regression and multi-browser matrices.


## 10E. Stage 13G-A route integrity slice — IMPLEMENTED

From checkpoint `3c41628`, Stage 13G-A starts with the approved test-strategy extension rather than visual/product polish. The first implementation slice adds the route-render and dead-destination proof that Stage 13F-F lacked.

The Admin control room now has one canonical section registry and query-addressed destinations under the protected Admin route. Legacy `#admin-*` links are removed. Each Admin section resolves through `#/admin?section=...`, so clicking section controls, refreshing a section URL or opening a section deep link stays inside `/admin`. Invalid section values recover inside the protected Admin route and show Overview instead of falling through to Home.

The route-integrity audit scans active source links for unresolved app hashes and legacy Admin fragments. It is included in `npm run check`, so future destination drift fails the build. Rendered route tests cover every current application destination and every Admin section destination.

This slice does not implement the rest of Stage 13G-A. Central tournament/lock configuration, account-autosave unblocking, shared destructive confirmation, design-system selector replacement, refresh policy and `foundation-*` ratchet remain scheduled. No database change and no Migration 019.


### Stage 13G-A interaction enforcement amendment

- The shared `ConfirmDialog` is now the required active-surface confirmation route for high-impact or destructive browser actions. Native `window.confirm` and bare `confirm()` are rejected in active Euro UI roots.
- Active-surface selectors must use `SelectField`; native `<select>` is permitted only inside the design-system primitive and its tests.
- Manual refresh buttons are not allowed as ordinary product controls. Retry actions may remain in load/error states, but normal data refresh should follow the central refresh policy and mutation invalidation pattern.
- The `foundation-*` class ratchet is recorded in `architecture-policy.mjs`; the cap may only reduce or remain stable unless the Charter is explicitly amended.
- `audit:interaction-enforcement` is included in `npm run check`.
- This closes Stage 13G-A's shared-interaction enforcement slice without a database change or Migration 019.

### Offline players / claim-account

Decision pending. Stage 16 synthetic seeding may reuse service-role-only participant creation, deterministic naming, prediction seeding, league membership, auditing and marker-safe teardown. It must not decide the production identity model. Any managed/offline participant feature requires a separately approved application participant identity, nullable auth link, ownership/privacy rules, one-time opaque claim token, atomic server claim and rollback contract.

### Other carried decisions

- PWA and push remain **DECIDED — CARRY** for Stage 18C only.
- Lucky Dip remains functional.
- The converging wall-chart bracket/share image remains scheduled for Stage 13P-A.
- Static Euro Open Graph identity is mandatory; dynamic per-league previews require a server-visible invite route and may expose only invite-safe metadata.
- The Functional Completion Ledger must update in the same commit as every future batch, including micro-fixes.

### Stage 13G-A central configuration/shared primitive amendment

- Central provisional prediction lock and tournament start values are now held in `TOURNAMENT_CONFIG`.
- Original Predictor account autosave must use `resolveTournamentLifecycle()` rather than checking database lock fields directly.
- The central provisional value unblocks staging autosave but must never apply the irreversible real global lock.
- Shared `ConfirmDialog`, `SelectField` and `REFRESH_POLICY` primitives are approved for incremental adoption.
- Remaining destructive actions, native selectors and refresh consumers stay ledger-tracked until fully migrated.
- No database change or Migration 019 belongs to this slice.


## Stage 13G-B Home lifecycle amendment

The first Stage 13G-B implementation slice starts from `08524b6` and is limited to Home lifecycle alignment. Home must render first-visit and returning-guest conversion copy, prediction-lock and tournament-start countdowns from central lifecycle configuration, a Today’s match hub linking into Match Centre, and a Home-owned KO readiness signal. Date-only staging tournament starts must not override the central precise tournament-start timestamp. No database change or Migration 019 is permitted.


### Stage 13G-B prediction lifecycle slice

From checkpoint `1dda826`, the second Stage 13G-B slice aligns the active prediction surfaces with the central lifecycle model. Original Predictor now shows lock, group-score, winner-only bracket and KO-boundary lifecycle cards. KO Predictor now shows real-fixture readiness and a separate-competition lifecycle strip. The slice adds `audit:prediction-lifecycle` to `npm run check`, keeps active migrations at 18 and adds no Migration 019.


### Stage 13G-B Results lifecycle alignment

From checkpoint `177605b`, the next Stage 13G-B slice aligns Results, Leaderboards and Match Centre with the central lifecycle model. Results now distinguish pre-tournament, live, review, quiet and completed canonical-result states. Leaderboards now show competition-scoped lifecycle copy for Original Predictor and KO Predictor. Match Centre now shows fixture-level lifecycle copy for live, review, completed, scheduled and unresolved knockout contexts. The slice adds `audit:results-lifecycle` to `npm run check`, keeps active migrations at 18 and adds no Migration 019.

## Stage 13G-B League Lifecycle Update

- Stage 13G-B League lifecycle alignment is complete at the package level: Leagues and member comparisons now receive central lifecycle context and state Original release as global-lock based while KO release remains fixture-by-fixture. No database change and no Migration 019.

## Stage 13G-B Player Insight and Team Profile lifecycle alignment

From checkpoint `a651d33`, Player Insight and Team Profile are aligned with central lifecycle context without changing server privacy, scoring, database policy or migrations. Player Insight displays lifecycle copy for Original global-lock evidence and KO fixture-by-fixture evidence, while the canonical authorised-read phrase remains active. Team Profile displays lifecycle copy for Original-only community bracket aggregates, keeps KO Predictor data excluded and repeats that no Original/KO points are combined. `audit:player-team-lifecycle` is included in `npm run check`; active migrations remain 21 and Migration 019 is applied.

## Stage 13G-B KO-readiness signal close-out

From checkpoint `659809c`, the KO-readiness decision is centralised for Home, Navigation and Leagues. The shared readiness model counts only real knockout fixtures whose participant slots are resolved. Navigation keeps the five-position contract: Groups remains primary until the full approved readiness boundary is met, early KO access appears in More only, and Group review moves to More only after KO becomes primary. Leagues consume the same readiness signal before presenting KO league context. No database change or Migration 019 is created.

## Stage 13G-H0 housekeeping and corrected records

This amendment is read with the Stage 13G master prompt and corrects records before the next build.

### Recorded-equals-real corrections

- Constitution principle 14: Slick and frictionless is the product sensibility. Prefer restraint, opinionated defaults, fewer taps, hidden machinery and opening into what matters now. The existing access principle remains active as principle 15.
- Tournament Picks: the Original-only contract is accepted, but the player-facing feature is partial until ordinary users can enter total goals, top scorer and highest-scoring team. The audit verified contract boundaries and Admin readiness only.
- Player Insight/H2H: existing engines are not the final product shape. The accepted target is a dedicated player view with sections for overview, group predictions, predicted bracket/tables, KO evidence, dedicated H2H and dedicated points breakdown.
- Guest import: after signup/sign-in with a valid local draft, show one dominant prompt. Primary: “Import predictions to my account.” Secondary: “Start fresh.” After this point, signed-in copy must never say “browser draft”.
- FAQ: do not include result-correction mechanics as a user-facing FAQ question.

### Contract or schedule changes that need explicit acceptance before build

- Moving Tournament Picks player entry from Stage 17A into 13G-C is a schedule change.
- Dedicated `#/player/:userId`, H2H and points-breakdown routes are a route/deep-link contract change.
- Coverage, eslint-disable, fixture-gating and frozen-bridge ratchets are tooling/architecture gates, not scoring or database changes.

### Placement

- Stage 13G-H1: bypass-class tooling sweep.
- Stage 13G-C: guest import flow, signed-in copy sweep, joker control, bracket overlap, shared tabs, Tournament Picks player entry if schedule change is accepted.
- Stage 13G-C/D: dedicated player view, H2H and points-breakdown destinations.
- Stage 13G-B-TOURNAMENT-1: Tournament / How to Play split and canonical tournament fact correction.
- Stage 13G-B/C: how-to-play and FAQ guide, using the split How to Play destination rather than the old combined Tournament page.
- Stage 13P-A: converging wall-chart bracket and share image.


### Stage 13G-H1 bypass-class tooling sweep — ACCEPTED
- Time travel defaults false in `.env.example`.
- Coverage floors use current live `src/` actuals and are wired into `npm run check`.
- `eslint-disable` use has reason comments and exact cap ratchets.
- Visual fixtures stay outside the production graph; `Stage14ErrorFixture` is DEV-only.
- Size governance clarifies 200/250 review guidance, 400/400 hard caps and test-fixture ratchets.
- No database change and no Migration 019.


### Stage 13G-H2 product-facing alignment and reference-asset decision — ACCEPTED
- The official UEFA EURO 2028 logo, trophy rendering, tournament wordmark and wider UEFA competition identity are not approved as deployable app assets unless explicit usage permission/licence is obtained and recorded later. Use a future independent app mark instead.
- The WC26/FPL-style league screenshot remains reference only. Evaluated patterns: glanceable rank story adopt-improved; rank movement adapt pending trustworthy previous-rank data; top-three treatment adopt-improved with designed elements and no emoji medals; YOU row anchoring adopt-improved; gap-to-leader adopt-improved; copying the reference layout is dropped.
- Dedicated player route direction is recorded for a later route build: `#/player/:userId`, `#/player/:userId/head-to-head?against=me` and `#/player/:userId/points`. H2 does not build these routes.
- Tournament Picks player-facing entry remains a schedule decision and is not moved into H2. If moved earlier, it must stay Original-only with no jokers and no KO Predictor points.
- Guest signup import prompt and signed-in copy sweep are the recommended next tight product build.
- No route, component, scoring, resolver, database or migration change. Active migrations remain 21 and Migration 019 is applied.


### Stage 13G-C1 guest import prompt — ACCEPTED
- Signed-in guest import uses the accepted dominant prompt: “Import your saved Euro 2028 predictions?”
- Helper copy explains that group scores, bracket picks and/or a KO Predictor draft were found on this device.
- Primary action is “Import predictions to my account”.
- Secondary action is “Start fresh” and clears the saved device-side guest draft without writing to the database.
- Signed-in import/account copy avoids “browser draft”, “browser copy” and “browser predictions” wording.
- Original Predictor and KO Predictor import readiness remain separate and do not blend points, totals, jokers or leaderboards.
- No route, scoring, resolver, league, admin, database policy or migration change. Active migrations remain 21 and Migration 019 is applied.

## Stage 13G-C2 — League race-story polish

Status: complete in development.

Stage 13G-C2 adopts the useful league-reference patterns natively in the Euro design system: a current-user `YOU` row anchor, top-three designed treatment and gap-to-leader race context. Rank movement is explicitly deferred until trustworthy previous-rank data exists. Original Predictor and KO Predictor standings remain separate. No database migration was required; active migrations remain 21 and Migration 019 is applied.

## Stage 13G-C3 — League race summary strip

Status: complete in development.

Stage 13G-C3 adds a league race summary strip above ready standings, with you-vs-leader context, leader/current/gap labels, and explicit pre-scoring and empty-member states. Original Predictor and KO Predictor remain separate. Rank movement remains deferred until trustworthy previous-rank data exists. No database migration was required; active migrations remain 21 and Migration 019 is applied.

## Stage 13G-C4 — Compact league standings correction

Status: complete in development.

Stage 13G-C4 corrects the over-dense Stage 13G-C2/C3 league presentation. The default private-league table is now a compact running total: rank, member and points. Groups, bracket, scored-match, gap and race-summary breakdowns belong in deeper destinations such as member comparison, player insight, match centre and results. Original Predictor and KO Predictor remain separate. No database migration was required; active migrations remain 21 and Migration 019 is applied.

## Stage 13G-C5 — League row detail destination

Status: complete in development.

Stage 13G-C5 preserves the compact private-league table introduced by C4. The default table remains rank, member and points. Deeper member comparison, point splits, gap context and privacy/lock copy now open through the member row detail destination below the table. Original Predictor and KO Predictor remain separate. No database migration was required; active migrations remain 21 and Migration 019 is applied.

## Stage 13G-C6 — Compact league page shell

Status: complete in development.

Stage 13G-C6 simplifies the default private-league shell around the compact table. The default view now leads with league selection, competition selection and rank/member/points. League code, lifecycle/privacy copy, summary cards and shared-member notes sit behind details after the table. Original Predictor and KO Predictor remain separate. No database migration was required; active migrations remain 21 and Migration 019 is applied.

## Stage 16A-P1 — Privacy-safe synthetic identity plumbing

Status: complete in development as a local catalogue, guard and audit package.

Stage 16A-P1 records the privacy-safe synthetic identity contract before any staging seeding implementation. It creates no users, includes no user creation, writes no Supabase data, includes no database writes, exposes no email addresses or raw Auth metadata to the browser, changes no UI components, changes no resolver logic, changes no scoring and creates no Migration 019.

Confirmed decisions:

1. The approved Stage 16A persona set remains exactly nineteen deterministic personas: `exact_score_heavy`, `outcome_only`, `all_wrong`, `partial_predictions`, `no_predictions`, `submitted_complete`, `unsubmitted_identical`, `joker_cap_reached`, `zero_jokers`, `engineered_tie_a`, `engineered_tie_b`, `bracket_survives_deep`, `bracket_dead_early`, `ko_only`, `original_only`, `ko_advancing_only`, `ko_method_variant`, `ko_joker_variant`, `correction_sensitive`.
2. Every future seeded account must carry both reserved markers: email domain `@synthetic.euro28.test` and user metadata marker `synthetic_euro28: true`.
3. The future teardown must require both reserved markers before deleting anything. Email domain alone is insufficient, and metadata marker alone is insufficient.
4. P1 tooling fails closed to the Euro staging project `gcfdwobpnanjchcnvdco` and explicitly blocks WC26 production `ouhxawizadnwrhrjppld`.
5. Original Predictor and KO Predictor participation remains competition-scoped in the catalogue. No combined totals, blended leaderboards or cross-competition scoring evidence are approved.
6. P1 does not decide the future production offline-player or managed-participant model.
7. The package adds `audit:stage16a-p1-synthetic-identity` to `npm run check`; active migrations remain 21 and Migration 019 is applied.

Next sequenced package: Stage 16A-P2 — Staging-effective database time, unless deliberately re-sequenced before the full seeded-cast implementation.

## Stage 16A-P2 — Staging-effective database time

Status: complete in development as a guarded planning, model and audit package.

Stage 16A-P2 records the effective-time contract for the seeded acceptance window before any data seeding implementation begins. Later Stage 16A scripts must use the existing Time & Phase control to exercise privacy, simulated-lock, release, correction-review and final read-only states. The package blocks WC26 production, remains Euro-staging-only and explicitly does not apply the irreversible real global prediction lock.

Confirmed decisions:

1. The phase catalogue is resettable and uses existing `TIME_PHASE_PRESETS`.
2. Simulated post-lock evidence is permitted only through the existing Time & Phase control; it is not the real global prediction-lock operation.
3. The package creates no users, seeds no predictions, changes no fixture/result/scoring/league/tournament-pick data and creates no database migration.
4. Original Predictor and KO Predictor evidence remain competition-scoped in every phase case.
5. WC26 production remains fail-closed and Euro staging remains the only permitted project.
6. Active migrations remain 21 and Migration 019 is applied.

Next sequenced package: a small Stage 16A seeded-cast implementation slice, not the full provisional-team, persona, league, scoring-oracle, correction and teardown package in one batch.



## Stage 13G-REF — Home and League reference prototype adoption

Status: scheduled and accepted as docs/audit-only reference adoption.

The approved Home reference artefact is `euro28-home-page-prototype.html`. It covers signed-out hook, signed-in pre-tournament and matchday hub. It is adopted as behaviour, hierarchy, spacing intent and copy-register reference only, not as code to port. The prototype is amended by owner authority in two places: one countdown only, and zero KO Predictor Home presence before readiness.

The approved League reference artefact is `euro28-league-page-prototype.html`. It supersedes the earlier WC26 screenshot reference and any current league presentation where they differ. It is adopted as behaviour, hierarchy, spacing intent and copy-register reference only, not as code to port.

Confirmed Home amendments and decisions:

1. Amendment 1 — one countdown, not two. Prediction lock is the first tournament kick-off: one moment. The Home countdown uses the wording `First match & prediction lock`, `Euro 2028 starts in`, `Predictions lock at first kick-off.` and `One deadline. Your Original Predictor locks when the opening match kicks off.` The Home countdown, displayed lock deadline and lock enforcement must read the same central first-kick-off config value.
2. Amendment 2 — KO Predictor zero Home presence pre-readiness. The previous quiet tease card decision is superseded. Before readiness, Home shows no KO Predictor card, locked tease, countdown, banner, prompt or placeholder.
3. Pre-readiness KO Predictor discovery is limited to the More sheet and the how-to-play guide. The guide records the second-chance line: `everyone starts the knockouts on zero`.
4. One central KO readiness signal now governs the navigation tab state, the Home KO card existence, the More sheet KO entry state and league KO standings availability. Lifecycle tests must assert all four flip together.
5. Signed-out Home adopts the thesis headline, three-beat how-it-plays, account-first CTAs, direct guest path and guest-draft promise.
6. Matchday Home adopts the points/rank strip first, then rows ordered live → upcoming by kick-off → finished. Row anatomy is kickoff/live/FT column, stacked teams with flags, meta line with group and stadium plus predicted score or points chip, joker edge and chevron to match centre.
7. Bottom navigation charter wording is amended: the Home circle overlaps the bar line, and all five labels share one baseline.

Confirmed League amendments and decisions:

1. League tables are pure: one running total per competition, no stat chips. The earlier stat-chip question is closed as `NO`.
2. Gap-to-leader appears on every row; the leader shows points clear of second.
3. Top-three treatment uses designed rank badges: accent-filled first, accent outline second and quiet ring third. No gold and no emoji.
4. Player row tap opens the dedicated S5 player view. The inline-H2H-below-the-league presentation is retired.
5. League switching uses the design-system bottom sheet. Delete league uses small danger-ghost plus shared confirmation dialog. Copy invite uses confirmed-state plus toast. Freshness is passive; no refresh controls.
6. KO pre-readiness shows no KO tab and no KO table. It shows the single note: `KO Predictor standings arrive at the knockouts — everyone starts on zero.`
7. One central readiness signal drives the league KO note, competition tabs and player-view KO line together.
8. The rules strip renders from the central versioned ruleset.

Prototype exclusions: sample data, stub toasts, prototype switches, Google-hosted fonts, CDN flags and single-file architecture must not be imported. Future implementation must use real data, real lifecycle signals, semantic tokens, CSS Modules, shared primitives and Section 11 architecture.

No route, component, scoring, resolver, database or migration implementation is included in this package. Active migrations remain 21 and Migration 019 is applied.

Next single task: `13G-HOME-1` single countdown contract and config-to-surface test, unless deliberately re-sequenced.


Stage 13G-REF exact phrase locks: no UI build; no route implementation; no scoring change; no resolver change; no Supabase write; Predict every match. Beat your mates.; updates if your group predictions change; sample data; stub toasts; prototype switches; Google-hosted fonts; CDN flags; single-file architecture.

## Stage 13G-REF-2 — Groups and Original Bracket Reference Prototype Adoption

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
- no migration change in this slice
- active migrations remain 21

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
| 13G Groups reference prototype adoption | SUPERSEDED / SCHEDULED | Superseded by `STAGE-CORE-PAGE-ADOPTION-1` in the v9+ order; approved Groups prototype remains binding and must be rebuilt natively, not ported. |
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
- Active migrations remain 21.
- Migration 019 must not exist.
- This package repairs the missing Stage 13F-K3 marker `b7f50de` and records Groups/Bracket reference adoption only.

Next single task after this package: `13G-GROUPS-1 — joker pill, shared joker meter and disabled-at-cap tests`.

Audit phrase locks: Stage 13G-REF-2; Groups decisions 9 and 10; euro28-groups-page-prototype.html; euro28-bracket-page-prototype.html; star icon; Joker label; 2×; five-dot gold JOKER METER; bare J circle is retired; By group | By date; third-place ranking across all six groups; Calculated live from your predictions; This changes your bracket; FLAG-FOR-RE-PICK; Lucky Dip; fills only blank scores in the current group; You predicted; date · venue with the host country; host-country circle flag; fixture data; ≥640px; clamp 0–15; blank as zero; pointer-only exemption; autosave pill; privacy context banner; zero dev text; below 900px; ≥900px; converging wall chart; ONE state, ONE set of tie/slot primitives; 1B; 2A; 3DEF; dashed placeholder chips; tap-to-advance; winner-only; downstream picks that are no longer fed; Re-pick — your tables changed this tie; winner picks only — scores and jokers are handled in the KO Predictor; group predictions decide this bracket; live results will not change your saved picks; no score inputs; no method controls; no joker controls; without connector lines; share-card rendering lands in its own follow-on batch; 900px single breakpoint; active migrations remain 21; Migration 019 is applied.

## Stage 13G-PLAYER-REF — Player View / Viewing Player Predictions Reference Prototype Adoption

The approved Player View / Viewing Player Predictions prototype is adopted as a reference artefact for the dedicated destination opened from league rows and other player-entry points.

Register decisions recorded:

- Viewing another member's predictions is a dedicated Player View, not inline expansion under a league table.
- Before the global Original Predictor lock, prediction content is hidden behind an informative privacy placeholder.
- The header remains visible before and after lock because it contains no private prediction detail.
- Post-lock information architecture is Predictions / Bracket / Tables.
- Prediction rows show fixture, predicted score, result or upcoming status, points chip and joker chip where applied.
- The Bracket tab shows champion, semi-finalists and quarter-finalists, with knocked-out teams struck through for bracket-health clarity.
- The Tables tab shows the player's predicted group tables and must reuse Groups table and third-place logic.
- Header actions route to real Head-to-head and Points breakdown destinations; prototype stubs are not imported.
- Original Predictor and KO Predictor stay separate; KO state may say “Starts at the knockouts” before readiness but KO points are not blended into Original totals.

Contract changes flagged:

| Contract | Change |
|---|---|
| League player-row destination | Confirmed as dedicated Player View, not inline expansion. |
| Player prediction privacy | Pre-lock content is hidden behind an informative placeholder. |
| Player View tabs | Predictions / Bracket / Tables becomes the approved IA. |
| Player bracket display | Compact summary in Player View; full chart remains separate. |
| Player predicted tables | Must reuse Groups table and third-place logic. |
| Original / KO split | Header may show KO state, but points and content remain separate. |

This is a docs/audit-only reference adoption. It does not implement UI, routes, resolver logic, scoring logic, Supabase writes or a migration. Active migrations remain 21 and Migration 019 is applied.

## Stage 13G-GROUPS-1 — Joker Pill and Shared Joker Meter Implementation

Status: implemented.

This slice implements the approved Groups joker-control decision from the reference prototype. The bare `J` circle is retired from the Groups predictor surface. Group match cards now use the shared `JokerPill` primitive with a star icon, visible `Joker` label and `2×` multiplier only when armed. The page controls now use the shared five-dot gold `JokerMeter` primitive. Disabled cap treatment remains explicit when the five-group-joker cap is reached.

Scope boundaries: no venue meta-line implementation, no score-stepper implementation, no view-switcher rebuild, no predicted-table rebuild, no bracket rebuild, no league or Player View rebuild, no Supabase write change, no scoring or resolver change, and no migration.


## Stage 13G-GROUPS-2C — Groups Top Dock Polish

Status: implemented as a small presentation-only design iteration, not final visual sign-off.

The Groups top focus area now has a stronger premium hierarchy with summary chips and direct predicted-table access. The compact A-F rail is visually softened but remains a same-page jump control. This slice does not alter the settled By group / By date decision, predicted-table calculation, bracket feed, scoring, resolver logic, Supabase writes, service-role usage, routes or migrations. Active migrations remain 21 and Migration 019 is applied.


## Stage 13G-GROUPS-2D — Groups Top Dock Repair

Status: implemented as an immediate repair to the 2C design iteration, not final Groups visual polish.

The duplicate hero summary chips are removed because they repeated information already carried by the progress bar and joker meter. The predicted-table shortcut remains, but as a compact action. The By group / By date control now carries helper copy, and the A-F rail becomes a richer group-card rail with progress text and completion meter styling. Predicted tables treat one-sided partial score drafts as incomplete, so deleting one side of a score cannot crash the Groups screen.

Scope remains presentation/model/test/audit/docs only: no scoring change, no resolver change, no Supabase write, no service-role use, no route change and no migration. Active migrations remain 21 and Migration 019 is applied.

## Stage 13G-GROUPS-2B — Groups Chrome Repair

Post-eye-test decision: Groups and Bracket are route-owned destinations. Do not reintroduce an in-page Groups / Bracket / Review switcher on those primary surfaces, because it duplicates the main navigation. Device-draft import banners are also retired from the prediction surface; transfer belongs to the signed-in account transfer flow. Groups page chrome should stay compact: status/lifecycle detail behind a disclosure, Lucky Dip behind a disclosure, and group switching as compact premium chips.

Scope remains presentation-only: no scoring, resolver, Supabase write, service-role, route or migration change. Active migrations remain 21 with Migration 019 applied.

## Stage 13G-GROUPS-2 — Groups Premium View Switcher

Status: implemented.

This slice records and implements that the By group / By date toggle is a restored settled Groups decision from the original reference, not a new direction. By group remains the default prediction workflow. By date lists all 36 group fixtures in scheduled order for matchday-style entry.

The new product decision is the by-date context fast path: date-mode tickets carry a group tag, and a sticky Tables pill opens a slide-up sheet with A–F plus third-place rails. This keeps predicted standings one tap away from anywhere in the date list.

Scope boundaries: no scoring change, no resolver change, no Supabase write, no service-role use, no new route and no migration. The sheet consumes existing predicted group-table and best-third logic only. Active migrations remain 21 and Migration 019 is applied.

## Stage 13G Destination Reference Adoption — Tournament, How to Play, Account, Admin and Match Centre

This docs/audit package records the approved `euro28-tournament-page-prototype.html`, `euro28-how-to-play-page-prototype.html`, `euro28-account-page-prototype.html`, `euro28-admin-page-prototype.html` and `euro28-match-centre-page-prototype.html` artefacts under `docs/reference-prototypes/`, together with the build-agent reference brief. The artefacts are adopted as information-architecture, copy-register and data-source-discipline references only, not as pixel-perfect code to port.

Stage 13G-B-TOURNAMENT-1 is now the scoped implementation task for the split destinations: `#/tournament` is Tournament facts and `#/how-to-play` is predictor mechanics. It amends existing Stage 13G-B in place and corrects confirmed tournament dates, host nations and venues in the canonical source of truth. Account and Admin are now implemented as later focused batches; Match Centre remains a later focused batch and must not be bundled into unrelated work without explicit acceptance.

Constraints: docs/audit only in this package; no UI rebuild, route implementation, config correction, scoring change, resolver change, Supabase write or migration. Active migrations remain 21 and Migration 019 is applied.

## Stage 13G-BRACKET-REF — Original Bracket Reference Adoption

Status: accepted docs/audit reference-adoption package for the Original Bracket destination. The approved prototype is `docs/reference-prototypes/euro28-bracket-page-prototype.html`.

Contract change: the charter v1.8 converging wall-chart decision moves from backlog into Stage 13G Original Bracket scope. This is intentional and must not be treated as silent scope drift.

Recorded decisions: below 900px stacked layout with per-round pick counters; at ≥900px converging wall chart; one state and one tie/slot primitive set; visible slot source codes such as `1B`, `2A` and `3DEF`; tap-to-advance winner-only picks; selective downstream clearing; amber re-pick flag `Re-pick — your tables changed this tie`; champion strip and centred champion box; copy `winner picks only — scores and jokers are handled in the KO Predictor`; predicted-context banner `Your group predictions decide this bracket. Live results will not change your saved picks.`; audit-required absence of score inputs, method controls and joker controls.

Owner sign-off for open decisions: first build proceeds without connector lines; share-card rendering lands in its own follow-on batch; one 900px breakpoint is retained with no intermediate tablet layout unless real-device review proves need.

Scope: no UI build, no route implementation, no scoring change, no resolver change, no Supabase write and no migration. Active migrations remain 21 and Migration 019 is applied.


## Stage 13G-BRACKET-1 — Original Bracket Responsive Wall-Chart Rebuild

Stage 13G-BRACKET-1 implements the approved Original Bracket reference adoption after `b7a8956 Record Stage 13G Bracket reference`. The first Bracket build includes both the stacked vertical layout below 900px and the converging wall chart at 900px and above, so the previously split BRACKET-1/BRACKET-2 schedule is consolidated into this single scoped implementation batch.

Implementation rules recorded: one rendered bracket surface, one shared `OriginalBracketTie` primitive, one shared `OriginalBracketSlot` primitive, source-code labels on every slot, centred champion box on the wall chart, no connector lines, share-card rendering still follow-on, and no score inputs, method controls or joker controls.

The stale-pick rule is implemented as presentation plus state handling: ties whose stored pick no longer matches either feeding slot show `Re-pick — your tables changed this tie`; upstream bracket changes clear only downstream picks that are no longer fed while preserving surviving downstream picks. Active migrations remain 21. No Migration 019.

## Stage 13G-ACCOUNT-1 — Account destination rebuild

Stage 13G-ACCOUNT-1 implements the approved Account reference destination as a standalone batch after Stage 13G-B-TOURNAMENT-1. The signed-in Account page now carries identity, read-only prediction/league stats, security/preferences, leagues navigation and a danger zone. Guest transfer no longer appears as a persistent Account card; it is a one-time post sign-in/sign-up dialog using the corrected `Keep your predictions from this device?` wording. `Clear my predictions` is scoped to Original Predictor group scores and bracket picks only, hidden after the central lock and implemented without Migration 019.


## Stage 13G-ADMIN-1 — Admin control-room cosmetic restyle

Stage 13G-ADMIN-1 adopts the approved Admin prototype visual language for the protected control room only. It restyles the Admin shell, hero, section navigation, metadata chips, operational summary, guardrail warning and audit filter pills with the Euro semantic token system. It does not change Admin route protection, owner/results-admin roles, service calls, RPCs, scoring, resolver logic, append-only audit evidence, Tournament Picks readiness, Supabase writes or migrations. Active migrations remain 21 and Migration 019 is applied.

Next focused destination after this stage should be Match Centre group-match upgrade unless a higher-priority defect is found.

## Stage 13G handover and next-reference alignment — 2026-07-05

After `06d5218`, Tournament/How to Play, Account and Admin are complete, pushed and deployed. The expanded uploaded brief is recorded under `docs/reference-prototypes/euro28-stage13g-expanded-agent-prompt.md`; the earlier `euro28-tournament-split-agent-prompt.md` reference is refreshed to the same current brief.

New reference artefacts now recorded:

- guest-transfer modal prototype;
- dedicated Head-to-head page prototype;
- dedicated Points Breakdown page prototype;
- spec-echo audit script reference.

The next stages remain separate: Match Centre group-match upgrade, Player View/dedicated sub-destinations, and UI-copy hygiene. Do not bundle these into one patch. `src/pages/Profile.jsx` is already retired; broader legacy `src/pages/` retirement remains a future audited cleanup and must not be claimed complete until zero live imports are proved.

### Match Centre reference decisions

The next Match Centre stage must preserve the existing shell and knockout panel, while adding group-specific behaviour: group fixtures show only Original Predictor, carry live/final group-impact state, reuse the canonical resolver for live projections, show read-only projected/confirmed bracket-point preview, and replace “points on the line” with this match’s prediction comparison. No storage write, scoring change, resolver rewrite or migration is expected.


## Stage 13G-MATCH-CENTRE-REF — accepted docs/audit checkpoint

Stage 13G-MATCH-CENTRE-REF accepts the Match Centre group-match reference adoption as documentation and audit only. The accepted implementation contract is: group fixtures render only Original Predictor tabs; knockout fixtures retain Original/KO Predictor tabs; group impact carries `Live projection` or `Final`; live/final tables reuse `resolveGroupTable`; bracket-point preview is read-only and may never write to `bracket_predictions`, persisted standings or scores; activation follows group live/confirmed status rather than a hardcoded matchday; knockout `Points on the line` remains unchanged; group fixtures use `This match’s predictions`; and group fixtures avoid maximum-available framing.

The next scoped build is `13G-MATCH-CENTRE-1`. It must preserve the existing Match Centre shell, route shape, fixture navigation, status bar and viewing-scope selector unless a defect is separately proved. No scoring change, resolver rewrite, Supabase write, migration or Migration 019 is authorised by the reference package.

### Player destination reference decisions

The Player View implementation remains scheduled. It must create a dedicated player view plus real Head-to-head and Points Breakdown destinations, reuse existing H2H and points-breakdown engines, rewire league-row entry to the player destination, and keep Original/KO separation. The ledger must remain partial until all three destinations and the league-row rewire are live.

### UI-copy hygiene reference decisions

The spec-echo audit reference is recorded, but the expanded brief’s companion files `check-user-facing-copy-hygiene.mjs` and `user-facing-copy-hygiene-policy.mjs` were not present in the upload. Do not wire a broken audit into `npm run check`; record or attach the missing files first.

## Stage 16A-P4 seed SQL preview dry-run

Stage 16A-P4 — Seed SQL preview dry-run is accepted as a read-only SELECT preview package. It consumes the Stage 16A-P3 manifest dry-run and generates local SQL evidence only.

Confirmed product boundaries:

- The preview is read-only SELECT output.
- The preview reports 24 provisional team slots, 19 synthetic personas, 11 resettable time-phase cases and three league shapes.
- The preview reports Original Predictor and KO Predictor evidence separately.
- The package contains no database writes, no user creation, no prediction seeding, no service-role credential use, no scoring change, no resolver change, no route change and no Migration 019.
- The generator fails closed outside Euro staging and blocks WC26 production.
- Active migrations remain 21.

Next sequenced package: a narrow staging-only executor preflight with explicit approval before any write path exists.

## Stage 16A-P3 seed manifest dry-run

Stage 16A-P3 — Seed manifest dry-run is accepted as a manifest dry-run only package. It records the local seed-manifest shape before any staging write path exists.

Confirmed product boundaries:

- The manifest contains 24 provisional team slots across six groups.
- The manifest consumes 19 synthetic personas from Stage 16A-P1.
- The manifest consumes 11 resettable time-phase cases from Stage 16A-P2.
- The manifest records large, tiny, multi-league and no-league league evidence without creating league rows.
- The manifest records correction and teardown evidence only as dry-run selectors.
- The package contains no database writes, no user creation, no prediction seeding, no service-role credential requirement, no scoring change, no resolver change, no route change and no Migration 019.
- Original Predictor and KO Predictor remain separate; combined totals and blended standings remain prohibited.
- Future teardown must preserve the seed → validate → teardown → zero residue → reseed sequence and must require both reserved synthetic markers.

Next sequenced package: a narrow staging-only implementation preflight or generator, not the full seeded cast in one batch.

## Stage 16A-P5 staging write preflight and teardown contract

Stage 16A-P5 — Staging write preflight and teardown contract is accepted as a no-write preflight package. It prepares the local acceptance contract for a later explicitly approved staging seed write slice.

Confirmed product boundaries:

- The preflight records `canStartWrite: false`.
- The preflight records `requiresExplicitNextSliceApproval: true`.
- The preflight records local environment variable names only and does not read or print secret values.
- The preflight requires dual synthetic teardown markers: `@synthetic.euro28.test` and `synthetic_euro28: true`.
- The preflight requires zero-residue assertion and reseed validation.
- The package contains no database writes, no user creation, no prediction seeding, no service-role credential use, no scoring change, no resolver change, no route change and no Migration 019.
- Original Predictor and KO Predictor remain separate; combined totals and blended standings remain prohibited.
- The generator fails closed outside Euro staging and blocks WC26 production.
- Active migrations remain 21.

Next sequenced package: Stage 16A-P6A — Seed write acceptance plan only. It must remain docs/audit/test-only and must define the exact acceptance evidence before any write-capable skeleton exists.


## Stage 16A-P6A seed write acceptance plan only

Stage 16A-P6A — Seed write acceptance plan only is accepted as a docs/audit/test-only package. It defines the exact acceptance contract for a later explicitly approved staging seed write slice before any write-capable skeleton exists.

Confirmed product boundaries:

- The plan records `writesDatabase: false`.
- The plan records `canStartWrite: false`.
- The plan records `hasWriteExecutor: false`.
- The plan records `requiresExplicitNextSliceApproval: true`.
- The plan records exact local environment names only and does not read or print secret values.
- The plan records exact later-slice flags: `STAGE16A_ALLOW_STAGING_SEED_WRITE=true` and `STAGE16A_SEED_TEARDOWN_CONFIRMATION=I_UNDERSTAND_STAGE16A_SYNTHETIC_TEARDOWN_ONLY`.
- The plan requires dual synthetic teardown markers: `@synthetic.euro28.test` and `synthetic_euro28: true`.
- The plan requires zero-residue proof before reseed and reseed validation proof after reseed.
- The package contains no database writes, no user creation, no prediction seeding, no service-role credential use, no scoring change, no resolver change, no route change and no Migration 019.
- Original Predictor and KO Predictor remain separate; combined totals and blended standings remain prohibited.
- The model fails closed outside Euro staging and blocks WC26 production and `main`.
- Active migrations remain 21.

Next sequenced package: a default-off write-capable skeleton only after explicit approval. It must not combine Auth user creation, profile rows, provisional teams, predictions, leagues, corrections, scoring oracle and teardown in one oversized patch.


### Stage RULES-1A — Rules hub UI upgrade

`#/how-to-play` is now the product rules hub rather than a minimal mechanics page. It surfaces scoring from the central scoring constants, keeps Original Predictor and KO Predictor separate, explains lock timing, corrections, name policy, privacy/deletion expectations, support-contact status and the tie-break tournament gate. The remaining RULES-1 signup decisions are still owner-owned: support contact, Supabase data region, email confirmation and capacity/tier. This rules hub slice is UI/model/docs/audit-only with no Supabase writes, no scoring/resolver changes, no route change and no migration.


## CONTRACTS-REF-LOCKED-SURFACES-3 — v9 locked surfaces and planning record

Stage `CONTRACTS-REF-LOCKED-SURFACES-3` records the v9 package as the current source of truth for visual-contract references, missing-surface planning, edge-case rules and remaining-stage sequencing.

### Approved visual contracts now recorded

The approved reference library now includes the already recorded Groups, Leagues / League table D, Original Bracket G and KO Predictor F contracts, plus the newly installed approved contracts for:

- Results — official/live data only, with Groups, Tables and Knockouts tabs; every result opens Match Centre; Leaderboards remain separate.
- Leaderboards — separate player-standings destination; Original and KO Predictor standings remain separate; every row opens Player View.
- Offline Player Claim — code-based league-admin claim flow, one-way, preserving predictions, jokers, points and history.
- Bracket Health — approved only as the Health tab inside the Bracket page; it compares saved Original Bracket predictions against live/real route health without mutating picks.
- Team Profile Sheet — objective/app-owned team context only; no squad/player/odds content; community expectation stats only after lock.
- Shared States — More menu, shimmer loading, calm error, unknown route, invite/join and privacy placeholders.

Home B, Match Centre A, Player View A, Points Breakdown A, Account B, Tournament Overview A, How to Play / Rules Hub A and Admin Control Room A remain approved visual contracts at their existing reference filenames.

### Streamlined remaining batch order

Future work should follow this grouped order unless Nicky explicitly re-sequences it:

```text
0. CONTRACTS-REF-LOCKED-SURFACES-3
1. STAGE-RULES-SCORING-LOCK-1
2. STAGE-ENTRY-AND-REVIEW-JOURNEY-1
3. STAGE-MORE-ACCOUNT-TRUST-1
4. STAGE-LEAGUE-SETUP-AND-INVITES-1
5. STAGE-TOURNAMENT-STORY-SURFACES-1
5A. STAGE-CORE-PAGE-ADOPTION-1
5B. STAGE-CORE-PAGE-ADOPTION-2
6. STAGE-LEAGUE-MANAGEMENT-1
7. STAGE-CONTEXTUAL-SURFACES-1
8. STAGE-CANDIDATE-TEAM-POOL-1
9. STAGE-ADMIN-SCENARIO-RUNNER-1
10. STAGE-LEGACY-REFERENCE-CLEANUP-1
11. STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1
```

Inserted core-page adoption stages:

- `STAGE-CORE-PAGE-ADOPTION-1` — Groups, Original Bracket and KO Predictor rebuilt natively to approved contracts. This stage is cosmetic-plus-recorded-interactions under the visual-contract rule and must make zero functional change beyond what each contract records. Existing behaviour tests pass unmodified or the agent stops and reports. The Groups adoption consumes the shared predicted-tables and third-place components; if the missing Original bracket coherence, predicted group standings or shared third-place-table rows are not FUNCTIONAL when the stage starts, they are prerequisites and must land first or within this stage as their own slices.
- `STAGE-CORE-PAGE-ADOPTION-2` — Results and Leaderboards rebuilt to approved contracts. Results carries two recorded functional additions and therefore needs behaviour tests: live knockout projection via `resolveGroupTable` and the third-place allocator under the existing no-second-calculator rule, with the projection → confirmed → real-result state model; and Match Centre navigation from every result card. Leaderboards is cosmetic-only against its approved contract.

Readiness gate amendment: `STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1` cannot be accepted until every approved visual contract in `docs/reference-prototypes/` is either implemented on its live surface or explicitly deferred with a recorded reason and owner. The current approved visual-contract inventory count is 20 HTML files.

### Rules and trust decisions carried forward

- Final standings tie-break ladders are separate for Original Predictor and KO Predictor. Original final standings use closest total goals, most exact group-stage scores, most correct group-stage results/outcomes, knockout accuracy cascade, then shared position. KO final standings use most exact KO scorelines, most correct KO outcomes, then shared position.
- Results and Leaderboards stay separate. Results is official/live data only; Leaderboards owns player standings.
- Home must answer “What should I do now?”, show one Original Predictor countdown before the tournament and show zero KO Predictor presence before KO readiness.
- Dynamic pages must not flash the wrong CTA, lock state, account state, guest state, competition state or navigation action while resolving. Use neutral shimmer/skeleton states until canonical state is known.
- Contextual surfaces opened from known origins must return to that origin. Do not add permanent nav items to solve return paths.
- Review Picks is needed at `/#review` as the final Original Predictor completion checklist and becomes read-only after lock.
- Prediction Trends is approved at `/#prediction-trends`, appears only after Original Predictor lock and remains Original Predictor-first, with KO Predictor trends only as clearly labelled secondary content.
- Support and Privacy remain public-signup gates. Public registration remains closed until moderation, support/deletion, email confirmation, capacity and privacy gates are implemented and accepted.

### Resolver and prediction-flow edge cases

- If completed predicted group scores leave teams tied after all supported score-derived tiebreakers, the app must prompt the user to either change scores or pick the intended order. The choice records intended predicted order only; it awards no extra points and never overrides calculable tiebreakers.
- If two or more third-place teams are tied across groups after all supported calculable rules and the tie affects qualification or bracket placement, the app must prompt the user to change scores or pick the intended third-place ranking order.
- If group-score edits after Original Bracket creation change predicted qualifiers or paths, affected bracket sections must be marked for review rather than silently preserving stale picks.
- Applying a group-stage or KO Predictor joker should use a confirmation modal explaining the doubling effect and the remaining competition-specific allowance. Group-stage and KO Predictor jokers remain separate; Original pre-tournament bracket picks do not use jokers.
- Group goals are auto-calculated only from the 36 group-score predictions. Review must not allow manual group-goals editing.
- The Original Predictor lock should preserve an auditable locked prediction snapshot including lock timestamp, group match predictions, jokers, manual tiebreak choices, Original Bracket picks, champion, top scorer, calculated group-goals total and league context where relevant.
- Joining a league after lock should not remove or reduce valid points if the user submitted valid predictions before the deadline, subject to normal league visibility/membership rules.
- KO Predictor scoring must include explicit edge-case examples before implementation.
- Delayed, postponed, suspended, abandoned, replay-required and result-pending match states must not score until the official result state is valid.

### Future admin/data stages

- `STAGE-CANDIDATE-TEAM-POOL-1` remains a future admin/data stage: official draw slots A1–F4 stay stable; candidate/qualified teams are assigned to slots later by Admin; assignment changes display identity only and must not rewrite predictions, scores, jokers, bracket picks or Review state.
- `STAGE-ADMIN-SCENARIO-RUNNER-1` remains a future safety-critical staging/admin tool. Fake clock plus fake scores may simulate the tournament for testing, but simulated results must never become the official result source of truth, must be ignored by normal scoring and must not pollute real leaderboards, Bracket Health, Prediction Trends or public Results in normal mode.

## Stage STAGE-RULES-SCORING-LOCK-1 — Rules/scoring lock

Status: recorded as the locked product rules target before the Entry/Review journey stage.

This stage supersedes earlier provisional scoring notes in the decision register with the locked product target recorded in `docs/RULES-SCORING-LOCKED-CONTRACT.md` and `docs/archive/STAGE-RULES-SCORING-LOCK-1.md`.

Locked Original Predictor scoring:

- correct group match result: 3 points;
- correct group match score: 5 total, not cumulative;
- correct exact group position: 2 points per team;
- all 4 group positions correct in one group: +5 bonus;
- correct team in Round of 16: 8 points per team;
- correct team in Quarter-final: 12 points per team;
- correct team in Semi-final: 15 points per team;
- correct team in Final: 20 points per team;
- correct Champion: +25 bonus;
- exact calculated group-goals total: 25 points;
- calculated group-goals total within 5: 15 points;
- calculated group-goals total within 10: 5 points;
- correct top scorer: 30 points.

Locked KO Predictor scoring:

- correct 90-minute score: 10 total, not cumulative;
- correct advancing team without exact score: 5 points;
- correct 90-minute result: 5 points for draw/advancement edge cases;
- correct method of advancement: +3, requiring correct advancing team;
- correct first-goal time bracket: +3 provisional/API-dependent.

Locked edge-case decisions:

- group goals are auto-calculated only from the 36 group-score predictions and are not manually editable;
- unresolved in-group prediction ties prompt the user to Change scores or Pick positions;
- unresolved best-third prediction ties prompt the user to Change scores or Pick positions where qualification or bracket placement is affected;
- selected tied-team/third-place order does not award points and must not affect official real tables;
- bracket picks affected by later group-score edits must be marked for review;
- joker application should use a confirmation modal and correct competition-specific allowance;
- delayed, postponed, suspended, abandoned, replay-required and result-pending matches do not score until the official result state is valid;
- final Original and KO Predictor tied ranks use separate ladders and never combine competitions.

Boundary: this stage records the product contract. It does not update runtime scoring, Supabase schema, migrations, resolver behaviour, official result entry, Auth, RLS or fake-result writes. Active migrations remain 21 and Migration 019 is applied.


### STAGE-ENTRY-AND-REVIEW-JOURNEY-1 — Entry and Review journey contract

Recorded after `STAGE-RULES-SCORING-LOCK-1` as the governing contract for Home clarity, Review Picks, Welcome and Invite/Join. The stage locks the progress-aware CTA ladder, Review completion blockers, no wrong-state flicker requirement, unresolved in-group tiebreaker prompt, best-third prompt, bracket invalidation warning, joker confirmation modal, calculated-only group-goals display, locked prediction snapshot and invite/join states.

Scope is docs/audit-only. It does not change runtime UI, routes, scoring, resolver, Supabase, Auth, result-entry or migrations. Active migrations remain 21 and Migration 019 is applied.

STAGE-MORE-ACCOUNT-TRUST-1 marker record: Support route/content; admin-only link visibility; Public signup remains closed until implementation gates are complete; Migration 019 remains blocked.

### STAGE-LEAGUE-SETUP-AND-INVITES-1 — League Setup and Invites contract

Recorded after `STAGE-MORE-ACCOUNT-TRUST-1` as the governing contract for the create league flow, join league flow, invite-code states, invalid/expired/full league states, league privacy explanation, empty league states, member list clarity, post-signup/post-login league continuation and league share/invite copy.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, league membership writes, scoring, resolver, result-entry or migrations. Active migrations remain 21 and Migration 019 is applied.

Public signup remains closed until implementation gates are complete. Join codes do not bypass signup/auth gates, joining a league after lock should not remove valid pre-deadline prediction points, and league membership does not combine Original and KO points.

Implementation must use `docs/LEAGUE-SETUP-AND-INVITES-CONTRACT.md` as the target, preserve Original Predictor and KO Predictor standings as separate competitions, and cover all invite-code states before claiming the flow complete.

STAGE-LEAGUE-SETUP-AND-INVITES-1 marker record: create league flow; join league flow; invite-code states; invalid/expired/full league states; league privacy explanation; post-signup/post-login league continuation; league share/invite copy; Public signup remains closed until implementation gates are complete; Migration 019 remains blocked.



### STAGE-RESULTS-AND-SCORING-TRUST-1 — Results and Scoring Trust contract

Recorded after `STAGE-LEAGUE-SETUP-AND-INVITES-1` as the governing contract for results status wording, scoring explanation, correction/recalculation wording, why did I get these points? clarity, Original vs KO points separation, admin result-entry trust copy, pending/delayed/postponed/suspended/abandoned/replay states, leaderboard freshness wording and fake/simulated result separation.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 21 and Migration 019 is applied.

Public signup remains closed until implementation gates are complete. Result surfaces must not imply final points before official confirmation/recalculation, and simulated results must never be confused with real official results or award real points.

Implementation must use `docs/RESULTS-AND-SCORING-TRUST-CONTRACT.md` as the target, preserve Original Predictor and KO Predictor points as separate competitions, and cover all non-standard match states before claiming the flow complete.

STAGE-RESULTS-AND-SCORING-TRUST-1 marker record: results status wording; scoring explanation; correction/recalculation wording; why did I get these points? clarity; Original vs KO points separation; admin result-entry trust copy; leaderboard freshness wording; fake/simulated result separation; Public signup remains closed until implementation gates are complete; Migration 019 remains blocked.


### STAGE-ADMIN-OPS-TRUST-1 — Admin Ops Trust contract

Recorded after `STAGE-RESULTS-AND-SCORING-TRUST-1` as the governing contract for admin control-room trust wording, result-entry guardrails, correction/recalculation audit explanation, fixture schedule/edit trust wording, admin roles explanation, fake/simulated scenario separation, owner-only dangerous action wording, operation history clarity and public/admin trust boundaries.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, fixture writes, result writes, admin-operation writes, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 21 and Migration 019 is applied.

Public signup remains closed until implementation gates are complete. Admin Scenario Runner output, fake scores, synthetic seed runs and simulated results must never be confused with official results, never award real points, never pollute production and never write to canonical official results.

Implementation must use `docs/ADMIN-OPS-TRUST-CONTRACT.md` as the target, preserve Original Predictor and KO Predictor as separate competitions, explain admin roles and guardrails clearly, and make dangerous owner-only actions and operation history understandable before claiming the admin operations trust layer complete.

STAGE-ADMIN-OPS-TRUST-1 marker record: admin control-room trust wording; result-entry guardrails; correction/recalculation audit explanation; fixture schedule/edit trust wording; admin roles explanation; fake/simulated scenario separation; owner-only dangerous action wording; operation history clarity; public/admin trust boundaries; Public signup remains closed until implementation gates are complete; Migration 019 remains blocked.

### STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-1 — Public Signup Implementation Readiness contract

Recorded after `STAGE-ADMIN-OPS-TRUST-1` as the governing contract for public signup gates mapped to owner decisions, email confirmation ON expectations, support/contact-admin flow, 250-user / 20-league capacity guardrails, conservative privacy wording, display-name moderation expectations, low-cost/free hosting assumptions, exact “still closed until implementation” wording and explicit checks before any Auth config change.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, browser writes, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 21 and Migration 019 is applied.

Public signup remains closed until implementation gates are complete. This stage is readiness recording only; it must not be treated as permission to open registration, change Supabase Auth settings or publish a public signup form.

Implementation must use `docs/PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-CONTRACT.md` as the target, preserve email confirmation ON expectations, keep capacity guardrails at 50 users / 20 leagues before SMTP and 100 users / 20 leagues after email delivery is reviewed, and complete display-name moderation expectations before claiming public signup readiness.

STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-1 marker record: public signup gates mapped to owner decisions; email confirmation ON expectations; support/contact-admin flow; 250-user / 20-league capacity guardrails; conservative privacy wording; display-name moderation expectations; low-cost/free hosting assumptions; exact “still closed until implementation” wording; explicit checks before any Auth config change; public signup remains closed until implementation gates are complete; Migration 019 remains blocked.



## Stage STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1

STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1 records the first implementation guard for public signup: client-side pre-Auth display-name moderation, preservation of the existing display-name availability RPC check before Auth sign-up, email confirmation success copy, support/contact-admin and privacy gate visibility, and the rule that public registration remains closed until external Auth/config checks are confirmed. It makes no Supabase Auth dashboard/config change, no Supabase schema/RPC/RLS/service-role/browser write change, no scoring/resolver/result-entry/fake-result/league-write change and no Migration 019.


## Stage STAGE-PUBLIC-SIGNUP-OPENING-GATE-1

STAGE-PUBLIC-SIGNUP-OPENING-GATE-1 records the final pre-open checklist for public signup, visible “registration still closed / opening soon” state, explicit owner approval requirement before opening registration, confirmation that email confirmation is ON, confirmation redirect URLs are correct, confirmation capacity limits are acceptable, confirmation support/contact route is ready, confirmation display-name moderation is active, no Supabase Auth dashboard/config change in the patch and public registration remains closed.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, browser writes, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 21 and Migration 019 is applied.

A later opening stage may only proceed after explicit owner approval. This gate must not be treated as permission to open public registration.

STAGE-PUBLIC-SIGNUP-OPENING-GATE-1 marker record: final pre-open checklist for public signup; visible “registration still closed / opening soon” state; explicit owner approval requirement before opening registration; confirmation that email confirmation is ON; confirmation redirect URLs are correct; confirmation capacity limits are acceptable; confirmation support/contact route is ready; confirmation display-name moderation is active; public registration remains closed; Migration 019 remains blocked.

## Stage STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1

STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1 records the controlled public signup opening runbook, owner approval must be explicit, current and recorded, opening-gate checklist must be satisfied before any public opening, email confirmation must be checked in the external account settings, account redirect URLs must return to the Euro 2028 app, not WC26, display-name moderation remains before account creation, display-name availability remains before account creation, support/contact route remains visible for public users, initial capacity remains 50 users and 20 leagues before SMTP, with 100 users and 20 leagues as the post-SMTP target, unless replaced by a later owner decision, public registration remains closed until the owner completes the external opening action, and no Supabase Auth dashboard/config change in the patch.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, browser writes, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 21 and Migration 019 is applied.

A later opening stage may only change app-side public signup status or external opening behaviour after the owner confirms the controlled-open runbook. This stage must not be treated as permission to open public registration.

STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1 marker record: controlled public signup opening runbook; owner approval must be explicit, current and recorded; opening-gate checklist must be satisfied before any public opening; email confirmation must be checked in the external account settings; account redirect URLs must return to the Euro 2028 app, not WC26; display-name moderation remains before account creation; display-name availability remains before account creation; support/contact route remains visible for public users; initial capacity remains 50 users and 20 leagues before SMTP, with 100 users and 20 leagues as the post-SMTP target, unless replaced by a later owner decision; public registration remains closed until the owner completes the external opening action; Migration 019 remains blocked.

## STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1 — CLOSED / RECORDED

STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1 records the owner-checked external settings for the controlled public signup path. Euro staging project checked: gcfdwobpnanjchcnvdco. Email confirmation: ON. New user signups: still closed. Site URL / app URL: https://euro28-predictor-dev.netlify.app. Redirect URLs include Euro dev site: yes. Redirect URLs currently include local dev URLs: yes. WC26 URLs used for Euro auth return: no. Email templates editable without SMTP: no. Email templates mention WC26: unable to edit/check fully without SMTP. Custom SMTP required before branded public email templates: yes. Initial capacity accepted before SMTP: 50 users / 20 leagues. Target capacity after SMTP: 100 users / 20 leagues. Review point after SMTP: 75 users / 15 leagues. Support/contact route required: yes. Display-name moderation required: yes. Public registration remains closed; active migrations remain 21; Migration 019 is applied.

This stage replaces the earlier 250-user planning figure for the first opening path. Before SMTP/branded email delivery, the cap is 50 users and 20 leagues. After SMTP is configured and usage is reviewed, the next target is 100 users and 20 leagues, with review at 75 users or 15 leagues.


Capacity marker: initial capacity is replaced by the external settings check: 50 users and 20 leagues before branded email sending, then 100 users after email delivery is reviewed.

## STAGE-PUBLIC-SIGNUP-SMTP-READINESS-1 — CLOSED / RECORDED

STAGE-PUBLIC-SIGNUP-SMTP-READINESS-1 records custom SMTP as the next public-signup blocker. Custom SMTP is the next public-signup blocker. Custom SMTP must be configured before branded public email templates are relied on. SMTP sender address must be approved before public opening. SMTP reply-to/support destination must be approved before public opening. Confirm sign-up email template must be checked after SMTP is configured. Reset password email template must be checked after SMTP is configured. Invite or magic-link email template must be checked if enabled. Auth email templates must not mention WC26. Auth email templates should mention Euro 2028 Predictor or stay generic. No SMTP secrets may be committed. No SMTP password, token, API key or provider secret may be printed in logs. Email confirmation remains ON. Public registration remains closed.

Pre-SMTP capacity remains 50 users / 20 leagues. Post-SMTP target remains 100 users / 20 leagues. Post-SMTP review point remains 75 users / 15 leagues. Capacity must be reviewed before increasing beyond the post-SMTP target.

This stage is docs/audit-only. It does not configure SMTP, does not edit external Auth settings, does not open signups, does not create users, does not write profile rows, does not seed predictions, does not write league data and does not publish service-role credentials. No runtime route, Auth configuration, Supabase schema, RPC, RLS, service-role, browser write, scoring, resolver, result-entry, fake-result write, league-write or migration change is included. Active migrations remain 21. Migration 019 is not created. WC26 production remains blocked. Original Predictor and KO Predictor remain separate.

SMTP readiness marker: custom SMTP is the next public-signup blocker; pre-SMTP capacity remains 50 users / 20 leagues; post-SMTP target remains 100 users / 20 leagues; post-SMTP review point remains 75 users / 15 leagues; public registration remains closed; Migration 019 remains blocked.

## FINAL-DESIGN-CONTENT-SWEEP-1 — final design/content sweep

- FINAL-DESIGN-CONTENT-SWEEP-1
- Design/content sweep marker: player-facing copy must read like finished product copy
- Signup opening and SMTP remain parked for future launch readiness
- Rules Hub, Tournament overview, account messaging, Match Centre and Team Profile copy are polished before seeded-team testing.
- Admin Control Room may keep operational wording because it is a protected admin surface.
- Active migrations remain 21.
- Migration 019 is not created.
- WC26 production remains blocked.


## Stage 16A-P6B — Seed write executor preparation only

Status: accepted as no-write preparation before any write-capable seed executor.

Stage 16A-P6B records future executor module structure, blocked P6B write command names, local env-name boundaries, future P6C approval requirements, dual synthetic markers, zero-residue proof and reseed proof.

Safety markers:

```text
Stage 16A-P6B
Seed write executor preparation only
writesDatabase: false
canStartWrite: false
hasWriteExecutor: false
requiresExplicitNextSliceApproval: true
no database writes
no user creation
no prediction seeding
no service-role credential use
no Migration 019
```

Original Predictor and KO Predictor remain separate. Active migrations remain 21.

## Stage DP-PRIMITIVES — shared input primitives (owner rulings 2026-07-11)

Status: CLOSED / RECORDED. Delivered items 63/64/65/66. Full check suite green.
Implementation commit: `7c9a4bf`.

### What changed

`SelectField` became a genuinely custom-rendered listbox (button trigger + popover option
list). The native `<select>` is gone from the live product, so the iPhone wheel picker can
no longer survive a migration — this was item 65's critical finding. The native-control
ratchet SHRANK from 5 permitted controls to 4: the last sanctioned native `<select>` was
the one inside the SelectField primitive itself, and its `PRIMITIVE_SOURCES` allowance was
removed in the same commit as the element. `PRIMITIVE_SOURCES` is now empty — no file may
hold a native `<select>`.

Score entry was extracted into one shared `PredictionInputRow`, so Groups and KO Predictor
inherit identical behaviour by construction: vertical ▲/▼ steppers (48px, ±1, floor 0) plus
direct numeric entry. The high-score confirm (item 63) fires at 7+ on TYPED entry only —
a stepper tap marks the value confirmed instead, because deliberate tapping means you meant
it — and asks once per confirmed value.

### Correction to the record

The four PENDING-RECUT Admin Control Room allowlist entries were NOT selects. They are
three native date/time inputs (AdminControlRoomSections ×1, AdminFixtureOperations ×2) and
one checkbox (AdminScoringRecovery). Admin's dropdowns were already routed through
SelectField — which is exactly why they never appeared in the allowlist, and exactly why
they still produced the OS picker anyway. Rebuilding the primitive migrated them. The
three date/time inputs and the checkbox REMAIN allowlisted: no shared date or checkbox
primitive exists, and building one was out of scope.

### Owner rulings recorded 2026-07-11

- **Three component conventions ratified into the house conventions** (the design programme
  specified none of them): the popover-listbox convention (popover, not modal — ARIA listbox,
  Escape/Tab dismiss, focus returns to trigger, no hard focus trap); the inline-confirm
  pattern (designed in-row confirm, never `window.confirm`); and the tiebreak ▲/▼ idiom
  (vertical stepper ordering controls under the amber provisional role). Recorded in CLAUDE.md §5.
- **Both audit re-points ratified** as strictly tightening, not loosening. `check-groups-predictor`
  and `check-knockout-experiences` now assert `PredictionInputRow` and the full
  Groups → PredictionInputRow → ScoreInput composition chain (stricter than the single grep
  they replace); ScoreInput's read-only state is asserted via `data-score-input="readonly"`
  now that it owns a CSS module; and `PredictionInputRow` joins the Original Bracket's
  FORBIDDEN list, so the bracket can never acquire score entry through the new primitive.
- **JSX automatic-runtime pin ratified.** Vitest was transforming JSX with esbuild's classic
  runtime, so every rendered file needed an `import React` that nothing referenced, each one
  bought with a `no-unused-vars` disable. `vite.config.js` and `vitest.coverage.config.mjs`
  now pin the automatic runtime, matching plugin-react's browser build. The H1 eslint-disable
  ratchet TIGHTENED 48→45 total / 30→29 live.

### Item 64 boundary (unchanged, restated)

`TiebreakPositionPicker` is the COMPONENT half only: amber warning banner, manual position
picker, reset notice — driven by a STUB tie descriptor. The MODEL half (detecting undecidable
ties, feeding the third-place allocator, reset-on-edit) is scheduled with the Groups re-cut
and is NOT wired. See docs/UNRESOLVED-GROUP-TIEBREAKER-PROMPT.md.

### Follow-ups owner-scheduled 2026-07-11

- **jsdom test environment: APPROVED, as its own stage, BEFORE the Groups re-cut.** Not now.
  The repo has no DOM test environment, so keyboard navigation, stepper taps and the confirm
  flow are currently tested as pure decision tables plus static-markup ARIA assertions — no
  test actually presses a key or taps a stepper. The jsdom stage closes that gap and must
  land before Groups' re-cut wires the item-64 model.
- **DP-0 follow-up: `--dp-warning-border` has no light-theme value** (dark-theme only). The
  amber provisional surfaces avoid it and use `--dp-border-strong`, reading the amber signal
  from the banner fill and ink instead. DP-0 should supply the missing light value.
- **Residual eslint-disable debt:** with the automatic runtime pinned, the remaining
  `import React` disables reference nothing and can be swept, lowering the H1 caps further.
- **Unscanned legacy selects:** raw `<select>` elements remain in `src/pages/` and
  `src/components/admin/`, which sit outside `ACTIVE_UI_ROOTS` and so are invisible to the
  native-control ratchet. If any of those surfaces is still reachable, the OS picker still
  appears there. Owner decision pending.

Original Predictor and KO Predictor remain separate. Active migrations remain 21.

## 13. 13 July 2026 amendments — Original Bracket topology and the Share Card

### Amendment to Confirmed Decision 13 — the Share Card is a dedicated share layout

Confirmed Decision 13 (§10A) settled the Share Card as "the user's completed bracket rendered from
this converging wall-chart layout in the Euro 2028 Predictor identity", and stated it "is **not a
separate visual design** or separate bracket implementation".

By explicit owner instruction (2026-07-13), that clause is amended. The Share Card **is** a
dedicated, purpose-composed share layout at fixed dimensions — portrait **1080×1920**, rendered
client-side on a canvas, carrying the champion, the converging knockout chart, the auto-calculated
group-goals total, an optional band of the champion's three group scores, a reserved Top Scorer row
and the app's own name and join footer. It is not a screenshot of the live page, and it is not
constrained to the live page's markup.

Decision 13's remaining binding constraints stand and are honoured: the card uses the existing
canonical resolver and existing slot references, renders every team through circular ISO-keyed
identity, keeps predicted and live brackets strictly separate, works on every device including
phones, introduces no new bracket logic, data model or migration, and adds no product invariant.

**Stage 13P-A's share-image row is delivered.** The converging wall-chart row is delivered for the
predicted bracket (see the topology amendment below); the live bracket's converging presentation
remains scheduled.

### Amendment to the Original Bracket approved visual contract — wall-chart topology corrected

The approved seven-lane wall chart placed Round-of-16 ties in lanes by **match number** — 37–40 in
the left lane, 41–44 in the right. The canonical resolver pairs the quarter-finals:

    45 <- 39, 37     46 <- 41, 42     47 <- 44, 43     48 <- 40, 38
    49 <- 45, 46     50 <- 47, 48     51 <- 49, 50

so the half of the draw reaching semi-final 49 holds ties **39, 37, 41, 42**. Ties 41 and 42 feed a
**left-side** quarter-final and were drawn on the right; ties 38 and 40 were the mirror error. The
two ties beside a quarter-final were not the ties that fed it: the chart was not a bracket. It went
unseen because the live chart draws no connector lines between lanes, so nothing in it could
contradict the table. The share image was the first surface to draw real connectors and exposed it.

By owner ruling (2026-07-13) the live wall chart is corrected to the resolver's topology. The lanes
and placements are now **derived** from `EURO28_KNOCKOUT_MATCHES` in `src/journey/bracketWallTopology.js`
and consumed by both the live Original Bracket and the share image, so there is **one** placement
source. The hand-written `WALL_PLACEMENT` table and the hardcoded lane arrays are retired.

Consequences recorded:

- The left R16 lane now reads **39, 37, 41, 42**; the right reads **44, 43, 40, 38**. This is
  user-visible in both the desktop/opt-in chart and the phone list, which now reads down one half
  of the draw and then the other, as a wall chart does. Lane captions still list their match
  numbers ascending, because a caption names *which* matches are in the lane, not their order.
- **§5.8 audit amendment:** `scripts/check-stage13g-bracket-responsive-wallchart.mjs` previously
  required the literal strings `1, row: 2`, `4, row: 5` and `7, row: 8` in the presentation model —
  substrings of the incorrect hand-written table. The ratchet was pinning the defect. Those markers
  are replaced by checks that the shape is **derived from the resolver** and asserted against it in
  `src/journey/__tests__/bracketWallTopology.test.js`, and by a check that **forbids** a hardcoded
  lane table or placement table in either module. The gate is tightened, not loosened.
- The Bracket reference prototype (`docs/reference-prototypes/euro28-bracket-page-prototype-v2.html`)
  needs **no amendment**: it encodes lane roles by round and carries no match numbers, so it never
  asserted the incorrect composition.

### Original Bracket → Review continuation

The Original Bracket now carries the journey's forward call to action at the foot of the page —
"Continue to Review" — using the Review destination from the route registry, named in full, in the
same anatomy as the existing Groups → Bracket call to action. The prediction journey reads
Groups → Bracket → Review on every surface.

No scoring, resolver, Supabase write, Auth, service-role, fake-result, league-write or migration
change. Original Predictor and KO Predictor remain separate. Active migrations remain 21.

## 14. 15 July 2026 — Stranded Migration 021 recovered (owner ruling)

**The finding.** Migration `202607090021_euro28_venue_metadata` was **applied to both the local and
the Euro staging databases** (verified: staging's migration history via the Management API, and its
actual schema — the `venues.metadata jsonb` column and all nine `hostNation` values — both present
and matching), but **no migration file existed in `supabase/migrations/`** on `euro28-development`
(the repo topped out at `202607080020_euro28_matches_venue_fk`). The migration was authored on the
Mac branch (`dde00f5`, "Render Tournament page venues from the database") and applied to both
databases, but its file never merged to the mainline. This is the migration-side version of the
same-commit gap the documentation constitution guards against: a change reached two databases without
its file reaching the branch every agent works from.

**The ruling (owner, 2026-07-15): recover the file as `021`, do not renumber.** The exact `dde00f5`
file (sha256 `229b694c…`, byte-for-byte) was restored to
`supabase/migrations/202607090021_euro28_venue_metadata.sql`. This makes repo = local = staging:
`supabase migration list --linked` now shows local, remote and file all aligned at `202607090021`.
**No database was touched** — both already had `021` in their history; the repo merely regained the
file it should always have carried. Renumbering to `022` was rejected because both databases already
recorded `021`, so a renumbered file would show a phantom remote-only `021` and an unapplied local
`022` forever — manufacturing the very drift this resolves.

**Consequence — the future scoring migration's number.**
`scripts/sql/202607100021_euro28_dp_scoring_locked_contract.sql` is a *different* `021`, sitting
outside `migrations/`. When it is promoted to a real migration it **must be renumbered to `022` (or
later)** to avoid colliding with the venue-metadata `021` both databases already hold.

**Count correction.** Recovering the file makes the active migration count truthfully **21**. The
databases had held 21 since 9 July, so the count claimed across the governing docs (previously twenty)
had been understated since then; every running-anchor migration-count claim is corrected to 21 in this
same commit, and `docs/DATABASE.md`'s migration list (which had drifted to 14) is completed through 021.
CLAUDE.md §6 is unchanged: the venue host-nation facts are consistent with the recorded tournament
truth. Venue metadata is display-only editorial data (host nation); it changes no slot, scoring or
resolver premise.
