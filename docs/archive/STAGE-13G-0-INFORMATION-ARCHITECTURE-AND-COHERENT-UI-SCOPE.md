# Euro 2028 Predictor — Stage 13G-0
## Information architecture and coherent UI scope contract

### Status

Approved scope contract. This batch changes planning documents plus one historical audit assertion so the accepted `f7f2fb5` verifier and Stage 13D audit agree. It changes no product/runtime code, database object, migration, scoring rule, resolver rule or deployed asset.

### Starting checkpoint

- Branch: `euro28-development`
- Commit: `f7f2fb5`
- Active Supabase project: `gcfdwobpnanjchcnvdco`
- Blocked WC26 production project: `ouhxawizadnwrhrjppld`
- Active migrations: 17
- Next implementation task before Stage 13G build work: **Stage 13F-K — Complete Admin Operations Backbone**

## 1. Standing principle

Stage 13G is one holistic information-architecture and coherent-interface pass governed by the Project Constitution, Design Charter, Decision Register and Functional Completion Ledger.

Every active screen is judged by the same question:

> Is everything exactly where a player would expect to find it, presented through the same primitives and anatomy used everywhere else?

Features were intentionally built function-first. Stage 13G gives those features designed homes and consistent relationships. Nothing new may be bolted onto an arbitrary page because it lacks a destination.

Stage 13G is organised by information-architecture area, not by page. Findings discovered during a build batch join the ledger backlog unless they are already inside that batch's accepted IA area.

## 2. Full information architecture map

### 2.1 Direct destinations

| Destination | Direct routes | Primary and contextual paths | User expectation | Stage 13G finding |
|---|---|---|---|---|
| Home | `#/`, `#/home` | Raised mobile Home, desktop Home, brand mark | What should I do now? What is live? How am I doing? | Correct destination. Pre-readiness KO treatment must become a modest teaser rather than a competing full journey. |
| Groups Predictor | `#/groups`; compatibility aliases `#/predict`, `#/predictions`, `#/group-stage-review` | Lifecycle Position 1, desktop primary navigation, Home Original CTA | Enter and review the 36 group predictions | Correct home. It needs shared switchable By group and By date views. |
| Original Bracket | `#/bracket` | Permanent Position 2, desktop primary navigation, Original journey | Build and monitor the permanent pre-tournament bracket | Correct and permanent. |
| KO Predictor | `#/ko-predictor`; compatibility alias `#/ko` | Position 1 at full readiness, More during early access, contextual Home treatment | Predict real knockout fixtures in a separate competition | Workspace lifecycle is sound. Pre-readiness discoverability must be a deliberate explainer, not unrestricted competing prominence. |
| Leagues | `#/leagues` | Position 4, desktop primary navigation, Home actions | Create, join, manage and compare private leagues | Correct home. Invite sharing and preview architecture are incomplete. |
| Results | `#/results` | Desktop primary navigation, More on mobile, match and leaderboard contextual links | Fixtures, scores, tables and live bracket | Correct home. Home Tournament pulse must have an intentional Results path, not only one Match Centre link. |
| Leaderboards | `#/leaderboards`; compatibility aliases `#/standings`, `#/rankings` | More, Home competition rank links, Results switcher | Full separate Original or KO standings and points story | Correct destination. Player names must activate one shared player overview. |
| Match Centre | `#/match-centre?match=<number>`; compatibility alias `#/match` | Fixture, result, points, bracket and comparison links | Everything about one match | Correctly contextual. Ordering and previous/next navigation must use kick-off chronology. |
| Account | `#/account` | Header account control, More, footer and guest prompts | Sign in, register, recover and manage profile | Repeated access is intentional. |
| Tournament | `#/tournament` | More, footer and contextual tournament links | Understand hosts, venues, dates, format and provisional groups | Split required. Tournament owns football facts only and must read from canonical config/source data. |
| How to Play | `#/how-to-play` | More, footer and Home rules links | Understand the Original Predictor, KO Predictor, scoring, locks, jokers and mechanics FAQ | Split required. Mechanics must render from central rules/config, not copied prose. |
| Admin | restricted `#/admin` | Authorised More entry and direct route | Operate and safeguard the tournament | Correctly protected. Stage 13F-K must complete the operation set before Stage 13G curation proof. |
| Not found | New explicit state; no permanent navigation | Invalid direct links only | Understand that a link is invalid and recover safely | Missing. Unknown hashes currently fall silently to Home. |

