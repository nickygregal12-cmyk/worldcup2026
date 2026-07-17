Warning: truncated output (original token count: 47161)
Total output lines: 2027

## Stage PRODUCT-EXPERIENCE-FINAL-BATCH-1 (2026-07-17 — implementation checkpoint)

Owner eye-test amendment: the phone Groups score area must use the compact composition of the
existing arrow-stepper/direct-entry primitive so a fixture fits without browser zoom. Results must
not expose the whole 51-match feed, empty live tables and unresolved bracket as equal first-level
content before kick-off. Its first level is phase-aware and fixture-led; the canonical full feed is
retained behind progressive disclosure, qualification appears after official group activity, and
the real knockout bracket becomes first-level content only as the group stage approaches its end.
These are presentation and information-hierarchy amendments only; result truth, resolver output,
scoring and competition boundaries are unchanged.

The first implementation slice under the final Product Experience authority establishes the shared
qualification compound and upgrades Tournament. Groups, Results and Tournament consume one group
standings and six-team third-place presentation backed by the canonical resolver output; the top
four third-place teams are labelled explicitly and teams use the shared ISO-keyed flag identity with
Team Profile activation. Tournament consumes the existing official-result read and central confirmed
tournament facts for phase/progress, priority fixture, Match Centre routing, group directory,
qualification, format, dates, hosts and venues. Groups, Results, Bracket and How to Play remain
separate linked destinations rather than duplicated page content.

This is a read-only React/model/test/audit slice. It changes no scoring values, resolver rules,
prediction locks, Supabase writes, Auth, RLS, production data or migrations. The full repository
check passes; owner visual review remains required before acceptance. The separate official-data item to
consolidate venue facts onto the final database-backed source remains open and is not closed here.

## Stage PRODUCT-EXPERIENCE-FINAL-ADOPTION (2026-07-17 — owner-approved)

The owner approved `docs/reference-prototypes/euro28-product-experience-final.md` as the sole
binding visual/product-experience contract. It supersedes Product Experience v3 and every older
page prototype on appearance and on its explicit behaviour amendments. Those older references are
retained as provenance and continue to supply content/interaction requirements only where the final
contract does not amend them. Prototype markup, people, fixtures, points and calculations are not
production source and must not enter the live module graph.

This final direction retains the existing light/dark palette, five-position app shell, Original/KO
competition boundary, central data/service ownership and server-enforced locks/privacy. It adds the
destination-based Player Profile hub, mutually exclusive League Table/Activity views, upgraded Team
Profile, stage-aware Match Centre and a useful Tournament football-reference destination. Every
group-table or qualification context must compose the shared third-place qualification table from
the canonical resolver data; emoji icons/flags and page-local tournament facts are prohibited.

The old master tracker is reconciled into the production implementation tracker as parallel visual,
prediction-write, scoring, CI, signup/moderation, simulation, live-readiness and official-data work
programmes. A visual rebuild cannot silently close one of those correctness or launch-safety tracks.
Implementation proceeds in controlled batches with focused enforcement, full checks and owner visual
review. This adoption changes no runtime page, scoring, resolver, Auth, Supabase write, RLS,
production data or migration.

## Stage FINAL-LEAGUES-VERTICAL-SLICE (2026-07-17 — owner visual direction)

The owner selected the navy/sky, compact FPL-style Leagues review as the final production direction
instead of continuing to reconcile competing prototype families. The final page hierarchy is global
competition collection first, competition-specific league selection second, selected league identity
and phase-aware rank/share context third, then the compact standings table. Original and KO leagues
remain separate entities with separate memberships; this is a navigation hierarchy amendment, not a
combined-league model.

The generic Leagues and Player View page introductions are retired where they duplicate the page-owned
context and push the primary controls below the first phone viewport. Every standings row opens the
compact player sheet, which preserves full profile, complete points receipt, H2H and Original Bracket
health routes. The default standings table remains rank, player and points because exact-score counts,
source splits and other evidence do not belong in every compact row unless a canonical aggregate read
supplies them.

The older standalone League HTML is retained only as provenance and is no longer an active visual
implementation authority. Production React components, shared tokens, domain models, services and
Supabase reads remain mandatory; hard-coded prototype people, points, flags and tournament state remain
prohibited. This stage makes no scoring, resolver, Auth, Supabase write, result-entry or migration change.

