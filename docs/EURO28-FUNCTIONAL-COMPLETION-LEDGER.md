Stage DESIGN-PROGRAMME-ADOPTION-1 (2026-07-10) is accepted as a docs/authority-only adoption. It makes `docs/design programme/` the binding visual authority, superseding the Design Charter's visual direction (the Charter's non-visual rules remain live) and the Night Broadcast contract set; the 21 live `docs/reference-prototypes/` files keep their content/interaction contracts until each page's re-cut, with only visual treatment superseded. It records the 2026-07-10 owner rulings in the Decision Register (scoring per the locked contract; joker multiplier 2× doubling that match's score points only; KO draw-bonus rule with value PENDING/unset; design, guest-mode and font rulings), adds the joker-multiplier and KO draw-bonus amendments to `docs/RULES-SCORING-LOCKED-CONTRACT.md`, registers the programme in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, and installs the DP stage plan in `AGENT-CONTROL/09-STAGE-ORDER.md`. No functional change: no scoring runtime, resolver, Supabase write, Auth, service-role, fake-result, league-write or migration change; active migrations remain 21 and Migration 020 is applied. The runtime scoring alignment onto the locked contract (config/contracts still hold provisional 30/10/20 values) is deferred to the scoped Stage DP-SCORING and is not claimed complete here. One pre-existing package.json corruption from commit `2948c39` (inert native-controls paths appended to the `audit:stage-core-page-adoption-1b-original-bracket` script value, failing that audit's self-check) was corrected so `npm run check` can pass; native-controls coverage is unaffected (it is independently wired via `audit:native-controls` and `lint:foundation`).

Stage CONTRACTS-PROTOTYPE-V2-INSTALL is accepted as a docs-only visual-contract supersession. `euro28-home-page-prototype-v2.html`, `euro28-groups-page-prototype-v2.html`, `euro28-ko-predictor-prototype-v2.html` and `euro28-bracket-page-prototype-v2.html` are now the binding contracts for Home, Groups, KO Predictor and the Original Bracket. Their v1 predecessors are retained, not deleted, as `euro28-home-page-prototype-v1-superseded.html`, `euro28-groups-page-prototype-v1-superseded.html`, `euro28-ko-predictor-contract-v1-superseded.html` and `euro28-bracket-page-prototype-v1-superseded.html`; a `-v1-superseded` file is provenance only and is never implemented against. Home v2 replaces the twin countdown grid with a single countdown because the lock is the first kick-off, adopts Groups card language for the featured match, taps every match card through to Match Centre, orders content by pre-tournament/matchday-live/post-match state, and shows a "How scoring works" link pre-tournament only. Groups v2 replaces the hero/watermark/banner with a compact strip (view toggle, joker count with the new playing-card icon, progress), adds date/time/stadium/host-flag detail to cards, keeps the predicted group and third-place tables always reachable as collapsible sections, adds a "Continue to your bracket" CTA, and shows real score against pick with points chips in-tournament. KO Predictor v2 adopts Groups card language with "90 mins" score inputs, expands the same card inline on a 90-minute draw to capture Extra time or Penalties then the advancing team, shows a one-time dismissible notice that points do not combine across competitions, replaces by-group/by-date switching with a round rail, and has no completion flow (pending-fixture placeholders per round). Bracket v2 defaults mobile to portrait stacked pick-a-winner cards with tap-to-pick and no score inputs or jokers, offers a reversible "View as wall chart" opt-in in mobile landscape with the wall chart native on desktop/tablet, and gives the Locked state Bracket and Health sub-tabs that carry forward the approved Bracket Health contract (On your path, Alive on a different path, Route conflict, Out, plus the points-still-available strip). The predicted bracket stays strictly separate from live results, and Original Predictor and KO Predictor remain separate competitions. No implementation of any of the four pages is authorised by this record; each surface is separate, later work. No `src/`, `supabase/`, test, audit-script, scoring, resolver, Auth, service-role, fake-result or league-write change is introduced. It introduces no migration change; active migrations remain 21 and Migration 020 is applied. Active migrations remain 21 and Migration 020 is applied at the current head. Follow-up closed: `scripts/check-stage13g-reference-adoption.mjs`, `scripts/check-stage13g-groups-bracket-reference-adoption.mjs` and `scripts/check-stage13g-bracket-reference-adoption.mjs` were repointed at the v2 contracts in commit `0889c72` and pass; the earlier "now fail" wording in this entry described the state before that commit.

Stage EURO28-LEAGUES-SINGLE-COMPETITION-1 is accepted as the leagues single-competition schema change. Migration 019 (`202607070019_euro28_league_single_competition.sql`) adds a `leagues.competition` column (`original` or `ko_predictor`, fixed at creation, checked by `leagues_competition_is_known`) and backfills every pre-existing league row to `original`, since KO leagues never existed as a separate concept before this change. Joining a league no longer accepts a competition choice; it joins whichever competition the league already belongs to. `create_my_league`, `join_league_by_code` and `get_my_leagues` are updated to read and return the new column, and KO Predictor league creation is gated server-side by the new `private.euro28_ko_predictor_early_access(uuid)` function, which mirrors the same Round-of-16-resolved boundary the KO Predictor itself opens on (`buildKoReadiness().earlyAccess`). Active migrations remain 21 and Migration 019 is applied.

Stage `STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET` is accepted as the Original Bracket G live adoption slice. It upgrades the live Original Bracket surface with native Bracket G contract markers, a reinforced wall-chart frame, plain match detail chips, stacked mobile preservation, outside-edge R16 desktop columns and centred final placement. The Original Bracket remains winner-only with no score inputs, method controls or bracket jokers. This leaves KO Predictor F as the remaining `STAGE-CORE-PAGE-ADOPTION-1` slice. No scoring, resolver, Supabase write, Auth, service-role, fake-result, league-write or migration change is introduced; active migrations remain 21 and Migration 019 is applied.

Stage STAGE-PLAYER-FACING-COPY-SWEEP-2 is accepted as a broad copy/audit repair. It removes remaining internal/spec-style copy from player-facing surfaces before the next core-page adoption slice and adds a new audit gate to keep those phrases out of the live UI. No scoring, resolver, Supabase write, Auth, service-role, fake-result, league-write or migration change is introduced. Active migrations remain 21 and Migration 019 is applied.

# EURO 2028 PREDICTOR
## Functional Completion Ledger
### Version 1.72 — Groups By-date takes the prototype date rail; uniform Tables; reading column

Stage PROTOTYPE-PACK-CONSOLIDATION-1, Groups dock slice. By date becomes the prototype's rail of
matchday chips — sim-clock-aware "Today" when applicable — showing one matchday at a time instead
of every day stacked. The Tables affordance is uniform in both views: one button ending the rail
row, replacing the floating pill that overlapped cards (its audit pin re-pointed, tightened). The
whole Groups page sits in the prototype's ~45rem reading column so wide phones no longer stretch
the cards apart. The A–F chips share the row so the rail fits at 360px. No scoring, resolver,
prediction lock, Supabase write, Auth, RLS, production data, package or migration change. The full
repository check passes; owner visual review remains open.

### Version 1.71 — Groups drops the workspace hero for the prototype's quiet strip

Stage PROTOTYPE-PACK-CONSOLIDATION-1, Groups chrome slice. The navy "Group scores workspace"
disclosure flattens to a quiet one-line surface strip — the mandated autosave state and
lock/lifecycle cards stay behind it — so the page opens like the prototype: view toggle, joker
meter and progress, the A–F rail, then the match cards. Remaining Groups refinements are recorded:
sticky dock with the Tables button in the rail row, group in the card meta line, joker as a header
pill, Open/Locked status chips. No scoring, resolver, prediction lock, Supabase write, Auth, RLS,
production data, package or migration change. The full repository check passes; owner visual
review remains open.

### Version 1.70 — player quick view takes the prototype stat tiles

Stage PROTOTYPE-PACK-CONSOLIDATION-1, player-flow opener. The quick-profile sheet's standing
summary becomes the prototype's stat-tile trio: three bordered surface cards with big display
numerals and small uppercase labels, on certified contrast pairings. The sheet's content contract
(identity header, Full profile / Points / Head-to-head / Bracket actions, privacy line) already
matched the prototype drawer and is unchanged. The full profile hub and H2H re-cuts are the next
slices; exacts/outcomes tiles wait on the per-member aggregate stage. No scoring, resolver,
prediction lock, Supabase write, Auth, RLS, production data, package or migration change. The full
repository check passes; owner visual review remains open.

### Version 1.69 — Groups match cards take the prototype team rows

Stage PROTOTYPE-PACK-CONSOLIDATION-1, Groups team-row slice. The match card's identities become
the prototype's horizontal rows: flag beside the name (with the fail-loud Provisional line kept),
home left-aligned and away mirrored with its flag on the outer edge, via a new TeamLabel `reverse`
variant. The stacked-centered identity leaves the Groups card. Phone keeps the score controls on
their own row beneath the teams because steppers-plus-direct-entry at 48px targets is a locked
owner ruling the prototype's minus/plus stepper cannot satisfy. groups-predictor.css folds the
phone rules to one-liners and its frozen cap follows the file down (297 -> 293). No scoring,
resolver, prediction lock, Supabase write, Auth, RLS, production data, package or migration
change. The full repository check passes; owner visual review remains open.

### Version 1.68 — Home becomes the prototype page (pre-tournament flow)

Stage PROTOTYPE-PACK-CONSOLIDATION-1, Home slice. The pre-tournament Home is re-cut to the
prototype flow: one pitch-striped hero card carrying the kick-off pill (real lock date and venue),
the "N days to lock-in." display headline, the prediction meter and the primary actions
(Start/Continue predicting from the routed CTA, Build bracket); then the league card and the
"How scoring works" duo — scoring values rendered from the central versioned config, never prose;
then the opening fixtures (the model gains an additive openingMatches rail) and the mandated quiet
KO teaser. The old four-region pre layout, corner ribbon, unit-grid countdown and stat tiles leave
the pre flow; leaderboards stay on the live/post states and in More, per the prototype. The
fail-loud provisional indicator and the single lock-framed countdown are preserved and tested; the
retired ribbon test file is replaced by the new hero contract tests. The live-phase "as it stands"
rank hero and league preview need league standings wired onto Home and follow with the matchday
pass. No scoring, resolver, prediction lock, Supabase write, Auth, RLS, production data, package or
migration change. The full repository check passes; owner visual review remains open.

### Version 1.67 — Leagues owner-review corrections: compact rows, one manage surface, Live activity

Owner review of the Leagues re-cut demanded exact prototype fidelity. Standings rows compact to
the prototype's density (small rank, 48px-floor rows, right-hand points). Create/join collapses to
ONE surface: the dashed pair opens the single manage panel, which now also carries the danger
zone; the duplicate bottom panel and the League-details disclosure are deleted. The identity card
carries share AND copy-invite. Standings and Live activity are the prototype's mutually exclusive
views behind one toggle: activity is real — derived from the canonical official-result feed
(match scored/live entries linking to Match Centre) with an honest pre-tournament empty state;
member-level entries join when per-member scoring aggregates exist server-side, and per-matchday
and ceiling lenses wait on the same data stage (recorded follow-ups). The retired actions card and
match strip components are deleted, their behaviour pins re-pointed at the identity-card
affordances (shell, setup-invites, responsive, player-lifecycle audits — each cites the ruling).
No scoring, resolver, prediction lock, Supabase write, Auth, RLS, production data, package or
migration change. The full repository check passes; owner visual review remains open.

### Version 1.66 — full-redesign ruling; Leagues becomes the prototype page

The owner ruled the prototype pack is the final design, not an upgrade source: page chrome with no
prototype counterpart is removed, and production contributes data, services, locks, privacy,
accessibility and honest not-yet states. The ruling is recorded in the final contract. Leagues is
re-cut to the prototype flow exactly: collection tabs, chip rail, dashed create/join, the
pitch-striped surface identity card (name, members-and-code meta, share) and straight into the
standings table — the competition heading card, actions card and match strip leave the main flow,
with invite/share, lifecycle notes, the competition summary and the danger zone behind League
details below the rows. The hero-styling and shell audits were re-pointed at the new anatomy in
the same change. No scoring, resolver, prediction lock, Supabase write, Auth, RLS, production
data, package or migration change. Owner visual review remains open.

### Version 1.65 — Leagues adopts the prototype composition

Stage PROTOTYPE-PACK-CONSOLIDATION-1 slice two (owner-instructed page adoption, Leagues first) is
implemented in the working tree. The owner ruled the prototype pack the approved composition
authority page by page; the programme is recorded in the final contract. Leagues now composes the
prototype anatomy on production data: a chip-rail league switcher (buttons, no native select),
dashed Create league / Join with code entry actions, a compact identity card with name,
members-and-code meta and share, and the standings table with the dashed podium cutline under the
top three once real scoring separates the table. The shared-primitives, reference-adoption and
copy-sweep audits were re-pointed at the new idiom in the same change (tightened: the chip rail is
asserted directly and the native-select prohibition stands); the visual fixture's league rows
gained the post-Migration-019 competition field; a selected-chip contrast pairing was corrected to
the certified info-ink family after the token contrast-usage audit caught it. Last Man Standing and
Duels remain unbuilt pending owner rules and database stages; Bonus games ships KO-only later. No
scoring, resolver, prediction lock, Supabase write, Auth, RLS, production data, package or
migration change. The full repository check passes; owner visual review remains open.

### Version 1.64 — consolidated prototype-pack visual identity

Stage PROTOTYPE-PACK-CONSOLIDATION-1 is implemented in the working tree and awaits owner
phone/tablet/desktop light/dark review. The owner's three-prototype pack (v1-scottish-navy,
v2-matchday-programme, v3-final-hybrid) was genuinely compared with folder labels ignored; the
consolidated ruling is recorded in `euro28-product-experience-final.md` ("Consolidated visual
identity — prototype-pack review, 18 July 2026"). Implementation is system-level: the app header
becomes the navy broadcast masthead on the certified `--dp-surface-chrome`/on-chrome/sky pairings
in both themes; the corner-radius tokens flatten to the sharp editorial scale (2/4/6px) with
circles retained exclusively for identity; the mobile navigation becomes a ruled bar with a 2px
sky top rule while keeping the approved circular Home treatment, auto-hide and safe-area
behaviour; the shared third-place qualification table draws the dashed cutline on the first row
below the qualification boundary, covered by a focused test; hardcoded soft corner radii across
the live stylesheets were re-pointed at the radius tokens; and a real phone-width overflow on
Groups (the qualification tables' minimum width escaping grid items with default min-width) was
repaired so no route scrolls horizontally at 360px. v2's palette was rejected (its brand and
success are one green hex; the certified navy/sky palette and joker-gold exclusivity stand);
serif display numerals and CDN fonts were rejected (self-hosted Public Sans and Big Shoulders
Display stand). No scoring, resolver, prediction lock, Supabase write, Auth, RLS, production
data, package or migration change is introduced.

### Version 1.63 — phone Groups and phase-aware Results repair

Stage PRODUCT-EXPERIENCE-FINAL-BATCH-1-VISUAL-REPAIR is implemented in the working tree and
awaits owner phone/tablet/desktop light/dark review. Groups now composes the shared score-input
primitive in its compact layout: both 48px arrow controls and direct numeric entry remain, while
phone cards place the teams above one horizontal score row instead of retaining the oversized
desktop vertical geometry. Results now composes a phase-aware production experience: four opening
fixtures before kick-off; live, review or latest-result priority once play begins; a bounded next-
fixture list; qualification only after an official score; and the real knockout bracket only near
the end of the groups. The complete canonical feed remains available through a collapsed archive,
and every highlighted fixture routes to Match Centre with shared ISO-keyed flags. No scoring,
resolver, prediction lock, Supabase write, Auth, RLS, production data or migration change is
introduced. Focused model/component/interaction tests, the batch enforcement audit and the full
repository check pass; owner visual approval remains open.

### Version 1.62 — shared qualification and Tournament implementation

Stage PRODUCT-EXPERIENCE-FINAL-BATCH-1 is implemented in the working tree, passes the full
repository check and awaits owner phone/tablet/desktop light/dark review. Groups, Results and Tournament
now compose the same canonical group and six-team third-place qualification presentation; the top
four third-place qualifiers are explicit and team identity comes from the existing shared ISO-keyed
flag registry. Tournament now reads the canonical official-result snapshot and existing central
tournament facts to present phase/progress, a priority fixture with Match Centre routing, six groups
with Team Profile activation, qualification, dates, format, hosts and venues, plus routes into Groups,
Results, Bracket and How to Play. Focused tests and a new enforcement audit prevent the sixth
third-place team or a consuming surface from disappearing. This is a read-only presentation/model
slice: no scoring, resolver, prediction lock, Supabase write, Auth, RLS, production data or migration
change is introduced. The owner visual gate remains open and wider Team Profile, Groups live/predicted
switching and Tournament venue-source consolidation remain later tracked work.

### Version 1.61 — final Product Experience authority adopted

Stage PRODUCT-EXPERIENCE-FINAL-ADOPTION is accepted as a governance/audit-only supersession. The
sole binding visual/product-experience contract is now
`docs/reference-prototypes/euro28-product-experience-final.md`; Product Experience v3 and older
page prototypes are provenance. The contract records the approved shell, Groups/third-place
compound, Bracket and Health, separate KO competition, League Table/Activity switch, destination-
based Player Profile, Team Profile, stage-aware Match Centre, Results, Leaderboards, Tournament and
More direction. The old master tracker is reconciled into the delivery programme so visual work
cannot hide prediction-write, scoring, CI, signup, simulation, live-readiness or official-data
gates. No runtime UI, scoring, resolver, Auth, Supabase, RLS, production-data or migration change is
claimed by this row. Production implementation remains staged and requires owner visual approval.

### Version 1.60 — Product Experience v3 coherence and player evidence slice

Stage PRODUCT-EXPERIENCE-V3-SLICE-2 is implemented in the working tree and awaits full check and
owner visual approval. Leagues now prioritises the phase-relevant share, rank or live task; player
rows open a compact action sheet; Player View is Overview-first; points are presented as an
always-visible canonical receipt; H2H explains source gaps and decisive match swings; shared
skeletons replace bare loading copy; upcoming fixtures suppress stale result metadata; and wider
Groups layouts use the same match cards in two columns. Home keeps KO leaderboard prominence hidden
until full KO readiness. The route-adoption register now schedules every destination still awaiting
v3 treatment. Public signed-out leaderboard data remains a deliberate database-access stage because
the current RPC is authenticated-only. No scoring, resolver, Auth, Supabase, production-data or
migration change is included.

### Version 1.59 — Product Experience v3 first implementation slice

Stage PRODUCT-EXPERIENCE-V3-SLICE-1 is implemented in the working tree and awaits owner visual
approval. It adds deterministic visual CI, the aligned auto-hiding mobile shell, grouped More
directory, phase-aware Home ordering, Groups next-match landing and Match Centre links, stronger
Original Bracket prediction treatment, independent Original/KO league collections, compact player
profile sheets with competition-scoped deep links, authorised player bracket reconstruction, and a
mobile-first Match Centre with league scopes and current points-target states. Results and
Leaderboards now use clear destination and competition tabs. Production state continues to come
from existing models, services and database reads; no hard-coded player or tournament state enters
the production graph. Pinned-rival persistence, its cross-surface placements, fuller dynamic Results
impact storytelling and final visual polish remain later Product Experience v3 slices. No scoring,
resolver, Supabase write, Auth, service-role, result-entry, fake-result, production-config or
migration change is introduced; active migrations remain 21.

### Version 1.58 — Product Experience v3 authority adopted

Stage DESIGN-REFRESH-V3-ADOPTION is accepted as a docs/authority-only supersession. The binding
contract is `docs/reference-prototypes/euro28-product-experience-v3.md`. It supersedes earlier visual
treatment and records the approved shell, lifecycle, Groups, Bracket, KO, single-competition league
collections, Results, Match Centre, profile, H2H, pinned-rival and More direction. No runtime UI,
database, scoring, resolver, Auth, service-role, official-result, fake-result or migration change is
claimed by this row. Implementation remains staged and must receive visual approval.

### Version 1.57 — Groups player-facing copy repair

Stage STAGE-CORE-PAGE-ADOPTION-1A-GROUPS-COPY-REPAIR is accepted as a focused repair after the first Groups adoption slice. It removes internal lifecycle/config/save-contract wording from the player-facing Groups journey, replaces it with plain autosave, lock, joker and tables wording, and extends audit coverage so the internal terms cannot reappear on the live Groups/Prediction Journey UI. No scoring, resolver, Supabase write, Auth, service-role, fake-result, league-write or migration change is introduced. Active migrations remain 21 and Migration 019 is applied.

### Version 1.56 — Groups Night Broadcast contract adoption slice

Stage STAGE-CORE-PAGE-ADOPTION-1A-GROUPS is accepted as the first implementation slice under `STAGE-CORE-PAGE-ADOPTION-1`. It rebuilds the live Groups surface toward the approved Night Broadcast contract using native React/CSS only, adds the contract guardrail chips, live predicted-table preview cards and best-third preview, and keeps the existing by-group/by-date switcher, sticky Tables fast path, joker controls, save/lock/grace behaviour and shared predicted-tables/third-place model. This does not close the full `STAGE-CORE-PAGE-ADOPTION-1` row because Original Bracket G and KO Predictor F remain pending slices. No scoring, resolver, Supabase write, Auth, service-role, fake-result, league-write or migration change is introduced. Active migrations remain 21 and Migration 019 is applied.

### Version 1.55 — Core-page contract adoption scheduled

Stage `SCHEDULE-CORE-PAGE-CONTRACT-ADOPTION-1` is accepted as a docs-only sequencing fix. It inserts `STAGE-CORE-PAGE-ADOPTION-1` and `STAGE-CORE-PAGE-ADOPTION-2` into the v9+ order, hardens the tournament-readiness gate against approved contracts silently remaining unbuilt, and supersedes the old pre-v9 scheduled adoption rows by reference. The current approved visual-contract inventory is 20 HTML files in `docs/reference-prototypes/`. This package makes no `src/`, `supabase/`, test, audit, reference-prototype, scoring, resolver, Auth, service-role, fake-result-write or migration change. Active migrations remain 21 and Migration 019 is applied.

| Order | Stage | Status | Purpose |
|---:|---|---:|---|
| 5A | STAGE-CORE-PAGE-ADOPTION-1 | PARTIAL | Groups Night Broadcast and Original Bracket G adoption slices are implemented; KO Predictor F remains planned. Groups consumes shared predicted-tables and third-place components, and Original Bracket remains winner-only with a native wall-chart surface. |
| 5B | STAGE-CORE-PAGE-ADOPTION-2 | PLANNED | Results and Leaderboards rebuilt to approved contracts; Results includes behaviour-tested live knockout projection and Match Centre navigation from every result card; Leaderboards is cosmetic-only. |
| 11 | STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1 | PLANNED | Readiness cannot be accepted until all 20 approved visual contracts are implemented on live surfaces or explicitly deferred with a recorded reason and owner. |

### Version 1.53 — Approved visual anchors recorded

Stage DESIGN-CONTRACTS-APPROVAL-1 is accepted as a docs/reference-only visual-contract approval record. Groups remains approved as the Night Broadcast identity anchor in `docs/reference-prototypes/euro28-groups-page-prototype.html`; Leagues / League table D is approved in `docs/reference-prototypes/euro28-league-page-prototype.html`; Original Bracket G is approved in `docs/reference-prototypes/euro28-bracket-page-prototype.html`; and KO Predictor F is approved in `docs/reference-prototypes/euro28-ko-predictor-contract.html`. Bracket Health is now approved only as the Health tab inside the Bracket page. No `src/`, `supabase/`, test or migration change is introduced; no route, scoring, resolver, Auth, signup, Supabase write or service-role credential use/read/print change is introduced. Original Predictor and KO Predictor remain separate, predicted/live bracket contexts never blend, active migrations remain 21 and Migration 019 is applied.


### Version 1.54 — CONTRACTS-REF-LOCKED-SURFACES-3

Stage `CONTRACTS-REF-LOCKED-SURFACES-3` is accepted as a docs/reference-only recording stage for the v9 locked design and planning pack. It records the approved visual-contract inventory, corrected one-reference-per-surface install map, Home/missing-surface brief, streamlined remaining batch order, contextual return rule, final design sweep checklist, candidate team pool brief, Admin Scenario Runner brief, simulation safety guidelines, unresolved group tiebreaker prompt and Edge-Case Rules Addendum.

Reference prototypes newly installed in `docs/reference-prototypes/`:

- `euro28-results-page-prototype.html`.
- `euro28-leaderboards-page-prototype.html`.
- `euro28-offline-player-claim-prototype.html`.
- `euro28-bracket-health-prototype.html`.
- `euro28-team-profile-sheet-prototype.html`.
- `euro28-shared-states-prototype.html`.

Bracket Health is now approved only as the Health tab inside the Bracket page. Results and Leaderboards are separate destinations. Offline Player Claim, Team Profile Sheet and Shared States are approved visual/interaction references. Group goals are now recorded as auto-calculated only. Unresolved in-group and best-third-place prediction ties must prompt the user only after calculable score-derived tiebreakers fail.

This stage makes no `src/`, `supabase/`, test, migration, scoring, resolver, Auth, official-result-entry, service-role or fake-result-write implementation change. Active migrations remain 21 and Migration 019 is applied. Original Predictor and KO Predictor remain separate, predicted/live brackets never blend and WC26 production remains fail-closed.

| Order | Stage | Status | Purpose |
|---:|---|---:|---|
| 0 | CONTRACTS-REF-LOCKED-SURFACES-3 | ✅ ACCEPTED | Record v9 docs, approved references, edge-case rules and streamlined batch order. |
| 1 | STAGE-RULES-SCORING-LOCK-1 | PLANNED | Lock scoring, tiebreaks, group-goals auto-calculation, KO edge-case examples and match-state scoring rules. |
| 2 | STAGE-ENTRY-AND-REVIEW-JOURNEY-1 | PLANNED | Home, Review, Welcome, Invite/Join, unresolved tie prompts, bracket invalidation, joker modal and locked snapshot. |
| 3 | STAGE-MORE-ACCOUNT-TRUST-1 | PLANNED | More, Account, Support, Privacy, Settings, About and signup trust surfaces. |
| 4 | STAGE-LEAGUE-SETUP-AND-INVITES-1 | PLANNED | Create league, join league, invite-code states, privacy, empty/member states and post-auth continuation. |
| 5 | STAGE-TOURNAMENT-STORY-SURFACES-1 | PLANNED | Prediction Trends, Activity and Match Centre trends. |
| 5A | STAGE-CORE-PAGE-ADOPTION-1 | PLANNED | Groups, Original Bracket and KO Predictor rebuilt natively to approved contracts; Groups shared predicted-tables and third-place prerequisites remain explicit. |
| 5B | STAGE-CORE-PAGE-ADOPTION-2 | PLANNED | Results and Leaderboards rebuilt to approved contracts; Results carries live knockout projection and Match Centre navigation behaviour tests. |
| 6 | STAGE-LEAGUE-MANAGEMENT-1 | PLANNED | League Settings / Manage League and after-lock league-join copy. |
| 7 | STAGE-CONTEXTUAL-SURFACES-1 | PLANNED | Bracket Health, Team Profile, Shared States and contextual return. |
| 8 | STAGE-CANDIDATE-TEAM-POOL-1 | PLANNED | Candidate team pool and draw-slot assignment. |
| 9 | STAGE-ADMIN-SCENARIO-RUNNER-1 | PLANNED | Fake clock + simulated results with strict simulation safety. |
| 10 | STAGE-LEGACY-REFERENCE-CLEANUP-1 | PLANNED | Legacy/reference cleanup after replacements exist. |
| 11 | STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1 | PLANNED | Full tournament, load, scoring, readiness acceptance and the 20-contract implementation/defer-with-owner gate. |


Stage DESIGN-CONTRACTS-BATCH-0 is accepted as a docs/reference-only governance package. It records that approved self-contained HTML files in `docs/reference-prototypes/` become binding visual contracts for layout, hierarchy, composition, state coverage and Night Broadcast identity treatment, while remaining reference artefacts that must be rebuilt natively in the Euro design system. It creates no product behaviour and no approved page implementation by itself. Candidate design batches must stop for Nicky approval, then retain exactly one contract per surface. Groups remains the approved Night Broadcast anchor and is not redrafted. Batch 1 is Bracket plus KO Predictor, with Admin last. No `src/`, `supabase/`, test or migration change is introduced; no route, scoring, resolver, Auth, signup, Supabase write or service-role credential use/read/print change is introduced. Original Predictor and KO Predictor remain separate, predicted/live bracket contexts never blend, active migrations remain 21 and Migration 019 is applied.

Stage RULES-1B-SIGNUP-GATE-STATUS is accepted as a UI/model/docs/audit-only Rules Hub follow-on. The `#/how-to-play` page now visibly lists the unresolved public-signup gates: support contact, capacity and tiers, email confirmation, privacy region and name moderation. The slice does not open public registration and does not invent owner choices. No support address, capacity number, tier, email-confirmation setting, data region or blocked-word list is selected. No Supabase writes, Auth users, prediction seeds, service-role credential use/read/print, scoring changes, resolver changes, new routes or database migration are introduced. Original Predictor and KO Predictor remain separate, active migrations remain 21 and Migration 019 is applied.

Stage OWNER-SIGNUP-DECISIONS-1 is accepted as a model/test/docs/audit-only owner-decision pass. It records Contact admin support wording, an initial 250-user and 20-league public cap, current low-cost/free hosting/account-email planning with a review before capacity increases, email confirmation ON, simple privacy wording with no specific data-region claim until confirmed, moderation checks for racist, discriminatory, anti-immigrant, sectarian, abusive and inflammatory names, and a decision not to keep public registration invite-only once moderation and remaining safety checks are complete. Public registration remains closed. No signup flow is opened, no Auth configuration is changed, no Supabase writes, Auth users, prediction seeds, service-role credential use/read/print, scoring changes, resolver changes, route changes or database migration are introduced. Original Predictor and KO Predictor remain separate, active migrations remain 21 and Migration 019 is applied.

Stage PUBLIC-SIGNUP-READINESS-1 is accepted as a model/test/docs/audit-only product-completeness slice. The app now has one central public-signup readiness model consumed by the Rules Hub gate panel. Wider public registration remains explicitly not open while support contact, capacity and tiers, email confirmation, privacy region and name moderation are still open. No signup flow is opened or closed, no Auth configuration is changed, no support address, capacity number, tier, email-confirmation setting, data region or blocked-word list is selected, and no admin rename controls are implemented. No Supabase writes, Auth users, prediction seeds, service-role credential use/read/print, scoring changes, resolver changes, route changes or database migration are introduced. Active migrations remain 21 and Migration 019 is applied.


Stage PRODUCT-GATE-DECISIONS-1 is accepted as a docs/audit-only product-completeness decision register slice. It records the next owner/implementation rows for tie-break ladders, display-name and league-name moderation, capacity planning and email confirmation without inventing an owner choice. The exact capacity number, Supabase/Netlify tier, auth-email budget and final email-confirmation setting remain owner decisions before wide signups; tie-break and moderation implementation remain later scoped stages. No Supabase writes, Auth users, prediction seeds, service-role credential use/read/print, scoring changes, resolver changes, UI route changes or database migration are introduced. Original Predictor and KO Predictor remain separate, active migrations remain 21 and Migration 019 is applied.

Product completeness register alignment is accepted as a docs/audit-only scale-gate package. It records the consolidated product completeness roadmap, moves RULES-1, moderation, scalable support, capacity planning, email confirmation, privacy/deletion, tie-break ladders, load reality-check and uptime/error monitoring into explicit signup/tournament gates, and keeps owner-specific values as recorded decisions before wide signups. It does not execute Supabase writes, create Auth users, seed predictions, use or read service-role credentials, change scoring, change resolver logic, change UI routes or create a database migration. Original Predictor and KO Predictor remain separate, active migrations remain 21 and Migration 019 is applied.

### Version 1.47 — Stage 16A-P6A seed write acceptance plan

Stage 16A-P6A — Seed write acceptance plan only is accepted as a docs/audit/test-only no-write package. It records exact local environment names, exact later-slice write flags, exact synthetic markers, exact teardown selector, exact zero-residue proof and exact reseed validation proof while carrying `writesDatabase: false`, `canStartWrite: false`, `hasWriteExecutor: false` and `requiresExplicitNextSliceApproval: true`. It does not execute Supabase writes, create Auth users, seed predictions, use or read service-role credentials, change scoring, change resolver logic, change UI routes or create a database migration. Original Predictor and KO Predictor remain separate, active migrations remain 21 and Migration 019 is applied.

### Version 1.46 — Stage 16A-P5 staging write preflight

Stage 16A-P5 — Staging write preflight and teardown contract is accepted as a no-write preflight package. It records local environment variable names without reading or printing values, sets `canStartWrite: false`, requires `requiresExplicitNextSliceApproval: true`, preserves dual synthetic teardown markers, zero-residue assertion and reseed validation, and does not execute Supabase writes, create Auth users, seed predictions, use service-role credentials, change scoring, change resolver logic, change UI routes or create a database migration. Original Predictor and KO Predictor remain separate, active migrations remain 21 and Migration 019 is applied.

### Version 1.45 — Stage 16A-P4 seed SQL preview dry-run

Stage 16A-P4 — Seed SQL preview dry-run is accepted as a read-only SELECT preview package. It consumes the Stage 16A-P3 manifest dry-run and provides local SQL evidence for 24 provisional team slots, 19 synthetic personas, 11 resettable time-phase cases and three league shapes. It does not execute Supabase writes, create Auth users, seed predictions, require service-role credentials, change scoring, change resolver logic, change UI routes or create a database migration. Original Predictor and KO Predictor remain separate, active migrations remain 21 and Migration 019 is applied.

### Version 1.44 — Stage 16A-P3 seed manifest dry-run

Stage 16A-P3 — Seed manifest dry-run is accepted as a manifest dry-run only package. It records the local dry-run seed manifest for 24 provisional team slots, 19 synthetic personas, 11 resettable time-phase cases, three league shapes, correction marker and dual-marker teardown selectors before any staging write path exists. It includes no database writes, no user creation, no prediction seeding, no service-role credential requirement, no scoring or resolver changes and no database migration. Original Predictor and KO Predictor remain separate, active migrations remain 21 and Migration 019 is applied.

### Version 1.43 — Stage 16A-P2 staging-effective database time

Stage 16A-P2 — Staging-effective database time is accepted as a guarded planning, model and audit package for staging-effective database time. It records the resettable privacy, simulated-lock, release, correction-review and final-state phase catalogue that later seeded acceptance must use through the existing Time & Phase control. It explicitly does not apply the irreversible real global prediction lock, does not create users, does not seed predictions, does not change scoring, does not change resolver logic and creates no database migration. Original Predictor and KO Predictor remain separate, active migrations remain 21 and Migration 019 is applied.

### Version 1.42 — Stage 13G Match Centre reference adoption

Stage 13G-MATCH-CENTRE-REF is accepted as a docs/audit-only reference-adoption package. It records the group-fixture Match Centre decisions, including Match Centre group-match reference adoption markers for `Live projection`, `Final`, `resolveGroupTable` and read-only bracket-point preview, wires `audit:stage13g-match-centre-reference-adoption` into `npm run check`, keeps Stage 13G-MATCH-CENTRE-1 as the separate implementation slice, and preserves active migrations at 18 with no Migration 019.

### Version 1.41 — Stage 13G handover and next-reference alignment

Records the post-Admin handover state after `64f2f3e`, adds the expanded Stage 13G prompt and new references for guest-transfer modal, Head-to-head page, Points Breakdown page and spec-echo audit, and schedules Match Centre, Player destinations and UI-copy hygiene as separate next batches. Active migrations remain 21 and Migration 019 is applied.

### Version 1.40 — Stage 13G Admin control-room cosmetic restyle

Stage 13G-ADMIN-1 adopts the approved Admin prototype visual language as a cosmetic-only restyle of the protected control room. Existing Admin routes, permissions, RPCs, audit behaviour, Tournament Picks readiness, scoring and database contracts remain unchanged. Active migrations remain 21 and Migration 019 is applied.

### Version 1.39 — Stage 13G Account destination rebuild

Stage 13G-ACCOUNT-1 rebuilds the signed-in Account destination with identity, quick stats, security/preferences, leagues shortcut, danger zone, one-time guest transfer dialog and Original-only pre-lock clear action. Active migrations remain 21 and Migration 019 is applied.

### Version 1.38 — Stage 13G-B Tournament / How to Play split

Stage 13G-B-TOURNAMENT-1 implements the Tournament/How to Play split: `#/tournament` now owns football facts and `#/how-to-play` owns predictor mechanics. Canonical tournament facts are corrected in `TOURNAMENT_CONFIG` and the Stage 1 model doc. Active migrations remain 21 and Migration 019 is applied.

### Version 1.37 — Stage 13G destination reference adoption

> **Purpose:** The Decision Register records decisions. This ledger records actual functional state. A stage may not be called complete while an approved item in its scope remains partial, missing or incoherent.

## Standing priority

**FUNCTION before COMPLETION before POLISH.** Every component must be fully usable and no user-facing promise may remain half-wired. Broad visual refinement is deferred until the core journeys carry no unresolved missing, partial or incoherent status.

## Binding batch rules

1. Every code batch updates this ledger in the same commit.
2. A stage may not be recorded complete while a scoped row is `PARTIAL`, `MISSING` or `INCOHERENT`.
3. A new UI promise, capability or development tool adds a row immediately.
4. Status changes require file, test, Terminal or deployed evidence.
5. Statuses: ✅ FUNCTIONAL · 🟠 PARTIAL · ❌ MISSING · ⚠️ INCOHERENT · 🔒 DECISION PENDING · 🚫 REJECTED · 🕓 SCHEDULED · 🧭 REFERENCE ACCEPTED.
6. Before every batch: verify branch, clean tree, expected commit and permitted Supabase reference; read the current Register, Charter, ledger and roadmap; name the rows being moved; confirm no new half-wired row; freeze scope; prepare exact manifests and checksums.
7. Acceptance requires Nicky's Terminal evidence and the named ledger-row movement.

## Section A — Core player journeys and access

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Groups predictor | ✅ FUNCTIONAL | 36 matches, five jokers and review accepted in Stage 13B | — |
| Original Bracket | ✅ FUNCTIONAL | Winner-only journey accepted in Stage 13C | — |
| KO Predictor | ✅ FUNCTIONAL | Separate real-fixture competition accepted in Stage 13C | — |
| Private leagues | ✅ FUNCTIONAL | Both standings exist; controller remains within the enforced hard cap with presentation extracted | — |
| Results and leaderboards data | ✅ FUNCTIONAL | Both complete overall tables are returned and rendered for signed-in users | — |
| Results and leaderboards access | 🟠 PARTIAL | The separate routes, signed-in tables, points receipt and phase-aware Home entry are functional. The owner-required signed-out public table read is not: the current RPC is authenticated-only and requires a dedicated RLS/RPC review before migration. | Product Experience v3 Results story |
| Public signed-out leaderboard read | 🕓 SCHEDULED | Public visitors should see table rows without a personal standing. Do not fake this client-side; review RPC grants, RLS, privacy and load limits in the dedicated database-access stage. | Product Experience v3 Results story |
| Core player information architecture | ✅ FUNCTIONAL | Authoritative site-access map, direct destinations and contextual entry rules are enforced by `audit:access`; restricted Admin visibility remains its own Stage 13F-E row | — |
| Team Profile Sheet | ✅ FUNCTIONAL | Accepted in Stage 13E | — |
| Head-to-head comparison | ✅ FUNCTIONAL | League and overall tables open one shared, competition-scoped surface aligning all 51 Original positions or all 15 KO fixtures with same/different/private/not-saved states | — |
| Tappable player identity | ✅ FUNCTIONAL | One accessible `PlayerIdentity` primitive is used by league standings, overall leaderboards and comparison headers; self identity remains non-interactive | — |
| Match Centre/per-match stats | ✅ FUNCTIONAL | Dedicated fixture route, previous/next navigation, canonical state, Home/Results entry, separate Original/KO views, Overall/private-league scopes, community distribution and points-on-the-line rows accepted in Stage 13F-C | — |
| Match Centre group-match upgrade | 🧭 REFERENCE ACCEPTED | Stage 13G-MATCH-CENTRE-REF records and audits conditional group-only Original tabs, live/final group impact, resolver-backed read-only bracket-point preview, no matchday hardcode and group-specific prediction comparison. Implementation remains separate and must preserve knockout panel behaviour. | 13G-MATCH-CENTRE-1 |
| Bracket Health | ✅ FUNCTIONAL | Immutable Original bracket compared with canonical known fixtures, round health, route conflicts, secured/remaining points, unresolved-original fallback and Match Centre links accepted in Stage 13F-D | — |
| Tournament-pick contract | ✅ FUNCTIONAL | Contract only: approved Original-only set is total group-stage goals (auto-calculated, tiered 25/15/5) and top scorer (30); official joint top-scorer winners receive the full 30; one global lock; no joker; no KO points. Highest-Scoring Team was dropped entirely (Stage DP-SCORING). The audit proves this contract and Admin readiness, not a player-facing entry surface. | — |
| Tournament-pick persistence and player-facing UI | 🟠 PARTIAL | Admin readiness and the contract exist, but ordinary players cannot yet enter total group-stage goals or top scorer. Build the player surface inside the Original Predictor journey, lock it at the global lock, score via the central ruleset and show the live race on Home during the tournament. Moving this earlier than Stage 17A requires explicit schedule acceptance. | 13G-C / 17A re-approval |
| Player insight engine and points storytelling | 🟠 PARTIAL | The v3 profile sheet, Overview-first full profile, always-visible points receipt, released predictions, predicted tables, Original Bracket health and source/swing H2H are implemented in the working tree and await check plus visual approval. Persisted pinned rivals and final cross-route adoption remain scheduled. | Product Experience v3 current coherence batch |
| Provisional team seeding and zero-code-change rehearsal | 🕓 SCHEDULED | Guarded 24-team staging seed, replace/confirm mode and Stage 17 zero-code-change rehearsal | 16A |
| Synthetic identities and deterministic persona catalogue | ✅ FUNCTIONAL | Stage 16A-P1 defines the Privacy-safe synthetic identity plumbing local catalogue, exactly nineteen deterministic personas, reserved `@synthetic.euro28.test` emails, required `synthetic_euro28: true` metadata, dual-marker teardown guard and Euro-staging/WC26 fail-closed project boundary. No user creation, no database writes, no UI exposure and no Migration 019. | 16A-P1 |
| Synthetic prediction and scenario oracle | 🕓 SCHEDULED | Independent precomputed points at every Time & Phase preset, including correction replacement | 16A |
| Synthetic league population | 🕓 SCHEDULED | Large and tiny leagues, multi-league member and no-league member across both standings | 16A |
| Marker-safe teardown and reseed | 🕓 SCHEDULED | Delete only dual-marker synthetic data; prove zero residue and repeatable reseed | 16A |
| Real multi-user RLS/RPC/persistence acceptance | 🟠 PARTIAL | Existing contracts implemented; Stage 16A seeded cast must exercise deferred multi-user evidence | 16A |
| Time & Phase lifecycle acceptance across browser and database contracts | 🟠 PARTIAL | Frontend presets exist; staging-effective database-time precondition is required without applying the irreversible real lock | 16A |
| Result correction and replacement-scoring multi-user acceptance | 🟠 PARTIAL | Canonical correction path exists; Stage 16A must prove persona totals before and after replacement recalculation | 16A |
| Converging wall-chart bracket layout (≥900px) + share-card image rendering | 🕓 SCHEDULED | Presentation-only second layout of the existing predicted and live bracket destinations. At ≥900px, Round of 16 ties sit on the outer left and right, with quarter-finals and semi-finals converging towards the centred final. Phones retain the current vertical bracket. Both layouts use the same canonical resolver, slot references, shared `<TeamLabel>` primitive and dashed unresolved-slot chips. Predicted and live contexts remain separately bannered and never blend. The share asset is this wall-chart layout rendered as a shareable/downloadable image. No new logic, data model, migration or invariant change. | 13P-A |

## Section B — Guest mode

Intended model: guests use Groups, Original Bracket and KO Predictor when open; predictions persist automatically in the same browser; an account is required for points and leagues; sign-up offers safe one-tap transfer.

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Guest resolver | ✅ FUNCTIONAL | Same canonical slot-reference resolver | — |
| Guest Groups/Original browser persistence | ✅ FUNCTIONAL | Local browser storage exists and survives signup on the same browser/domain | — |
| Guest KO access and persistence | ✅ FUNCTIONAL | Available real KO fixtures save in separate browser storage; sign-in preserves the local draft and confirmed account transfer never affects Original Predictor data | — |
| Guest-to-account transfer | ✅ FUNCTIONAL | Stage 13G-ACCOUNT-1 moves guest transfer to a one-time post sign-in/sign-up keep/start-fresh dialog. It preserves the safe transfer engine, uses device wording and keeps Original/KO guest drafts separate. | — |
| Signup encouragement | ✅ FUNCTIONAL | Progress-aware account prompts appear in Original and KO guest journeys; Account detects saved browser predictions and offers the safe transfer action | — |
| Account destination rebuild | ✅ FUNCTIONAL | Stage 13G-ACCOUNT-1 is complete/deployed at `734ad9b`: useful signed-in Account header/stats, one-time post-sign-in device-prediction modal, scoped Original-only clear action before lock, security/preferences rows and retired legacy `src/pages/Profile.jsx`. | — |
| Manual JSON file controls | 🚫 REJECTED | Removed from the live journey; dormant recovery components were deleted in Stage 13F-H | — |
| Lucky Dip | ✅ FUNCTIONAL | Groups-only local weighted score generation; fill-empty and confirmed replace-all modes preserve jokers and clear stale bracket picks | — |

## Section C — Admin

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Server result entry/corrections/recalculation | ✅ FUNCTIONAL | Revision-safe and audit-logged | — |
| Admin invisible to non-admins | ✅ FUNCTIONAL | Server-authorised discovery and direct-route gate accepted in Stage 13F-E | — |
| Admin UI fit for purpose | ✅ FUNCTIONAL | Stage 13G-A route integrity fixed protected section destinations and Stage 13G-ADMIN-1 adopts the approved cosmetic control-room reference without changing Admin powers or data contracts. | — |
| Admin cosmetic reference restyle | ✅ FUNCTIONAL | Stage 13G-ADMIN-1 restyles the protected control-room shell, hero, section navigation, status cards, guardrail banner and audit filter pills using semantic tokens only. No owner/results-admin boundary, Admin operation, audit or Tournament Picks readiness contract changes. | — |
| Admin section destinations and deep links | ✅ FUNCTIONAL | Canonical section registry and query-addressed `#/admin?section=...` destinations keep every section inside the protected Admin route, including invalid-section recovery. | — |
| Staging Time & Phase controls | ✅ FUNCTIONAL | Owner-only audited shared clock, preset phases, custom time and site-wide warning accepted with approved Migration 016 | — |
| Profile curation | ✅ FUNCTIONAL | Stage 13E owner editing | — |
| Stage 13F-K operation inventory | ✅ FUNCTIONAL | Existing operations, genuine fixture/reconciliation/readiness gaps, exclusions and four-batch sequence approved in Stage 13F-K0 | — |
| Migration 018 server/database contract | ✅ FUNCTIONAL | Migration, 50 local plus 50 linked pgTAP tests and repository audit prove fixture revision, protected reads, owner-only fixture update, complete reconciliation, readiness output and append-only audit on Euro staging | — |
| Fixture schedule operations | ✅ FUNCTIONAL | Owner-only revision-safe date, venue, venue-local kick-off and schedule-status controls are connected to Migration 018; results administrators remain read-only and participants/resolver slots remain outside scope | — |
| Tournament-wide scoring reconciliation | ✅ FUNCTIONAL | Owner-only note/confirmation-gated whole-tournament replacement recovery is connected to the canonical scorer and preserves separate Original/KO totals | — |
| Tournament-pick Admin readiness home | ✅ FUNCTIONAL | One control-room section renders total group-stage goals and top scorer plus the Stage 17A dependency, with no fake outcome controls | — |
| Operational readiness summary | ✅ FUNCTIONAL | One read-only presentation groups fixture, participant, result, scoring, Team Profile and safeguard evidence from Migration 018 | — |
| Admin audit filters and detail | ✅ FUNCTIONAL | Read-only category filters expose up to 200 append-only events with actor, target, match, before/after and scoring-run detail | — |
| Complete Admin operations backbone | ✅ FUNCTIONAL | K0/K1 operations, K3 role boundaries, Stage 13G-A section routing and Stage 13G-ADMIN-1 presentation fit are proven. Tournament Picks executable outcomes remain correctly scheduled for Stage 17A. | — |

## Section D — Architecture and enforcement

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Token architecture and raw-colour audit | ✅ FUNCTIONAL | Central semantic tokens and active colour audit | — |
| Charter architecture section | ✅ FUNCTIONAL | Restored in Charter v1.7 and enforced by `audit:architecture` | — |
| File-size/structure audit | ✅ FUNCTIONAL | Active product roots remain within the 400-line hard cap and temporary component caps are empty | — |
| WCAG token contrast audit | ✅ FUNCTIONAL | All 58 registered light/dark token pairs pass; muted text and joker light-theme tokens were minimally corrected and the exception allowlist is empty | — |
| Mount inversion | ✅ FUNCTIONAL | `src/App.jsx` now owns bootstrap, loading, routing and the product shell directly | — |
| Foundation naming retired | ✅ FUNCTIONAL | Active UI controllers and runtime helpers use product names; the retired `src/foundation` root is absent | — |
| Visual fixtures isolated | ✅ FUNCTIONAL | Deterministic fixtures live under `src/testFixtures` and are absent from the production import graph | — |
| WC26 inherited source deleted | 🕓 SCHEDULED | Dedicated Stage 15E only, after Stage 13G-E and before Stage 13P-A; tag `legacy-wc26-final` immediately before the approved exact-path deletion. Never touch `main`. | 15E |
| Netlify Functions hygiene | ✅ FUNCTIONAL | Deploy input contains only health, scheduled heartbeat and shared observability support | — |

## Section E — Orphaned features

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Per-league locks/snapshots | 🚫 REJECTED | One global lock; inherited snapshot function removed from Euro deploy input in Stage 13F-H | — |
| Daily Questions | 🚫 REJECTED | Delete inherited implementation | 15E |
| PWA and push notifications | 🕓 SCHEDULED | Carry only as a coherent, tested Euro-native feature | 18C |
| Offline players / claim-account model | 🔒 DECISION PENDING | Do not implement or migrate until an application-level participant identity, ownership, privacy, one-time claim and rollback contract is approved. Stage 16 synthetic seeding may share service-role tooling but must not pre-decide the production identity model. | Decision paper |
| Odds | 🚫 REJECTED | Reconsider only with separately approved free/licensed provider | 18B gate |
| Weather | 🚫 REJECTED | Not core Match Centre content | — |
| Trustworthy live minute | 🕓 SCHEDULED | UI slot in Match Centre; automatic source only if Stage 18B is approved | 13F-C/18B |

## Section E2 — Stage 13G reconciliation backlog

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Ledger and change-log integrity | ⚠️ INCOHERENT | Pre-R0 chronology omitted versions, mixed starting and accepted checkpoints, and failed to downgrade the broken Admin section claim. R0 establishes accepted-commit chronology and same-commit updates. | 13G-R0 |
| Canonical governing-document consolidation | 🟠 PARTIAL | The standalone 3 July addendum is retired as a separate authority by R0; final consolidation becomes functional only when the R0 package is installed and accepted. | 13G-R0 |
| Provisional tournament start and prediction-lock configuration | ✅ FUNCTIONAL | `TOURNAMENT_CONFIG` now provides central provisional staging values for tournament start and prediction lock. The lifecycle resolver labels the source as central-provisional and does not apply the irreversible persisted global lock. | — |
| Account autosave against configured lock | ✅ FUNCTIONAL | `PredictionJourney` derives lock state from `resolveTournamentLifecycle`, so account autosave is unblocked by the central provisional lock while remaining locked after the effective timestamp or persisted lock. | — |
| Original bracket coherence after group-score edits | ❌ MISSING | Approved invalidation contract requires deterministic standings/slot recalculation, preserved invalid picks, cascade review and scoring exclusion. | 13G-C |
| Shared destructive-confirmation primitive | 🟠 PARTIAL | Shared `ConfirmDialog` exists and sign-out now uses it. Remaining destructive Admin/legacy actions must migrate incrementally in later scoped batches. | 13G-A/13G-E |
| Native-control removal | 🟠 PARTIAL | Shared `SelectField` exists and League/member pickers use it. Admin/match native selectors remain scheduled for incremental replacement. | 13G-A/13G-E |
| Central refresh policy | 🟠 PARTIAL | `REFRESH_POLICY` establishes no-manual-refresh defaults and mutation invalidation intent. Surface adoption remains incremental. | 13G-A/13G-E |
| Informative empty-state standard | 🟠 PARTIAL | Useful examples exist, but the whole product has no enforced empty/error/recovery standard. | 13G-E |
| Home first-visit conversion hook | 🟠 PARTIAL | Home distinguishes guest states, but signed-in users must be swept so no account experience says “browser draft”. The accepted signup import flow is a dominant one-tap confirmation, not a buried manual import step. | 13G-C |
| Tournament-start and prediction-lock countdowns | ✅ FUNCTIONAL | Home displays prediction-lock and tournament-start countdowns from `resolveTournamentLifecycle`; date-only staging starts no longer override the central precise tournament-start timestamp. | — |
| In-tournament today's-matches hub | ✅ FUNCTIONAL | Home now owns a Today’s match hub that promotes live or next fixture context into Match Centre without presenting missing results as final. | — |
| Predicted group standings | ❌ MISSING | Complete shared predicted tables are not available in the approved Groups journey. | 13G-C |
| Shared third-place table | ❌ MISSING | One canonical predicted/live third-place presentation is not used wherever standings appear. | 13G-C |
| Results, leaderboards and Match Centre lifecycle alignment | ✅ FUNCTIONAL | Results, Leaderboards and Match Centre now consume central lifecycle state plus canonical result/fixture state through `audit:results-lifecycle`; no competitions are combined. | — |
| Central KO-readiness signal | ✅ FUNCTIONAL | Home, Navigation and Leagues now consume one shared KO-readiness model. Groups remains primary until the confirmed full readiness boundary, early KO access stays in More, and league KO context stays hidden until real fixtures are ready. | — |
| Player Insight and Team Profile lifecycle alignment | ✅ FUNCTIONAL | Player Insight and Team Profile now consume central lifecycle context for phase copy while preserving server-authorised privacy gates, Original-only Team Profile aggregates, KO exclusion and separate Original/KO point boundaries through `audit:player-team-lifecycle`. No database change and no Migration 019. | — |
| PlayerIdentity whole-product coverage | 🟠 PARTIAL | Shared identity exists but not every rendered player name uses it. | 13G-D |
| PlayerInsight as sole detailed-points surface | 🟠 PARTIAL | The shared model exists, but duplicate/local detail surfaces remain to be retired. | 13G-D |
| Auth-provider-agnostic account creation | 🟠 PARTIAL | Current persistence is adaptable, but the active flow and assumptions are email/password-specific. | 13G-D |
| WC26 legacy-retirement safety tag | 🕓 SCHEDULED | Create and record `legacy-wc26-final` immediately before Stage 15E deletion. | 15E |

## Section F — Operations

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Backup/restore tooling | ✅ FUNCTIONAL | Rehearse at Stage 19 | — |
| Staging owner access | ✅ FUNCTIONAL | Documented controlled grant | — |
| Health endpoint and heartbeat | ✅ FUNCTIONAL | Stage 14 deployed verification accepted | — |
| Sentry reporting | 🟠 PARTIAL | Integration exists without credentials; activation gate at Stage 16 | 16 |
| Dependency updates | 🟠 PARTIAL | Monthly manual review until default-branch decision after WC26 | OB-1 |
| Hosted Euro staging simulation | 🕓 SCHEDULED | Existing guarded Euro staging project is approved for Stage 16A; WC26 production remains blocked | 16A |
| Stage 16A scope alignment | ✅ FUNCTIONAL | Stage 16A-S0 records the staging-only launch gates, 16A-P1 privacy-safe synthetic identity plumbing, 16A-P2 staging-effective database time, full seeded-cast exclusions, dual synthetic markers, teardown/reseed acceptance and WC26 fail-closed boundary. No component, resolver, scoring, route, database or migration implementation is included; active migrations remain 21 and Migration 019 is applied. | — |

## Section G — Information architecture and coherent UI

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Stage 13G IA map and destination ownership | ✅ FUNCTIONAL | Approved direct/contextual destination map, homeless/duplicate findings and object-surface ownership recorded in Stage 13G-0 | — |
| More lifecycle strategy | ✅ FUNCTIONAL | Approved phase-specific ordering, authorised Admin separation and pre-readiness KO explainer contract | — |
| Hardwired-data inventory | ✅ FUNCTIONAL | Active production evidence recorded for chronology, stage inference, totals, rules prose, stale Admin values, dates, metadata and primitive bypasses | — |
| Stage 13G-A route integrity and Admin sections | ✅ FUNCTIONAL | Canonical Admin section registry, query-addressed section destinations, invalid-section recovery, route-render tests and dead-destination audit | — |
| Stage 13G-A central configuration and shared primitives | ✅ FUNCTIONAL | Central provisional lifecycle config, account autosave unblock, shared confirmation, design-system selector adoption across active surfaces, refresh-policy enforcement and foundation-class ratchet groundwork are proven by audits. | — |
| Stage 13G destination reference adoption | ✅ FUNCTIONAL | Five approved reference artefacts for Tournament, How to Play, Account, Admin and Match Centre are recorded under `docs/reference-prototypes/`, with `audit:stage13g-destination-reference-adoption` wired into `npm run check`. Docs/audit only; no UI, config, scoring, resolver, Supabase write or migration change. | — |
| Stage 13G-B Tournament / How to Play split and canonical facts | ✅ FUNCTIONAL | Split `#/tournament` into Tournament facts and `#/how-to-play` mechanics. Canonical tournament facts now record confirmed Euro 2028 dates/venues/hosts; group participants and match-specific kick-offs remain explicitly unconfirmed. | 13G-B-TOURNAMENT-1 |
| Stage 13G-C people, profiles and sharing | 🕓 SCHEDULED | Shared player overview, one-tap invites, static/dynamic previews and synthetic identity preparation | 13G-C |
| Stage 13G-D seeded whole-surface coherence | 🕓 SCHEDULED | Stage 16 cast, Scotland reference profile, all-screen re-baseline and charter review | 13G-D |
| Whole-app new-player walk-through | 🕓 SCHEDULED | Owner acceptance after navigating every direct and contextual journey as a casual first-time player | 13G-D |

## Section H — Housekeeping, bypass-class controls and clarified product records

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Stage 13G-H0 record corrections | ✅ FUNCTIONAL | Ledger now distinguishes Tournament Picks contract readiness from missing player-facing entry, and distinguishes Player Insight/H2H engines from the intended dedicated player-view product shape. | — |
| Constitution principle 14 — slick and frictionless | ✅ FUNCTIONAL | Section 5 now records the product sensibility: open into what matters now, remember where the player was, hide machinery, remove before rearranging and choose fewer elements/fewer taps where designs are otherwise equal. The existing access principle remains active as principle 15. | — |
| `.env.example` time-travel default | ✅ FUNCTIONAL | Template defaults `VITE_ENABLE_TIME_TRAVEL=false`; staging-only enablement now requires explicit local owner configuration. | — |
| Coverage threshold and no-decrease ratchet | ✅ FUNCTIONAL | Vitest coverage is wired into `npm run check` using current live `src/` actuals as floors: lines/statements 57.7, functions 78.53 and branches 68.48. Legacy pages/components, store, assets and fixtures are excluded. | — |
| `eslint-disable` governance | ✅ FUNCTIONAL | Every eslint-disable now needs a reason after `--`; total disables are capped at 38 and live non-test disables at 23, with cap reductions required when counts fall. | — |
| Frozen bridge melt schedule | ✅ FUNCTIONAL | Compat stylesheets stay frozen at exact caps and any screen rework touching compat-styled screens must migrate styles to modules and lower the relevant cap when lines are removed. | per screen |
| Visual fixture production gating | ✅ FUNCTIONAL | Deterministic visual fixtures remain outside the production graph; the only root-mounted fixture is `Stage14ErrorFixture`, gated to `import.meta.env.DEV` and not deployable by VITE flags. | — |
| Size governance clarification | ✅ FUNCTIONAL | The Charter records 200/250 as review guidance and 400/400 as enforced hard caps. Test fixtures now share the hard cap, with the one current over-cap fixture ledgered and ratcheted. | — |
| Bottom nav alignment wording | ✅ FUNCTIONAL | Charter clarifies that the centred Home circle overlaps slightly above the bar top line while all five icons and labels remain vertically aligned. | — |
| Stage 13G-H2 product-facing alignment | ✅ FUNCTIONAL | Official UEFA EURO 2028 logo is rejected as a deployable asset without permission; leagues reference patterns are evaluated before build; player routes, Tournament Picks entry and guest import are sequenced without changing routes, scoring, resolver or database state. | — |
| Stage 13G-C1 guest import prompt | ✅ FUNCTIONAL | Signed-in guest import now uses the accepted one-tap prompt, device-only copy, Import predictions to my account and Start fresh actions while preserving separate Original Predictor and KO Predictor import boundaries. | — |
| Home theme compliance sweep | 🕓 SCHEDULED | Audit every Home element in light and dark themes and fix through semantic tokens. | 13G-E |
| Debug/developer strip removal | 🕓 SCHEDULED | Version strings, row counters and lock mechanics such as account autosave/debug strips must not be user-facing copy. | 13G-H1 |
| User-facing copy hygiene and spec-echo audits | 🕓 SCHEDULED | New reference records the need for banned-vocabulary and spec-echo guards. Only `check-user-facing-spec-echo.mjs` was uploaded in this handover; wire the full audit only once the copy-hygiene script and policy file are also present. | 13G-UI-HYGIENE-1 |
| Signed-in copy and signup import flow | 🕓 SCHEDULED | Signed-in users never see “browser draft”; signup shows one dominant import prompt with Import to account / Start fresh choices. | 13G-C |
| Joker design-system element | 🕓 SCHEDULED | Replace hard-coded `J` circle with a gold design-system special-action/multiplier joker element using central scoring values and accessible states. | 13G-C |
| Bracket slot long-name resilience | 🕓 SCHEDULED | Fix advance/selected controls overlapping team names inside the slot primitive and add long-name baselines. | 13G-C |
| Shared Tabs/switcher pattern | 🕓 SCHEDULED | Use one design-system Tabs pattern for group/KO round switches and By group/By date views. | 13G-B/C |
| FAQ/how-to-play section | ✅ FUNCTIONAL | Dedicated `#/how-to-play` destination explains Original Predictor, KO Predictor, scoring, locks, jokers and mechanics FAQ from central config/contracts; correction mechanics stay out of ordinary copy. | 13G-B-TOURNAMENT-1 |
| Converging wall-chart bracket/share image | 🕓 SCHEDULED | Scheduled for Stage 13P-A; desktop bracket must not ship as an unscaled mobile layout. | 13P-A |


## Change log

- **v1.58:** Tooling retirement and dead-code removal. `scripts/check-stage13g-r0-docs.mjs` is deleted — it proved the R0 docs/governance consolidation (13G-R0, `586c6a1`) was installed and coherent; that proof is now superseded by the governance-coherence meta-audit, so its historical record is retained here rather than as executable weight. `scripts/check-stage13g-test-strategy-roadmap.mjs` is deleted — it proved the Stage 13G test-strategy roadmap doc (`3c41628`) existed and matched the roadmap; superseded by the current check chain plus the governance-coherence meta-audit. Both were already orphaned (no `npm` entry, not run by CI) and are removed from `RETIRED_SCRIPTS` in `check-tooling-wiring.mjs`. Additionally, eight confirmed-dead react-router-era legacy files unreachable from `src/main.jsx` are deleted: `src/pages/Login.jsx`, `Register.jsx`, `ClaimAccount.jsx`, `PublicLeague.jsx`, `AdminPanel.jsx`, `src/components/admin/OfflinePlayerManager.jsx`, `PointsManager.jsx`, `src/components/BottomNav.jsx` — dead code only, no product decision (including the 🔒 offline-players/claim-account model) is pre-decided. No scoring, resolver, Auth, migration or active-feature change; active migrations remain 21 and Migration 019 is applied.

- **v1.37:** Stage 13G destination reference adoption records the Tournament, How to Play, Account, Admin and Match Centre prototypes plus the build-agent brief under `docs/reference-prototypes/`, amends Stage 13G-B so Tournament/How to Play split and canonical tournament fact correction happen before UI work, sequences Account/Admin/Match Centre as later focused batches, and adds `audit:stage13g-destination-reference-adoption` to `npm run check`. Docs/audit only; active migrations remain 21 and Migration 019 is applied.

- **v1.36:** Stage 16A-P1 completes Privacy-safe synthetic identity plumbing. The repo now has a canonical local catalogue of exactly nineteen personas, reserved `@synthetic.euro28.test` emails, required `synthetic_euro28: true` metadata, dual-marker teardown guards, Euro staging project enforcement and explicit WC26 production blocking. This is no user creation, no database writes, no UI exposure, no scoring/resolver/component change and no Migration 019.

- **v1.35:** Stage 16A scope alignment adds the Stage 16A-S0 launch-gate document and audit, records 16A-P1 and 16A-P2 as separately guarded preconditions, freezes the 24-team/19-persona/league/correction/teardown scope, preserves the Euro-staging-only and WC26 fail-closed boundary, and adds `audit:stage16a-scope-alignment` to `npm run check`. No component, resolver, scoring, route, database or migration implementation is included; active migrations remain 21 and Migration 019 is applied.

- **v1.34:** Stage 13G-C1 guest import prompt updates the signed-in import surface to “Import your saved Euro 2028 predictions?”, adds the accepted primary and secondary actions, replaces internal browser-draft copy with device wording, and preserves separate Original Predictor and KO Predictor import boundaries. No database change; active migrations remain 21 with Migration 019 applied.

- **v1.33:** Stage 13G-H2 product-facing alignment rejects the official UEFA EURO 2028 logo as a deployable asset without explicit permission, evaluates leagues reference patterns as adopt-improved/adapt/drop before build, keeps Tournament Picks player entry as a schedule decision, records the dedicated player route direction and recommends guest import copy as the next tight build. No route, component, scoring, resolver, database or migration change; active migrations remain 21 with Migration 019 applied.

- **v1.32:** Stage 13G-H1 bypass-class tooling sweep from `dbdcc7d` enforces false-by-default time travel, coverage no-decrease floors, eslint-disable reason/cap governance, DEV-only fixture gating, test-fixture size ratchets and frozen bridge melt rules. No database change and no Migration 019.

- **v1.31:** Stage 13G-H0 housekeeping and record corrections from `5c9f415` update governing documents only: Tournament Picks is corrected to contract-functional but player-surface partial, Player Insight/H2H is corrected to engine-partial pending dedicated destinations, guest signup import flow is confirmed as a dominant one-tap prompt, bypass-class sweep items are recorded, the FAQ list removes result-correction mechanics, bottom-nav alignment wording is clarified, Constitution principle 14 records the slick/frictionless product sensibility, and active migrations remain 21 with Migration 019 applied.
- **v1.30:** Stage 13G-B KO-readiness signal close-out from `659809c` centralises KO readiness for Home, Navigation and Leagues, preserves the five-position navigation trigger, keeps early KO access in More, gates league KO context by real fixture readiness, adds `audit:ko-readiness` to `npm run check`, and keeps active migrations at 18 with no Migration 019.
- **v1.29:** Stage 13G-B Player Insight and Team Profile lifecycle alignment from `aa76fbe` adds central lifecycle copy to Player Insight and Team Profile, preserves the canonical server privacy phrase, keeps Team Profile aggregates Original-only, excludes KO Predictor data from Team Profile percentages, adds `audit:player-team-lifecycle` to `npm run check`, and keeps active migrations at 18 with no Migration 019.
- **v1.28:** Stage 13G-B League lifecycle alignment slice from `a651d33` adds central lifecycle input to private leagues, competition-scoped Original/KO release copy, member-comparison release copy and `audit:league-lifecycle` in `npm run check`. No database change and no Migration 019.
- **v1.27:** Stage 13G-B Results lifecycle alignment slice from `177605b` adds central lifecycle banners to Results, competition-scoped lifecycle copy to Leaderboards, fixture-level lifecycle copy to Match Centre and `audit:results-lifecycle` in `npm run check`. No database change and no Migration 019.


- **v1.26:** Stage 13G-B prediction lifecycle slice from `1dda826` adds Original Predictor lifecycle cards, KO Predictor real-fixture readiness, central tournament lifecycle input on the KO route and `audit:prediction-lifecycle` in `npm run check`. No database change and no Migration 019.

- **v1.20:** Closes Stage 13F-K3 from `c4342f1` after three-role deployed acceptance, same-value transactional fixture proof with exact rollback, one real owner complete reconciliation, read-only event/run/separate-total verification, linked database gates and final deployed verification. No product code or Migration 019 is added; Stage 13G-A becomes next.

- **v1.25:** Stage 13G-B Home lifecycle slice from `08524b6` adds Home first-visit/returning-guest conversion copy, central-config prediction-lock and tournament-start countdowns, Today’s match hub entry to Match Centre, a Home KO-readiness signal and `audit:home-lifecycle` in `npm run check`. It fixes date-only staging tournament starts so they cannot override the central precise tournament-start timestamp. No database change and no Migration 019.
- **v1.24:** Stage 13G-A interaction-enforcement slice from `b38ec64` replaces remaining active-surface native selectors with `SelectField`, routes high-impact Admin operations through `ConfirmDialog`, removes manual refresh controls outside retry/error states, adds `audit:interaction-enforcement` to `npm run check` and sets the active `foundation-*` ratchet at 245 with current use below the cap. No database change and no Migration 019.

- **v1.23:** Stage 13G-A central-configuration/shared-primitives slice from `c8a5cf3` adds central provisional tournament-start and prediction-lock values, a lifecycle resolver consumed by the Original Predictor account autosave path, shared `ConfirmDialog`, shared `SelectField`, first sign-out and League-picker adoptions, refresh-policy groundwork and `audit:shared-primitives` in `npm run check`. No database change and no Migration 019.

- **v1.22:** Stage 13G-A route-integrity slice from `3c41628` adds canonical Admin section destinations, replaces legacy `#admin-*` links with protected `#/admin?section=...` hashes, adds invalid-section recovery, route-render integration tests and a dead-destination audit in `npm run check`. No database change and no Migration 019.

- **v1.21:** Stage 13G-R0 corrects the false Stage 13F-F navigation claim, downgrades Admin UI/coherent operations truthfully, consolidates the 3 July amendments into the canonical Register, approves C1 Option A and the Original-bracket invalidation contract, records offline players as decision pending, rebuilds accepted-commit chronology through `b7f50de`, and makes same-commit Ledger updates mandatory for every future batch. Documentation only; no product code, database action or Migration 019.

- **Accepted-commit chronology:** 13F-E `8349e83`; 13F-F `369ddfc` (retrospectively corrected by v1.21); 13F-G `7324d43`; 13F-H `74c8dd3`; 13F-I `63d7acb`; 13F-J `f7f2fb5`; 13G-0 `efce59f`; 13F-K0 `b6c7ddc`; 13F-K1 `0e4d5b7`; 13F-K2 `c4342f1`; 13F-K3 `b7f50de`; 13G-R0 `586c6a1`; Stage 13G test-strategy amendment `3c41628`; Stage 13G-A route-integrity `c8a5cf3`; Stage 13G-A central configuration/shared primitives `b38ec64`; Stage 13G-A interaction enforcement `08524b6`; Stage 13G-B Home lifecycle `1dda826`; prediction lifecycle `177605b`; results lifecycle `03bc447`; league lifecycle `a651d33`; player/team lifecycle `aa76fbe`; KO-readiness close-out `5c9f415`; Stage 13G-H0 records/docs correction pending from `5c9f415`.

- **v1.19:** Implements Stage 13F-K2 from `0e4d5b7`: split control-room components, owner-only fixture and complete-reconciliation actions, consolidated readiness, Stage 17A Tournament Picks hand-off, filtered expandable append-only audit detail, role/timezone tests and six responsive light/dark structural baselines. No Migration 019; Stage 13F-K3 remains the final deployed role acceptance.

- **v1.18:** Implements Stage 13F-K1 from `b6c7ddc`: Migration 018, fixture revision and protected reads, owner-only fixture update, owner-only complete reconciliation, readiness output, restored `team_profile_updated` audit value, pgTAP suite and repository audit. Database-complete/UI-pending rows move to partial; Stage 13F-K2 remains next.

- **v1.17:** Approves Stage 13F-K0 from `efce59f`: complete Admin operation inventory, owner-only fixture schedule editing, owner-only whole-tournament replacement reconciliation, Migration 018 server contract, operational-readiness/audit presentation and the Stage 17A tournament-pick hand-off. No migration or product code is added; fixture/reconciliation/UI rows remain scheduled.

- **v1.16:** Records the accepted Stage 13G-0 IA map, More strategy and hardwired-data inventory as functional planning contracts. Schedules Stage 13G-A through 13G-D after Stage 13F-K, with Stage 16A seeding interleaved before the final coherence proof. No Stage 13F-K implementation, Stage 16A acceptance or Stage 13P-A row moves.

- **v1.15:** Expanded the scheduled Stage 16A opening batch to include 24 provisional teams, nineteen deterministic synthetic personas, independent phase/correction points assertions, large/tiny/multiple/no-league membership, marker-safe teardown and hosted Euro staging simulation. Added partial acceptance rows for real multi-user persistence, database-aware Time & Phase behaviour and correction recalculation. No Stage 13F-K, Stage 13P-A or Stage 17A row moves.

- **v1.14:** Stage 13F-J from `63d7acb` adds the read-only Migration 017 player-insight contract, canonical Original/KO points storytelling, Home rank-gap context, privacy-safe H2H insight and provisional `TeamLabel` treatment on the modified player surfaces. The player-insight row moves to functional after owner acceptance. A new Stage 16A provisional-team seeding rehearsal row is added as scheduled; no later-stage row moves.

- **v1.13:** Stage 13F-I approves the versioned Original Predictor tournament-pick contract from `74c8dd3`. (Values superseded by Stage DP-SCORING 2026-07-10: total group-stage goals is auto-calculated and tiered 25/15/5, top scorer is 30, and Highest-Scoring Team is dropped; official joint top-scorer winners receive full points; one global lock, no joker, no KO points, and the player selector waits for Stage 17A.) Stage 13F-K is recorded as the complete Admin operations backbone before polish.

- **v1.6:** Stage 13F-B replaces ad hoc player-name buttons with one shared identity primitive, completes aligned league and overall H2H for both competitions, and schedules the presentation-only converging bracket/share-image batch at Stage 13P-A.
- v1.5 — Stage 13F-A records separate KO guest persistence, seamless browser-draft continuation and transfer, progress-aware signup prompts, removal of normal JSON controls and Euro-native Lucky Dip.


- **v1.0:** Independent audit draft.
- **v1.1:** Corrected H2H/player identity to partial, separated guest storage from dormant file tools, corrected guest account-import terminology, recorded three over-cap screens, recorded actual fixture and Netlify deployment state, and added site-wide information architecture/access.
- **v1.2:** Recorded accepted architecture governance, split all three oversized live screens, removed every temporary component cap, and moved contrast automation to partial pending four explicit Batch 3 corrections.
- **v1.3:** Corrected the two affected light-theme tokens, removed all four contrast exceptions, and marked the WCAG token contrast gate functional.
- **v1.4:** Separated Results from Leaderboards, added direct competition-specific Home access, adopted the site-access contract and retained Admin invisibility as a separate unresolved row.

- **v1.7:** Stage 13F-C adds the dedicated Euro Match Centre and closes the per-match information gap without a migration or privacy change.
- **v1.8:** Stage 13F-D adds immutable Original Bracket Health comparison against canonical known fixtures, with unresolved-original fallback and Match Centre access, without a migration or scoring change.

### Stage 13F-E acceptance

| Capability | Status | Evidence | Owner |
| --- | --- | --- | --- |
| Admin invisibility and fail-closed route access | FUNCTIONAL | Admin navigation is emitted only for server-verified administrators; signed-out, denied and verification-error direct-route states remain neutral; verified admins retain the full control room. | 13F-E |

- **v1.10:** Stage 13F-F rebuilds the authorised Admin control room presentation without adding powers, changing permissions or creating a migration.


## Stage 13F-G — Staging Time & Phase

Accepted scope: one owner-only audited staging clock, scenario presets, real-time reset, permanent warning, and fail-closed environment safeguards. Migration 016 is approved solely for persistent audited time-control state.


### Stage 13G-B prediction lifecycle slice

From checkpoint `1dda826`, the second Stage 13G-B slice aligns the active prediction surfaces with the central lifecycle model. Original Predictor now shows lock, group-score, winner-only bracket and KO-boundary lifecycle cards. KO Predictor now shows real-fixture readiness and a separate-competition lifecycle strip. The slice adds `audit:prediction-lifecycle` to `npm run check`, keeps active migrations at 18 and adds no Migration 019.

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



## Stage 16A-P4 — Seed SQL preview dry-run

Status: complete in development as a read-only SELECT preview package.

Stage 16A-P4 records the seed SQL preview before any staging write path exists. The package validates the SQL scaffold locally and generates read-only SELECT output only. It does not create Auth users, write Supabase data, seed predictions, create leagues, run scoring, use service-role credentials or create a database migration.

Confirmed decisions:

1. The preview consumes the Stage 16A-P3 manifest dry-run.
2. The generated SQL starts with SELECT and contains no mutating SQL statements.
3. The preview reports 24 provisional team slots, 19 synthetic personas, 11 resettable time-phase cases and three league shapes.
4. The preview exposes Original Predictor and KO Predictor keys separately.
5. The generator fails closed against WC26 production and non-Euro project references.
6. The package has no database writes, no user creation and no prediction seeding.
7. The dry run does not require service-role credentials.
8. Original Predictor and KO Predictor remain separate; no combined totals or blended standings are approved.
9. Active migrations remain 21 and Migration 019 is applied.

Next sequenced package: a narrow staging-only executor preflight with explicit approval before any write path exists.

## Stage 16A-P3 — Seed manifest dry-run

Status: complete in development as a manifest dry-run only package.

Stage 16A-P3 records the seed manifest before any staging write path exists. The package validates the planned cast and evidence groups locally but does not create Auth users, write Supabase data, seed predictions, create leagues, run scoring, use service-role credentials or create a database migration.

Confirmed decisions:

1. The dry-run manifest contains exactly 24 provisional team slots across six groups.
2. The manifest consumes the Stage 16A-P1 set of exactly 19 synthetic personas.
3. The manifest consumes the Stage 16A-P2 set of 11 resettable time-phase cases.
4. The manifest records large, tiny, multi-league and no-league evidence without creating league rows.
5. Every operation is dry-run only with no database writes, no user creation and no prediction seeding.
6. The dry run does not require service-role credentials.
7. Original Predictor and KO Predictor remain separate; no combined totals or blended standings are approved.
8. The future teardown sequence remains seed → validate → teardown → zero residue → reseed and must require both synthetic markers.
9. Active migrations remain 21 and Migration 019 is applied.

Next sequenced package: a narrow staging-only implementation preflight or generator, not the full provisional-team, persona, league, scoring-oracle, correction and teardown package in one batch.

## Stage 13G-REF — Home and League reference prototype adoption

Status: scheduled and accepted as docs/audit-only reference adoption.

Ledger rows recorded:

| Row | Status | Record |
| --- | --- | --- |
| 13G Home reference prototype adoption | SCHEDULED | `euro28-home-page-prototype.html` adopted as reference with two owner amendments. |
| 13G Home countdown contract | SCHEDULED | One countdown only. Home countdown and lock enforcement read the same first-kick-off config value. |
| 13G Home KO pre-readiness presence | AMENDED | Previous quiet tease card superseded. Home shows no KO Predictor card, tease, countdown, banner, prompt or placeholder before readiness. |
| 13G Home readiness fan-out | SCHEDULED | One readiness signal governs nav tab, Home KO card existence, More entry and league KO standings. |
| 13G Home signed-out hook | SCHEDULED | Thesis headline, three-beat explanation, account-first CTAs and guest-draft promise adopted. |
| 13G Home matchday hub | SCHEDULED | Points/rank strip first; rows live → upcoming → finished; rows link to match centre. |
| 13G bottom-nav baseline | AMENDED | Home circle overlaps the bar line; all five labels share one baseline. |
| 13G League reference prototype adoption | SCHEDULED | `euro28-league-page-prototype.html` supersedes earlier WC26 screenshot reference and current presentation. |
| 13G League table purity | AMENDED | Pure tables only; one running total per competition; stat-chip decision closed as NO. |
| 13G League gap/rank treatment | SCHEDULED | Gap every row; leader clear of second; top-three designed badges; no gold, no emoji. |
| 13G League player row destination | AMENDED | Inline H2H below league retired; player row opens dedicated S5 player view. |
| 13G League management patterns | SCHEDULED | Bottom sheet switching, danger-ghost delete with shared dialog, copy invite confirmed-state plus toast, passive freshness. |
| 13G League KO pre-readiness | SCHEDULED | No KO tab/table; one second-chance note only. |
| 13G League rules strip | SCHEDULED | Render from central versioned ruleset. |

This package is documentation and audit only. It adds no UI build, no route implementation, no scoring change, no resolver change, no Supabase write, no database policy change and no Migration 019. Active migrations remain 21.

## Stage 13G-REF-2 — Groups and Original Bracket Reference Prototype Adoption

Reference artefacts: `euro28-groups-page-prototype.html` and `euro28-bracket-page-prototype.html`. Scope: no UI build, no route implementation, no scoring change, no resolver change, no Supabase write, no fixture-data implementation, no score-stepper UI implementation.

| Ledger row | Status | Record |
| --- | ---: | --- |
| 13G Groups reference prototype adoption | SUPERSEDED / SCHEDULED | Superseded by `STAGE-CORE-PAGE-ADOPTION-1` in the v9+ order; approved Groups prototype remains binding and must be rebuilt natively, not ported. |
| S3.1 Joker control | AMENDED / CLOSED | Bare `J` circle retired; joker pill uses star icon, `Joker` label and `2×` when armed; disabled at cap. |
| Groups joker meter | SCHEDULED | Five-dot gold JOKER METER in page controls; same pattern in Groups and KO. |
| S3.3 Groups view switcher | AMENDED / CLOSED | `By group | By date` segmented control; by group while predicting and by date once play begins. |
| 4.2 Predicted tables | AMENDED / CLOSED | Qualification edges and `Calculated live from your predictions.` line. |
| 4.3 Third-place table | AMENDED / CLOSED | Third-place ranking across all six groups under every group table; top four marked bracket-bound. |
| Part 1.3 bracket coherence | AMENDED / CLOSED | Warning-once and FLAG-FOR-RE-PICK; stale picks visibly flagged, never silently kept or dropped. |
| Match card meta line | AMENDED / SCHEDULED | Every card carries date · venue with host-country circle flag · group; values live centrally with fixture data and reuse existing circle-flag assets. |
| Score steppers | AMENDED / SCHEDULED | Desktop-only at ≥640px; clamp 0–15; blank increments from zero; same save/coherence/table flow as typed entry; accessibility resolution required. |
| 13G Original Bracket reference prototype adoption | SUPERSEDED / SCHEDULED | Superseded by `STAGE-CORE-PAGE-ADOPTION-1` in the v9+ order; approved Bracket G contract remains binding. |
| Charter v1.8 wall chart | CONTRACT CHANGE / MOVED INTO 13G | Converging wall chart moves from backlog into 13G scope. |
| Original Bracket control absence | TEST REQUIRED | No score inputs, no method controls and no joker controls anywhere on Original Bracket. |

Active migrations remain 21. No Migration 019.

## Stage 13G-PLAYER-REF — Player View / Viewing Player Predictions Reference Prototype Adoption

| Ledger row | Status | Record |
|---|---:|---|
| 13G Player View reference prototype adoption | SCHEDULED | Approved player-view prototype adopted as the reference for viewing another member's predictions. Rebuild natively; do not port prototype code. |
| Player View privacy state | SCHEDULED | Before global Original Predictor lock, predictions are hidden and the page shows only the informative privacy placeholder. |
| Player View header | SCHEDULED | Header card is always visible because it contains no private prediction detail: avatar, display name, league/rank context, Original points, KO state and recent-form summary. |
| Player View post-lock tabs | SCHEDULED | Post-lock view uses three top-level tabs: Predictions, Bracket and Tables. |
| Player predictions rows | SCHEDULED | Prediction rows show fixture, predicted score, result/status, points chip and joker chip where applied. |
| Player bracket summary | SCHEDULED | Bracket tab shows champion, semi-finalists and quarter-finalists, with knocked-out teams struck through for bracket-health clarity. |
| Player predicted tables | SCHEDULED | Tables tab shows the player's predicted group tables, using the same qualification-edge and third-place logic as the Groups destination. |
| Player View links | SCHEDULED | Header actions route to real Head-to-head and Points breakdown destinations. Prototype stub buttons are not imported. |
| Player View prototype exclusions | SCHEDULED | Do not import sample data, lock switch, toast stubs, Google fonts or single-file structure. |

## Stage 13G-GROUPS-1 — Groups Joker Control Implementation

| Ledger row | Status | Evidence |
| --- | --- | --- |
| 13G-GROUPS-1 joker pill and meter implementation | FUNCTIONAL | Groups predictor uses the shared `JokerPill` and `JokerMeter` primitives. The visible bare `J` circle is retired from the Groups surface. |
| Disabled-at-cap treatment | FUNCTIONAL | When the five-group-joker cap is reached, unarmed joker pills render disabled with explicit state text. |
| Scope boundary | FUNCTIONAL | No venue meta-line, score-stepper, bracket, league, Player View, scoring, resolver, Supabase or migration change is included. |


## Stage 13G-GROUPS-2C — Groups Top Dock Polish

Status: FUNCTIONAL — small presentation-only design iteration, not final visual polish.

- Adds a more premium Groups top focus treatment with summary chips and a predicted-tables shortcut.
- Keeps the existing By group / By date switcher and slide-up predicted tables model intact.
- Lightly improves the compact A-F group rail treatment without changing its behaviour.
- No scoring, resolver, Supabase write, service-role, route or migration change.
- Active migrations remain 21. No Migration 019.


## Stage 13G-GROUPS-2D — Groups Top Dock Repair

Status: FUNCTIONAL — immediate eye-test and runtime repair for the 2C design iteration. It is not final Groups visual polish.

- Removes duplicate hero summary chips because the score progress bar and joker meter already present the same information.
- Retains predicted-table access as a compact top action.
- Improves the By group / By date mode switcher and the A–F group rail presentation without changing behaviour.
- Hardens predicted tables against one-sided partial score drafts so a deleted home or away score is treated as an incomplete match, not an application error.
- No scoring, resolver, Supabase write, service-role, route or migration change.
- Active migrations remain 21. No Migration 019.

## Stage 13G-GROUPS-2B — Groups Chrome Repair

Status: FUNCTIONAL — post-eye-test presentation repair.

- Retires the old in-page Groups / Bracket / Review section switcher on route-owned Groups and Bracket surfaces.
- Retires the old device-draft import strip from the prediction surface; account transfer remains the signed-in transfer flow.
- Moves top prediction status and lifecycle detail into a compact disclosure.
- Keeps Lucky Dip behind a slim disclosure so it does not dominate the Groups page.
- Restyles the group rail as compact premium chips.
- No scoring, resolver, Supabase write, service-role, route or migration change.
- Active migrations remain 21. No Migration 019.

## Stage 13G-GROUPS-2 — Groups Premium View Switcher

| Ledger row | Status | Evidence |
| --- | --- | --- |
| By group / By date view switcher | FUNCTIONAL | The Groups predictor restores the settled By group / By date toggle. By group remains the default, and By date lists all 36 group fixtures in date order. |
| Group context in by-date mode | FUNCTIONAL | By-date match tickets carry a visible group tag, so a player can see which table the fixture affects. |
| Tables fast path in by-date mode | FUNCTIONAL | A sticky Tables pill opens a slide-up predicted-tables sheet with A–F and third-place rails. |
| Scope boundary | FUNCTIONAL | Presentation/model/docs/audit only. No scoring, resolver, Supabase write, service-role use, route or migration change is included. Active migrations remain 21; Migration 019 is applied. |

## Stage 13G-BRACKET-REF — Original Bracket Reference Adoption

| Ledger row | Status | Record |
| --- | ---: | --- |
| Stage 13G-BRACKET-REF — Original Bracket reference adopted | ACCEPTED / SPEC SOURCE | `euro28-bracket-page-prototype.html` is the approved behaviour, hierarchy and copy reference for both layouts. |
| Charter v1.8 converging wall chart | CONTRACT CHANGE | Wall-chart layout moves from backlog into Stage 13G Original Bracket scope; this is a visible contract change. |
| Original Bracket responsive split | ACCEPTED / SCHEDULED | `<900px` stacked layout; `≥900px` converging wall chart. |
| Original Bracket slot anatomy | ACCEPTED / SCHEDULED | Source code visible, resolved slots tappable, picked success/tick, unresolved dashed placeholders. |
| Original Bracket pick mechanics | ACCEPTED / TEST REQUIRED | Tap-to-advance winner-only; selective downstream clearing; surviving picks persist. |
| Re-pick presentation | ACCEPTED / TEST REQUIRED | `Re-pick — your tables changed this tie` amber/partial treatment. |
| Champion and context copy | ACCEPTED / COPY LOCKED | Champion strip/box plus approved KO sub-line `winner picks only — scores and jokers are handled in the KO Predictor` and predicted-context banner `Your group predictions decide this bracket. Live results will not change your saved picks.`. |
| Original Bracket controls absence | ACCEPTED / AUDIT REQUIRED | No score inputs, method controls or joker controls. |
| Connector lines | SIGNED OFF / WITHOUT LINES | First implementation ships without connector lines. |
| Share-card rendering | SIGNED OFF / FOLLOW-ON | Dedicated export surface in later batch; not first Bracket implementation. |
| Tablet band | SIGNED OFF / SINGLE BREAKPOINT | Keep one 900px breakpoint; no silent third layout. |

Active migrations remain 21. Migration 019 is not created.


## Stage 13G-BRACKET-1 — Original Bracket Responsive Wall-Chart Rebuild

| Row | Status | Record |
| --- | ---: | --- |
| Stage 13G-BRACKET-1 — Original Bracket responsive stacked/wall-chart rebuild | IMPLEMENTED / LOCAL ACCEPTANCE REQUIRED | Rebuilds the Original Bracket with stacked vertical layout below 900px and converging wall chart at 900px and above, using shared `OriginalBracketTie` and `OriginalBracketSlot` primitives. |
| Original Bracket source-code slot anatomy | IMPLEMENTED / TESTED | Slots show source references including `1A`, `2B`, `3ABCD` and match-winner `W39` style references. Resolved slots keep `TeamLabel` identity plus separate progression action; unresolved slots are dashed placeholders. |
| Original Bracket re-pick treatment | IMPLEMENTED / TESTED | Stale stored picks render amber treatment with exact flag `Re-pick — your tables changed this tie`; bracket-pick changes prune only downstream picks no longer fed. |
| Original Bracket control absence | IMPLEMENTED / AUDITED | Original Bracket remains winner-only with no score inputs, method controls or joker controls. Active migrations remain 21 and Migration 019 is applied. |

## Stage 13G-ACCOUNT-1 — Account destination rebuild

| Item | Status | Evidence | Stage |
| --- | --- | --- | --- |
| Account destination rebuild | COMPLETE / PUSHED / DEPLOYED | Deployed at `734ad9b`. Signed-in Account has identity, quick stats, security/preferences, leagues shortcut and danger zone. Guest transfer is one-time after sign-in/sign-up. `Clear my predictions` is Original-only, pre-lock only and uses the existing atomic save boundary. | 13G-ACCOUNT-1 |


## Stage 13G-ADMIN-1 — Admin control-room cosmetic restyle

| Item | Status | Evidence | Stage |
| --- | --- | --- | --- |
| Admin control-room cosmetic restyle | COMPLETE / PUSHED / DEPLOYED | Deployed at `64f2f3e`. Protected Admin shell, hero, section navigation, role chips, summary cards, guardrail banner and audit filter pills adopt the approved Admin prototype visual language using semantic tokens only. Admin services, roles, RPCs, audit records, Tournament Picks readiness and migration count remain unchanged. | 13G-ADMIN-1 |

## Stage 16A-P5 — Staging write preflight and teardown contract

Status: complete in development as a no-write preflight package.

Stage 16A-P5 records the staging write preflight and teardown contract before any staging write executor exists. The package validates the preflight locally and prints a safe JSON report only. It does not create Auth users, write Supabase data, seed predictions, create leagues, run scoring, use or read service-role credentials or create a database migration.

Confirmed decisions:

1. The preflight consumes the Stage 16A-P3 manifest dry-run and Stage 16A-P4 SQL preview evidence.
2. The preflight sets `canStartWrite: false`.
3. The preflight requires `requiresExplicitNextSliceApproval: true`.
4. The preflight records required local environment variable names without reading or printing values.
5. Future teardown must require both the reserved synthetic email domain and the synthetic metadata marker.
6. Future acceptance must prove zero-residue teardown and clean reseed validation.
7. The generator fails closed against WC26 production and non-Euro project references.
8. The package has no database writes, no user creation and no prediction seeding.
9. Original Predictor and KO Predictor remain separate; no combined totals or blended standings are approved.
10. Active migrations remain 21 and Migration 019 is applied.

Next sequenced package: Stage 16A-P6A — Seed write acceptance plan only, still docs/audit/test-only and no-write.


## Stage 16A-P6A — Seed write acceptance plan only

Status: complete in development as a docs/audit/test-only no-write acceptance plan.

Stage 16A-P6A records the seed write acceptance plan before any staging write executor exists. The package validates the acceptance contract locally. It does not create Auth users, write Supabase data, seed predictions, create leagues, run scoring, use or read service-role credentials or create a database migration.

Confirmed decisions:

1. The plan consumes the Stage 16A-P3 manifest dry-run and Stage 16A-P5 preflight evidence.
2. The plan sets `writesDatabase: false`.
3. The plan sets `canStartWrite: false`.
4. The plan sets `hasWriteExecutor: false`.
5. The plan requires `requiresExplicitNextSliceApproval: true`.
6. The plan records required local environment variable names without reading or printing values.
7. The plan defines exact later-slice write flags and the teardown confirmation phrase.
8. Future teardown must require both the reserved synthetic email domain and the synthetic metadata marker.
9. Future acceptance must prove zero-residue teardown and clean reseed validation.
10. The model fails closed against WC26 production, non-Euro project references and `main`.
11. The package has no database writes, no user creation and no prediction seeding.
12. Original Predictor and KO Predictor remain separate; no combined totals or blended standings are approved.
13. Active migrations remain 21 and Migration 019 is applied.

Next sequenced package: a default-off write-capable skeleton only after explicit approval.


## Product completeness register alignment

Status: complete in development as a docs/audit-only decision-alignment package.

This slice records Euro 2028 scale gates before wider registration and before matchday one. It adds `docs/PRODUCT-COMPLETENESS-ROADMAP.md`, adds `docs/archive/STAGE-PRODUCT-COMPLETENESS-REGISTER-ALIGNMENT.md`, and wires a product-completeness audit into the local gate chain.

Confirmed decisions:

1. RULES-1 is a signup gate and must include scoring, tie-breaks, correction policy, support contact, privacy note and deletion path.
2. Display-name and league-name moderation is a signup gate with admin rename power, blocked-word checks and published policy wording.
3. A scalable support channel is a signup gate; Stage OWNER-SIGNUP-DECISIONS-1 records generic Contact admin wording.
4. Capacity planning is a signup gate; Stage OWNER-SIGNUP-DECISIONS-1 records an initial cap of 250 users and 20 leagues, planned against the current low-cost/free setup until hosting, Supabase Auth and email limits are reviewed.
5. Email confirmation is a signup-gate decision; Stage OWNER-SIGNUP-DECISIONS-1 records ON for public registration.
6. Privacy note and deletion path are signup gates; Stage OWNER-SIGNUP-DECISIONS-1 records simple data-use wording with no specific data-region claim until the actual project region is confirmed.
7. Tie-break ladders, load reality-check and uptime/error monitoring are tournament gates before the first Euro 2028 match.
8. Offline player lifecycle, unknown-route fallback and growth mechanics remain scheduled follow-ons.
9. This package has no database writes, no user creation and no prediction seeding.
10. Original Predictor and KO Predictor remain separate; no combined totals or blended standings are approved.
11. Active migrations remain 21 and Migration 019 is applied.

Next sequenced package: RULES-1 or a narrow owner-decision register update for support channel, capacity and email confirmation.

## Stage PRODUCT-UNKNOWN-ROUTE-1 — Unknown route fallback

Status: complete in development as a scheduled product-completeness recovery slice.

Unknown `#/...` app hashes now render a friendly recovery surface rather than silently falling through to Home. The surface explains that the requested screen is not available, reassures the user that predictions have not been changed, and offers direct links to Home, Groups and How to play. Existing Admin section recovery is unchanged: invalid `#/admin?section=...` values remain inside the protected Admin route and recover to overview.

This package is UI/test/docs/audit only. It does not write Supabase data, create users, seed predictions, use or read service-role credentials, change scoring, change resolver logic or create a migration. Active migrations remain 21 and Migration 019 is applied.


## Stage RULES-1A — Rules hub UI upgrade — CLOSED-PENDING-LOCAL-GATES

RULES-1A upgrades the existing `#/how-to-play` destination into a visible rules hub covering scoring, locks, competition separation, audited corrections, name policy, privacy/deletion expectations, support-contact status and the tie-break tournament gate. It is UI/model/docs/audit-only: no Supabase writes, no Auth users, no prediction seeding, no service-role credential use/read/print, no scoring change, no resolver change, no new route and no migration. Active migrations remain 21 and Migration 019 is applied.

## Stage PUBLIC-SIGNUP-READINESS-1 — Public signup readiness model

Accepted. The public-signup readiness model is centralised, tested and audited. The Rules Hub consumes it. Stage OWNER-SIGNUP-DECISIONS-1 now records the owner choices in that model. Wider public registration remains closed until every explicit implementation and acceptance gate is closed by later approved stages.

## Stage OWNER-SIGNUP-DECISIONS-1 — Public signup owner decision pass

Accepted. The signup owner decisions are recorded without opening public registration. The remaining work before public signup is implementation and acceptance, especially name and league moderation.

## STAGE-RULES-SCORING-LOCK-1 — Rules, scoring and tournament truth lock

Status: complete as a docs/audit recording stage.

This stage records the locked product scoring and rules contract before the Entry/Review journey stage. It adds `docs/archive/STAGE-RULES-SCORING-LOCK-1.md`, adds `docs/RULES-SCORING-LOCKED-CONTRACT.md`, updates the decision register, agent rules, product roadmap and streamlined batch order, and wires `audit:rules-scoring-lock` into `npm run check`.

Recorded decisions:

1. Original Predictor scoring is locked to 3/5 group match scoring, 2-per-position group table scoring, +5 all-four group bonus, 8/12/15/20 bracket milestone scoring, +25 champion bonus, 25/15/5 calculated group-goals bands and 30 correct top scorer.
2. KO Predictor scoring is locked to 10 exact 90-minute score, 5 advancing team, 5 correct 90-minute result edge cases, +3 method requiring correct advancing team and +3 first-goal bracket as provisional/API-dependent.
3. Correct score and correct result are not cumulative.
4. Group goals are auto-calculated only from the 36 group-score predictions and are not manually editable.
5. Unresolved in-group prediction ties and unresolved best-third ties prompt the user to Change scores or Pick positions after score-derived tiebreakers fail.
6. Manual unresolved-tie choices award no points and do not affect official real tables.
7. Bracket invalidation after group-score edits, joker confirmation, locked prediction snapshot and league-after-lock rules are recorded for the next journey/league stages.
8. Non-standard match states do not score until the official result state is valid.
9. Final tied-rank ladders are recorded separately for Original Predictor and KO Predictor.
10. Active migrations remain 21, Migration 019 is applied, and no runtime scoring/resolver/Supabase/Auth/RLS/result-entry change is included.

Next streamlined stage: `STAGE-ENTRY-AND-REVIEW-JOURNEY-1`, after any explicitly approved runtime scoring alignment needed to make the locked contract live.

<!-- group goals correction marker: group goals are auto-calculated only. -->


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



## Stage STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1 — IMPLEMENTATION GUARD RECORDED

The first public-signup implementation slice is recorded: client-side pre-Auth display-name moderation now protects the account creation path before Supabase Auth is called, while the existing display-name availability RPC check remains in place. Public registration remains closed until external Auth/config checks are confirmed. Active migrations remain 21 and Migration 019 is applied.


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

Ledger status: accepted as no-write preparation.

The stage records the future seed write executor structure without introducing the executor. It keeps `writesDatabase: false`, `canStartWrite: false`, `hasWriteExecutor: false`, no database writes, no user creation, no prediction seeding, no service-role credential use, no scoring change, no resolver change and no Migration 019.

Original Predictor and KO Predictor remain separate. Active migrations remain 21.