Compatibility aliases remain for old links but are not separate destinations and must not appear as duplicate navigation choices.

### 2.2 Contextual destinations and object surfaces

| Surface | Designed owner and entry | Required Stage 13G behaviour |
|---|---|---|
| Team Profile | Shared `TeamLabel` activation | Every active team name uses the same primitive and profile sheet. No raw-string bypass on Results, live bracket or Match Centre surfaces. |
| Player Overview | Shared player identity activation | Any player's name opens one overview containing authorised predictions, Original bracket view, separate points stories and H2H with the signed-in player. |
| Head to Head | Player Overview contextual action | One privacy-safe comparison journey, not separate local implementations inside leagues and leaderboards. |
| Bracket Health | Original Bracket and relevant points evidence | Remains contextual to the permanent Original bracket. |
| League invite | Copy-link action from the selected league | One-tap copy, confirmation state, human landing path and rich preview. |
| More | Position 5 and desktop More control | A curated lifecycle sheet with sections and purpose, never an accumulation drawer. |

### 2.3 Current homeless, accidental or duplicated behaviour

1. Player insight and H2H are embedded separately in Leaderboards and Leagues rather than owned by one player overview.
2. League sharing exposes a join code but has no server-visible invite destination or rich preview journey.
3. Unknown routes silently return Home through `routeFromHash`, hiding broken links.
4. Team profile access is inconsistent because some Results and live-bracket surfaces render raw team strings instead of `TeamLabel`.
5. Home Tournament pulse links only to an individual Match Centre when the destination expectation is also the full Results surface.
6. Route descriptions and More descriptions are split between `appRoutes.js` and `EuroAppShell.jsx`, allowing destination metadata to drift.

## 3. More strategy

### 3.1 What earns permanent primary navigation

Primary navigation is reserved for the highest-frequency tournament actions:

1. Groups or KO according to the confirmed lifecycle;
2. permanent Original Bracket;
3. raised Home;
4. Leagues;
5. More.

No sixth mobile position is introduced. Results remains a desktop primary destination and a curated mobile More destination.

### 3.2 Before the tournament starts

1. Tournament
2. How to Play
3. Results
4. Leaderboards
5. KO Predictor — coming after the group stage
6. Account
7. Appearance
8. Admin — separate, authorised users only

Tournament is first because a new player is still learning the football context. How to Play is second because a new player then needs the app mechanics. Stage 13G destination reference adoption amends this map so Tournament and How to Play become two separate More/footer destinations rather than one combined page.

### 3.3 Group stage live, before any complete Round of 16 pairing

1. Results
2. Leaderboards
3. Tournament
4. How to Play
5. KO Predictor — coming after the group stage
6. Account
7. Appearance
8. Admin — separate, authorised users only

### 3.4 Early KO access

1. KO Predictor — confirmed fixtures available
2. Results
3. Leaderboards
4. Tournament
5. How to Play
6. Account
7. Appearance
8. Admin — separate, authorised users only

Groups remains Position 1. Only resolved real knockout fixtures enter the KO workspace.

### 3.5 Full KO readiness

1. Group stage review
2. Results
3. Leaderboards
4. Tournament
5. How to Play
6. Account
7. Appearance
8. Admin — separate, authorised users only

KO becomes Position 1 only at the already confirmed full readiness boundary.

### 3.6 Pre-readiness KO teaser contract

The active KO workspace remains unavailable before a display-ready real fixture exists. More contains a deliberate teaser that explains:

- KO Predictor is a separate competition;
- it opens as real knockout fixtures become known;
- its points and jokers never combine with the Original Predictor;
- no unresolved fixture, score input or fake access is shown.

Home may contain at most a modest secondary mention before early readiness. The current full KO statistic and full-size competition card must not compete with the Original Predictor while players are learning the site.

## 4. Hardwired-data inventory

The inventory covers the active production import graph. Versioned central contracts, deterministic test fixtures, Stage 16 scenario data and quarantined WC26 source are intentionally excluded.

### 4.1 Match chronology currently depends on match number