## Stage PRODUCT-EXPERIENCE-V3-SLICE-2 (2026-07-16 — owner scope and audit amendments)

The second Product Experience v3 slice is authorised as a whole-site coherence pass, with Leagues
and player evidence as the first implementation focus. A page upgraded in this slice must use the
shared v3 shell, tokens, identity and loading treatment; every route not upgraded now must appear in
the living route-adoption register in `docs/PRODUCT-COMPLETENESS-ROADMAP.md`. No route may silently
remain on the old visual system.

Owner-confirmed scope:

1. Original Predictor remains globally locked at the first tournament kick-off. KO Predictor remains
   a separate bonus game, locks per real knockout fixture and stays visually secondary until the group
   stage officially ends.
2. The Leagues phone viewport changes with tournament phase: sharing is primary before kick-off;
   rank, points, gap and live Match Centre context take over once scoring begins. Original/KO league
   collection tabs appear only after KO prediction opens and never reuse a league across competitions.
3. A league member opens a compact profile sheet first. The full profile then owns Overview, a complete
   points receipt, released predictions, Original Bracket health, predicted tables and H2H. Points
   evidence remains visible wherever the viewer is authorised to see the scored row, independently of
   full-profile permission.
4. H2H must explain the scoreline through point sources, decisive match swings and visibly different
   selections. Match Centre remains the canonical destination for each fixture's result and league
   prediction impact.
5. Signed-out visitors are intended to view public leaderboards without receiving a personal rank.
   The current leaderboard RPC is authenticated-only, so this requires a dedicated RLS/RPC review and
   migration stage; the UI must state the current preview limitation and must not simulate public data.
6. Staging audit, scoring and synthetic test records must be cleared through the guarded tournament
   readiness procedure before launch, not during this visual implementation batch.

Audit amendments are explicit under Constitution §5.8: the League Setup audit no longer requires a
disabled Settings placeholder; the site-access audit keeps both competition routes but requires Home
to phase-gate KO prominence; and Player View implementation/polish audits follow the extracted
`PlayerViewPresentation` module and the new Overview-first language. The Player Insight audit now
requires the always-visible full receipt plus source/swing H2H story instead of the retired nested
`PlayerInsight` cards, and the League Lifecycle audit follows its release copy in the shared
comparison model rather than requiring duplicate presentation copy. The Stage 13D integration gate
likewise asserts both Original global-lock and KO fixture-release model copy instead of a retired
generic sentence. The League Detail Destination gate now requires the approved Overview-first full
profile link rather than the superseded Predictions-first link. The Player/Team Lifecycle gate now
accepts the redesigned H2H surface rendering its central lifecycle note directly instead of passing
that context into the retired pair of nested Player Insight cards. The Player Comparison gate now
asserts the central lifecycle and competition-release models consumed by H2H instead of requiring
their sentences to be duplicated inside the presentation file. The Bracket Health gate follows the
Player View controller into the extracted presentation module where the competition-scoped health
panel now renders. These are contract-aligned audit
repairs, not weaker coverage. This slice makes no scoring, resolver, Auth, Supabase, result-entry,
production-data or migration change.

## Stage PRODUCT-EXPERIENCE-V3-SLICE-1 (2026-07-16 — implementation checkpoint)

The first Product Experience v3 implementation slice is present in the working tree and awaits
owner visual approval. The slice covers visual CI, mobile shell, More, Home hierarchy, Groups
landing, Original Bracket emphasis, independent league collections, quick player profiles,
competition-scoped Player View links and Match Centre points-target presentation. It deliberately
does not claim pinned-rival persistence, the complete dynamic Results impact story or final visual
approval. Existing central models, services, database reads, privacy gates and competition locks
remain authoritative; no scoring, resolver, Auth, Supabase write, result-entry, fake-result,
production-config or migration change is included.

## Stage DESIGN-REFRESH-V3-ADOPTION (2026-07-16 — owner rulings, final)

`docs/reference-prototypes/euro28-product-experience-v3.md` is adopted as the binding Product
Experience v3 contract. It supersedes the Design Programme and earlier page prototypes on visual
treatment and on the explicit behaviour amendments it records. Earlier artefacts remain provenance;
their functional/content requirements still carry forward where v3 does not amend them.

Owner-confirmed amendments recorded by this stage:

1. The five mobile navigation items share one alignment. Home keeps a slightly larger circular
   background that may overlap the bar edge, but the Home item itself is not raised.
2. Theme choice follows the device on first visit and remembers a later manual choice.
3. Home carries a quiet KO Predictor teaser from the start. Confirmed knockout fixtures may be entered
   as they become known; KO becomes prominent only after the group stage officially ends.
4. Groups keeps By group and By date, persists the choice, positions the next relevant match on entry,
   and makes every match card a Match Centre route without stealing embedded-control taps.
5. Original Bracket stays separate from KO Predictor, defaults to round-by-round on phones, retains an
   optional wall chart and strengthens selected winner paths.
6. Leagues remain single-competition entities per Migration 019. Once KO prediction opens, the Leagues
   page may show large Original/KO collection tabs; each tab owns separate leagues and an empty KO tab
   offers Create or Join rather than reusing an Original league.
7. Results become match-state dynamic and explain canonical table, points, league and bracket effects.
8. Player activation gains a compact profile sheet, permissioned full profile, persisted pinned rivals,
   points-swing H2H and a complete scoring audit. Points evidence remains available to anyone authorised
   to see the scored row even when full-profile access is unavailable.
9. More becomes a grouped lifecycle-aware directory for high-traffic destinations omitted from the
   five-position mobile navigation.

Boundaries unchanged: Original and KO competitions never combine; scoring values and resolver logic are
not changed; guest mode remains browser-only and unscored; public signup remains closed; simulated
results remain isolated; WC26 production remains blocked. This adoption record authorises the subsequent
v3 implementation stages but introduces no source, database, Auth, scoring, resolver or migration change
by itself.

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
2. stag…17161 tokens truncated… or resolver change, and no migration.


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

## 15. Stage DP-LEAGUES — Leagues re-cut (owner rulings 2026-07-15)

The Leagues surfaces are finalised onto the Design Programme (per the 2026-07-09 finalisation
standard): gradient hero replaced by a compact DP strip, all three CSS modules moved to `--dp-*`
tokens, the dead pre-DP global stylesheet deleted (commit `08d7f5f`), 48px touch targets, and the two
never-reviewed rebuild bugs fixed (the joker-gold member dot re-tokened to a neutral sky accent per
§5; the dead OS-native-picker CSS removed now that SelectField is a listbox). Two owner rulings govern
the stage and are recorded here as the durable record:

**Ruling A — single-competition wins; the prototype's hero switcher is superseded on this point.**
The approved Leagues contract (`docs/reference-prototypes/euro28-league-page-prototype.html`, "League
table D") shows an Original / KO segmented switcher inside one league's hero. The shipped model —
established by Migration `202607070019_euro28_league_single_competition` and the a2d5cb1 rebuild — is
that a league IS Original **or** KO, fixed at creation. **The build wins:** the re-cut has no
competition switcher and no tabs on the Leagues surfaces. The prototype's switcher is recorded as
**superseded on this one point**; the rest of the contract (compact match strip, full-row-to-PlayerView,
subtle chevrons, movement arrows, separate Original/KO tables, no last-score clutter) stands.
Consequence: the shared-tabs 48px touch-target debt does not fire on Leagues, because Leagues has no
tabs.

**Ruling B — rank movement and gap-to-leader are a designed not-yet state.** No previous-rank history
exists, so per-row movement chips would be empty scaffold. Movement is instead stated **once per
scored table** using the existing `RANK_MOVEMENT_PENDING_REASON` copy, and gap-to-leader is rendered
as **static text** on trailing members' rows — never a live chip, and **no previous-rank storage is
built** in this stage. **Retirement condition:** this not-yet state retires when the Results +
Leaderboards work builds rank history; at that point the movement chips become live and the once-per-
table note is removed. The dead `buildLeagueRaceSummary` model (no renderer, no importer) is deleted
in this stage, and the five stale league audits (c2–c6) are re-pointed at the re-cut source structure
— tightened, not loosened, with each retired marker replaced by an equal-or-stricter assertion and the
reason recorded in each script (Constitution §5.8). Their archived stage-record docs are removed from
the assertions in the same change.

No scoring, resolver, Supabase write, Auth, service-role, fake-result or migration change. Original
Predictor and KO Predictor remain separate. Active migrations remain 21.