| Evidence | Current issue | Required source |
|---|---|---|
| `src/home/homeDashboardModel.js:45-52` | Home selects live/upcoming after match-number sorting | Real `kickoffAt`, then canonical scheduled date fallback |
| `src/results/resultModel.js:160` | Canonical results are initially sorted by match number | Context-specific chronological presentation |
| `src/results/resultModel.js:264-265` | Completed uses descending match number; upcoming keeps source order | Completed most-recent-first; upcoming next-kick-off-first |
| `src/matchCentre/matchCentreModel.js:80-93` | Previous/next follows match number | Chronological tournament fixture sequence |
| `src/matchCentre/matchCentreModel.js:192-197` | Default fixture derives from match-number order | Live first, then nearest future kick-off, then most recent result |
| `src/results/resultService.js:52-58` | Database request is ordered by match number | Service may return canonical data, but presentation order must not rely on it |
| `src/koPredictor/KoPredictorMatchCentre.jsx:66-70` | KO fixtures retain resolver/match-number ordering | Kick-off order inside the canonical round grouping |

### 4.2 Stage identity is inferred from number ranges

The following active files independently infer stages from `<=36`, `<=44`, `<=48`, `<=50` or a `51` fallback:

- `src/results/resultModel.js:28-33, 235-244, 333`
- `src/matchCentre/matchCentreModel.js:10-22, 38, 68-69, 114-130`
- `src/player/playerInsightModel.js:12-24`
- `src/leagues/leagueModel.js:41-46, 168-220`
- `src/koPredictor/koPredictorPresentationModel.js:1-5, 35-39`
- `src/koPredictor/KoPredictorMatchCentre.jsx:9-11, 70`
- `src/admin/AdminOperations.jsx:125-126, 317`
- `src/admin/AdminControlRoomSections.jsx:135, 144-145, 164`

These must use canonical stage, group and competition metadata. The 24-team/51-match format remains a valid central contract; components must not rediscover it independently.

### 4.3 Fixed totals and progress copy are duplicated in presentation components

Group, bracket and total counts are typed directly in:

- `src/App.jsx:117`
- `src/home/HomeDashboard.jsx:188`
- `src/journey/GroupsPredictor.jsx:43, 47, 71, 182-183`
- `src/journey/PredictionJourneyView.jsx:69-99, 138-157`
- `src/journey/PredictionReview.jsx:23-39`
- `src/journey/OriginalBracket.jsx:50-51`
- `src/guest/GuestAccountTransfer.jsx:146`
- `src/results/ResultsAndLeaderboards.jsx:171`

Visible totals must flow from the canonical tournament reference or versioned prediction model.

Joker and operational totals are repeated in:

- `src/journey/PredictionJourneyView.jsx:210` — “5 group jokers”
- `src/koPredictor/KoPredictorMatchCentre.jsx:126` — “Five KO jokers already used”
- `src/admin/AdminControlRoomSections.jsx:253` — “51 joker-eligible matches” and “30 knockout slots”

These must flow from central scoring and tournament configuration.

### 4.4 Six matches per group is independently assumed

- `src/results/ResultsPresentation.jsx:49`
- `src/results/resultModel.js:40, 43`
- `src/bracketHealth/bracketHealthModel.js:47-49`

The presentation must derive group fixtures from canonical membership and match data.

### 4.5 Rules prose can drift from the scoring contract

`src/tournament/TournamentOverview.jsx:37-52` manually types prediction, joker, bracket, lock and competition-separation rules. Only selected numeric values at lines 57-68 come from `EURO_SCORING_CONFIG`.

Stage 13G-B must add one rules presentation model sourced from:

- central scoring configuration;
- prediction contract;
- tournament-pick contract;
- lock contract;
- privacy/release contract;
- canonical tournament totals.

The page renders guide sections from that model. Scoring values and binding rules must never be copied into free prose.

### 4.6 Stale Admin development values

`src/admin/AdminOperations.jsx:198-200` displays `Environment: development` and `16 active migrations`. The active project is staging and there are 17 migrations at this checkpoint. Both values must come from runtime or server-authorised operational data.

### 4.7 Raw date and time presentation

`src/matchCentre/MatchCentre.jsx:45` displays the raw `kickoffAt`/date value. Stage 13G-B must provide one shared tournament date/time formatter using the Europe/London display context, explicit time-to-be-confirmed handling and no raw ISO timestamp presentation.

### 4.8 Destination metadata is split

- `src/app/appRoutes.js:20-31` owns labels, hashes and icons.
- `src/app/EuroAppShell.jsx:29-37` separately owns More descriptions.
- `src/app/EuroAppShell.jsx:59-69` manually assembles More order.

Stage 13G-A must create one central destination registry containing description, IA category, lifecycle visibility and route behaviour.

### 4.9 Inherited and incomplete share metadata

`index.html` contains a fixed development canonical URL, no `og:image` and `twitter:card="summary"`. The deployed `public/og-image.png`, `public/icon-192.png` and `public/icon-512.png` are inherited WC26 identity assets.

Stage 13G-B/C must replace them with Euro identity assets and complete static Open Graph metadata. This does not restore the deferred PWA manifest or service worker before Stage 18C.

### 4.10 Shared primitive bypasses

`src/results/ResultsPresentation.jsx:44-60, 84-92, 107-110` renders raw team labels in group tables, live bracket cards and result rows. These surfaces must use `TeamLabel` so the same identity and profile behaviour applies everywhere.

Player-name activation is also inconsistent. Existing `PlayerIdentity` usage must become the single activation primitive for every player name across leaderboards, leagues, comparisons and Match Centre impact lists.

## 5. Stage 13G batch structure

### Stage 13G-0 — IA and scope contract

Documents only:

- full destination map;
- More lifecycle strategy;
- hardwired-data inventory;
- batch boundaries;
- Stage 16 interleaving;
- league-preview feasibility and migration boundaries;
- ledger rows.

No product/runtime code or migration. One audit-only compatibility assertion is corrected because it is already stale at the starting checkpoint.

### Stage 13G-A — Destinations and discovery

IA area: where users go and how they get there.

- one central destination registry;
- phase-aware grouped More sheet;
- pre-readiness KO teaser and reduced Home competition;
- explicit not-found state;
- corrected Home-to-Results path;
- contextual ownership for Match Centre, Team Profile, Player Overview, H2H and Bracket Health;
- no accidental or duplicate entry paths;
- access-map and design-baseline updates.

No migration is expected.

### Stage 13G-B — Tournament comprehension and match organisation

IA area: how tournament information is ordered and explained.

- one chronological fixture-ordering primitive;
- upcoming next-kick-off-first;
- completed most-recent-first;
- Match Centre chronological previous/next;
- shared By group and By date presentations;
- default By group before the opening match;
- default By date once matches begin;
- retain the player's manual view preference;
- rebuild Tournament as a key destination for football facts;
- add How to Play as the separate mechanics, scoring, locks and FAQ destination;
- tournament facts and venues from canonical sources;
- rules guide generated from versioned contracts/configuration;
- hardwired count, stage and date removal;
- Euro favicon, icons and generic static OG image.

No migration is expected.

### Stage 13G-C — People, profiles and sharing

IA area: how users and social journeys connect.

- any player name activates one shared player overview;
- authorised predictions, permanent Original bracket, separate Original/KO points stories and H2H live inside that overview;
- existing privacy gates apply independently to every subsection;
- one-tap league invite link with copied/failed confirmation states;
- generic static Open Graph preview as the minimum;
- dynamic per-league preview title and description using a static Euro invite image;
- prepare the privacy-safe `is_synthetic` identity marker for Stage 16.

A narrow read-contract migration may be required for `is_synthetic` and/or invite-safe league metadata. It must be proved and separately approved before implementation. No raw email or auth metadata may be exposed.

### Stage 13G-D — Seeded proof and whole-surface coherence

IA area: whether the product operates as one coherent system.

- use the Stage 16A provisional and synthetic cast;
- populate Scotland as the reference Team Profile through the completed Admin curation workflow;
- document the Stage 17 data-entry procedure for the remaining 23 teams;
- prove player overview across overall, league and Match Centre contexts;
- prove dynamic league previews in supported group-chat preview tools;
- exercise every lifecycle-specific More state;
- re-baseline every active screen at 380, 768 and 1200 pixels in both themes;
- screen-by-screen charter review;
- owner walk-through as a new player;
- no orphaned entry points, inconsistent primitives or avoidable clutter.

## 6. Position against Stage 13F-K, Stage 16 and Stage 13P-A

Approved sequence:

1. Accept Stage 13G-0 documents from checkpoint `f7f2fb5`.
2. Complete Stage 13F-K — Complete Admin Operations Backbone.
3. Build Stage 13G-A.
4. Build Stage 13G-B.
5. Build Stage 13G-C.
6. Complete the separately approved Stage 16A synthetic-marker and staging-effective-time preconditions.
7. Seed Stage 16A provisional teams, synthetic users, predictions and leagues.
8. Complete Stage 13G-D and Stage 16A acceptance in the same evidence window, moving each ledger row independently.
9. Proceed to Stage 13P-A converging bracket/share image only after Stage 13G is accepted.

Stage 13G does not replace Stage 16. Stage 16 supplies realistic data and lifecycle states; Stage 13G owns the coherent user-facing architecture tested against them.

## 7. League link-preview feasibility decision

### 7.1 Static preview — mandatory minimum

The site must provide:

- Euro `og-image.png`;
- Euro favicon and future-ready 192/512 identity assets;
- `og:image` and `og:site_name`;
- `twitter:card="summary_large_image"`;
- environment-correct canonical URL.

This requires no migration or server function.

### 7.2 Dynamic per-league preview — approved direction

Hash URLs cannot produce per-league Open Graph data because fragments are not sent to social crawlers. The invite must therefore use a server-visible path such as:

`https://<site>/invite/<join-code>`

A Netlify function or edge response may:

1. validate the code;
2. retrieve invite-safe league metadata;
3. return crawler-readable HTML containing the league name and generic Euro invite image;
4. redirect human visitors to `/#/leagues?join=<code>`.

Approved public metadata is limited to league name and generic product copy. Member names, standings, owner email and prediction data are forbidden.

### 7.3 Trade-off

A static preview is simpler and cacheable but identical for every league. Dynamic title/description is more persuasive and is approved, but adds a server path, cache/error behaviour and a narrowly defined invite-metadata read. Dynamic image generation is rejected as disproportionate complexity.

## 8. Team-profile proof and Stage 17 procedure

Stage 13G-D uses seeded Scotland as the reference profile and proves:

- owner curation through the Stage 13F-K Admin workflow;
- curated facts;
- app-owned tournament data;
- privacy-authorised aggregates;
- TeamLabel access on every relevant surface;
- revision and audit behaviour;
- empty and partial states.

The resulting procedure becomes the Stage 17 checklist for the remaining 23 teams. Completing those profiles closer to the tournament must be data entry only, with no component, resolver or schema change.

## 9. Ledger rows

### After accepted Stage 13G-0

| Ledger row | Status |
|---|---|
| Stage 13G IA map and destination ownership | ✅ FUNCTIONAL |
| More lifecycle strategy | ✅ FUNCTIONAL |
| Hardwired-data inventory | ✅ FUNCTIONAL |
| Stage 13G-A destinations and discovery | 🕓 SCHEDULED |
| Stage 13G-B tournament comprehension and chronology | 🕓 SCHEDULED |
| Stage 13G-C people, profiles and sharing | 🕓 SCHEDULED |
| Stage 13G-D seeded coherence acceptance | 🕓 SCHEDULED |
| Whole-app new-player walk-through | 🕓 SCHEDULED |

No Stage 13F-K implementation row moves. No Stage 16A acceptance row moves. No Stage 13P-A row moves.

## 10. Migration decision

Stage 13G-0 requires no migration.

Stage 13G-A and Stage 13G-B are expected to require no migration.

Stage 13G-C must inspect existing contracts before deciding whether a narrow migration is needed for:

- privacy-safe `is_synthetic` identity output;
- invite-safe league metadata for dynamic Open Graph responses.

Any such migration is a separate approved package. Stage 13G-D consumes Stage 16 data and does not justify a migration by itself.

## 11. Exit condition

Stage 13G closes only when:

- every destination has an intentional home and path;
- More follows the approved phase strategy;
- match ordering follows real time;
- both group views use shared components;
- the rules guide cannot drift from central contracts;
- all team and player names use shared primitives;
- league invites copy and preview correctly;
- Scotland proves the future Team Profile data-entry workflow;
- every active screen is re-baselined in both themes;
- the screen-by-screen charter review finds no orphaned entry point, duplicated anatomy or avoidable clutter;
- Nicky accepts the app while walking it as a new casual player.


| How to play | `#/how-to-play` | More and footer | Original Predictor, KO Predictor, scoring, locks, jokers and mechanics FAQ | Split from Tournament in Stage 13G-B-TOURNAMENT-1. |
