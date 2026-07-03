# EURO 2028 PREDICTOR
## Functional Completion Ledger
### Version 1.29 — Stage 13G-B Player Insight and Team Profile lifecycle alignment

> **Purpose:** The Decision Register records decisions. This ledger records actual functional state. A stage may not be called complete while an approved item in its scope remains partial, missing or incoherent.

## Standing priority

**FUNCTION before COMPLETION before POLISH.** Every component must be fully usable and no user-facing promise may remain half-wired. Broad visual refinement is deferred until the core journeys carry no unresolved missing, partial or incoherent status.

## Binding batch rules

1. Every code batch updates this ledger in the same commit.
2. A stage may not be recorded complete while a scoped row is `PARTIAL`, `MISSING` or `INCOHERENT`.
3. A new UI promise, capability or development tool adds a row immediately.
4. Status changes require file, test, Terminal or deployed evidence.
5. Statuses: ✅ FUNCTIONAL · 🟠 PARTIAL · ❌ MISSING · ⚠️ INCOHERENT · 🔒 DECISION PENDING · 🚫 REJECTED · 🕓 SCHEDULED.
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
| Results and leaderboards access | ✅ FUNCTIONAL | `#/results` owns live tournament content; `#/leaderboards` owns the full competition tables and points, with More and competition-specific Home links | — |
| Core player information architecture | ✅ FUNCTIONAL | Authoritative site-access map, direct destinations and contextual entry rules are enforced by `audit:access`; restricted Admin visibility remains its own Stage 13F-E row | — |
| Team Profile Sheet | ✅ FUNCTIONAL | Accepted in Stage 13E | — |
| Head-to-head comparison | ✅ FUNCTIONAL | League and overall tables open one shared, competition-scoped surface aligning all 51 Original positions or all 15 KO fixtures with same/different/private/not-saved states | — |
| Tappable player identity | ✅ FUNCTIONAL | One accessible `PlayerIdentity` primitive is used by league standings, overall leaderboards and comparison headers; self identity remains non-interactive | — |
| Match Centre/per-match stats | ✅ FUNCTIONAL | Dedicated fixture route, previous/next navigation, canonical state, Home/Results entry, separate Original/KO views, Overall/private-league scopes, community distribution and points-on-the-line rows accepted in Stage 13F-C | — |
| Bracket Health | ✅ FUNCTIONAL | Immutable Original bracket compared with canonical known fixtures, round health, route conflicts, secured/remaining points, unresolved-original fallback and Match Centre links accepted in Stage 13F-D | — |
| Tournament-pick contract | ✅ FUNCTIONAL | Approved Original-only set: total tournament goals, top scorer and highest-scoring team; 20 points each; nearest-total ties and official joint winners receive full points; one global lock; no joker; no KO points; player selector waits for Stage 17A | — |
| Tournament-pick persistence and player-facing UI | 🕓 SCHEDULED | Canonical storage, save/review, Home live-race, points breakdown and H2H consumption must implement the approved contract without a standalone Awards route | 17A |
| Player insight and points storytelling | ✅ FUNCTIONAL | Shared insight model and presentation use canonical awarded rows for rank gaps, source breakdown, matchday/round evidence, best period/call, streaks and corrections; authorised other-player reads reuse Original/KO privacy through Migration 017; H2H survives isolated insight failure; Original and KO totals never combine | — |
| Provisional team seeding and zero-code-change rehearsal | 🕓 SCHEDULED | Guarded 24-team staging seed, replace/confirm mode and Stage 17 zero-code-change rehearsal | 16A |
| Synthetic identities and deterministic persona catalogue | 🕓 SCHEDULED | Nineteen approved personas, dual identity markers and local-only Admin API credentials | 16A |
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
| Guest-to-account transfer | ✅ FUNCTIONAL | Signed-in users continue unfinished browser drafts; eligible Original and KO entries transfer through existing controlled RPCs, never overwrite account entries and clear only after confirmed save | — |
| Signup encouragement | ✅ FUNCTIONAL | Progress-aware account prompts appear in Original and KO guest journeys; Account detects saved browser predictions and offers the safe transfer action | — |
| Manual JSON file controls | 🚫 REJECTED | Removed from the live journey; dormant recovery components were deleted in Stage 13F-H | — |
| Lucky Dip | ✅ FUNCTIONAL | Groups-only local weighted score generation; fill-empty and confirmed replace-all modes preserve jokers and clear stale bracket picks | — |

## Section C — Admin

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Server result entry/corrections/recalculation | ✅ FUNCTIONAL | Revision-safe and audit-logged | — |
| Admin invisible to non-admins | ✅ FUNCTIONAL | Server-authorised discovery and direct-route gate accepted in Stage 13F-E | — |
| Admin UI fit for purpose | 🟠 PARTIAL | Stage 13G-A route-integrity slice fixes Admin section destinations and removes the Home fall-through. Remaining central configuration and shared interaction primitive work stays scheduled. | 13G-A |
| Admin section destinations and deep links | ✅ FUNCTIONAL | Canonical section registry and query-addressed `#/admin?section=...` destinations keep every section inside the protected Admin route, including invalid-section recovery. | — |
| Staging Time & Phase controls | ✅ FUNCTIONAL | Owner-only audited shared clock, preset phases, custom time and site-wide warning accepted with approved Migration 016 | — |
| Profile curation | ✅ FUNCTIONAL | Stage 13E owner editing | — |
| Stage 13F-K operation inventory | ✅ FUNCTIONAL | Existing operations, genuine fixture/reconciliation/readiness gaps, exclusions and four-batch sequence approved in Stage 13F-K0 | — |
| Migration 018 server/database contract | ✅ FUNCTIONAL | Migration, 50 local plus 50 linked pgTAP tests and repository audit prove fixture revision, protected reads, owner-only fixture update, complete reconciliation, readiness output and append-only audit on Euro staging | — |
| Fixture schedule operations | ✅ FUNCTIONAL | Owner-only revision-safe date, venue, venue-local kick-off and schedule-status controls are connected to Migration 018; results administrators remain read-only and participants/resolver slots remain outside scope | — |
| Tournament-wide scoring reconciliation | ✅ FUNCTIONAL | Owner-only note/confirmation-gated whole-tournament replacement recovery is connected to the canonical scorer and preserves separate Original/KO totals | — |
| Tournament-pick Admin readiness home | ✅ FUNCTIONAL | One control-room section renders total goals, top scorer and highest-scoring team plus the Stage 17A dependency, with no fake outcome controls | — |
| Operational readiness summary | ✅ FUNCTIONAL | One read-only presentation groups fixture, participant, result, scoring, Team Profile and safeguard evidence from Migration 018 | — |
| Admin audit filters and detail | ✅ FUNCTIONAL | Read-only category filters expose up to 200 append-only events with actor, target, match, before/after and scoring-run detail | — |
| Complete Admin operations backbone | 🟠 PARTIAL | K0/K1 operations, K3 role boundaries and Stage 13G-A section routing are proven. Central config/shared primitives remain Stage 13G-A; Tournament Picks executable outcomes remain Stage 17A. | 13G-A |

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
| Home first-visit conversion hook | ✅ FUNCTIONAL | Home now distinguishes new guests, returning browser drafts and signed-in users with account-conversion copy while keeping guest drafts browser-only until explicit save. | — |
| Tournament-start and prediction-lock countdowns | ✅ FUNCTIONAL | Home displays prediction-lock and tournament-start countdowns from `resolveTournamentLifecycle`; date-only staging starts no longer override the central precise tournament-start timestamp. | — |
| In-tournament today's-matches hub | ✅ FUNCTIONAL | Home now owns a Today’s match hub that promotes live or next fixture context into Match Centre without presenting missing results as final. | — |
| Predicted group standings | ❌ MISSING | Complete shared predicted tables are not available in the approved Groups journey. | 13G-C |
| Shared third-place table | ❌ MISSING | One canonical predicted/live third-place presentation is not used wherever standings appear. | 13G-C |
| Results, leaderboards and Match Centre lifecycle alignment | ✅ FUNCTIONAL | Results, Leaderboards and Match Centre now consume central lifecycle state plus canonical result/fixture state through `audit:results-lifecycle`; no competitions are combined. | — |
| Central KO-readiness signal | 🟠 PARTIAL | Home now exposes a single KO readiness model for its own surface. Navigation and Leagues still need to consume the same signal in a later Stage 13G-B/C slice. | 13G-B |
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

## Section G — Information architecture and coherent UI

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Stage 13G IA map and destination ownership | ✅ FUNCTIONAL | Approved direct/contextual destination map, homeless/duplicate findings and object-surface ownership recorded in Stage 13G-0 | — |
| More lifecycle strategy | ✅ FUNCTIONAL | Approved phase-specific ordering, authorised Admin separation and pre-readiness KO explainer contract | — |
| Hardwired-data inventory | ✅ FUNCTIONAL | Active production evidence recorded for chronology, stage inference, totals, rules prose, stale Admin values, dates, metadata and primitive bypasses | — |
| Stage 13G-A route integrity and Admin sections | ✅ FUNCTIONAL | Canonical Admin section registry, query-addressed section destinations, invalid-section recovery, route-render tests and dead-destination audit | — |
| Stage 13G-A central configuration and shared primitives | ✅ FUNCTIONAL | Central provisional lifecycle config, account autosave unblock, shared confirmation, design-system selector adoption across active surfaces, refresh-policy enforcement and foundation-class ratchet groundwork are proven by audits. | — |
| Stage 13G-B tournament comprehension and chronology | 🕓 SCHEDULED | Real-time ordering, By group/By date, canonical rules guide, hardwired-data removal and Euro share assets | 13G-B |
| Stage 13G-C people, profiles and sharing | 🕓 SCHEDULED | Shared player overview, one-tap invites, static/dynamic previews and synthetic identity preparation | 13G-C |
| Stage 13G-D seeded whole-surface coherence | 🕓 SCHEDULED | Stage 16 cast, Scotland reference profile, all-screen re-baseline and charter review | 13G-D |
| Whole-app new-player walk-through | 🕓 SCHEDULED | Owner acceptance after navigating every direct and contextual journey as a casual first-time player | 13G-D |

## Change log

- **v1.29:** Stage 13G-B Player Insight and Team Profile lifecycle alignment from `a651d33` adds central lifecycle copy to Player Insight and Team Profile, preserves the canonical server privacy phrase, keeps Team Profile aggregates Original-only, excludes KO Predictor data from Team Profile percentages, adds `audit:player-team-lifecycle` to `npm run check`, and keeps active migrations at 18 with no Migration 019.
- **v1.28:** Stage 13G-B League lifecycle alignment slice from `03bc447` adds central lifecycle input to private leagues, competition-scoped Original/KO release copy, member-comparison release copy and `audit:league-lifecycle` in `npm run check`. No database change and no Migration 019.
- **v1.27:** Stage 13G-B Results lifecycle alignment slice from `177605b` adds central lifecycle banners to Results, competition-scoped lifecycle copy to Leaderboards, fixture-level lifecycle copy to Match Centre and `audit:results-lifecycle` in `npm run check`. No database change and no Migration 019.


- **v1.26:** Stage 13G-B prediction lifecycle slice from `1dda826` adds Original Predictor lifecycle cards, KO Predictor real-fixture readiness, central tournament lifecycle input on the KO route and `audit:prediction-lifecycle` in `npm run check`. No database change and no Migration 019.

- **v1.20:** Closes Stage 13F-K3 from `c4342f1` after three-role deployed acceptance, same-value transactional fixture proof with exact rollback, one real owner complete reconciliation, read-only event/run/separate-total verification, linked database gates and final deployed verification. No product code or Migration 019 is added; Stage 13G-A becomes next.

- **v1.25:** Stage 13G-B Home lifecycle slice from `08524b6` adds Home first-visit/returning-guest conversion copy, central-config prediction-lock and tournament-start countdowns, Today’s match hub entry to Match Centre, a Home KO-readiness signal and `audit:home-lifecycle` in `npm run check`. It fixes date-only staging tournament starts so they cannot override the central precise tournament-start timestamp. No database change and no Migration 019.
- **v1.24:** Stage 13G-A interaction-enforcement slice from `b38ec64` replaces remaining active-surface native selectors with `SelectField`, routes high-impact Admin operations through `ConfirmDialog`, removes manual refresh controls outside retry/error states, adds `audit:interaction-enforcement` to `npm run check` and sets the active `foundation-*` ratchet at 245 with current use below the cap. No database change and no Migration 019.

- **v1.23:** Stage 13G-A central-configuration/shared-primitives slice from `c8a5cf3` adds central provisional tournament-start and prediction-lock values, a lifecycle resolver consumed by the Original Predictor account autosave path, shared `ConfirmDialog`, shared `SelectField`, first sign-out and League-picker adoptions, refresh-policy groundwork and `audit:shared-primitives` in `npm run check`. No database change and no Migration 019.

- **v1.22:** Stage 13G-A route-integrity slice from `3c41628` adds canonical Admin section destinations, replaces legacy `#admin-*` links with protected `#/admin?section=...` hashes, adds invalid-section recovery, route-render integration tests and a dead-destination audit in `npm run check`. No database change and no Migration 019.

- **v1.21:** Stage 13G-R0 corrects the false Stage 13F-F navigation claim, downgrades Admin UI/coherent operations truthfully, consolidates the 3 July amendments into the canonical Register, approves C1 Option A and the Original-bracket invalidation contract, records offline players as decision pending, rebuilds accepted-commit chronology through `b7f50de`, and makes same-commit Ledger updates mandatory for every future batch. Documentation only; no product code, database action or Migration 019.

- **Accepted-commit chronology:** 13F-E `8349e83`; 13F-F `369ddfc` (retrospectively corrected by v1.21); 13F-G `7324d43`; 13F-H `74c8dd3`; 13F-I `63d7acb`; 13F-J `f7f2fb5`; 13G-0 `efce59f`; 13F-K0 `b6c7ddc`; 13F-K1 `0e4d5b7`; 13F-K2 `c4342f1`; 13F-K3 `b7f50de`; 13G-R0 `586c6a1`; Stage 13G test-strategy amendment `3c41628`; Stage 13G-A route-integrity `c8a5cf3`; Stage 13G-A central configuration/shared primitives `b38ec64`; Stage 13G-A interaction enforcement `08524b6`; Stage 13G-B Home lifecycle next accepted commit.

- **v1.19:** Implements Stage 13F-K2 from `0e4d5b7`: split control-room components, owner-only fixture and complete-reconciliation actions, consolidated readiness, Stage 17A Tournament Picks hand-off, filtered expandable append-only audit detail, role/timezone tests and six responsive light/dark structural baselines. No Migration 019; Stage 13F-K3 remains the final deployed role acceptance.

- **v1.18:** Implements Stage 13F-K1 from `b6c7ddc`: Migration 018, fixture revision and protected reads, owner-only fixture update, owner-only complete reconciliation, readiness output, restored `team_profile_updated` audit value, pgTAP suite and repository audit. Database-complete/UI-pending rows move to partial; Stage 13F-K2 remains next.

- **v1.17:** Approves Stage 13F-K0 from `efce59f`: complete Admin operation inventory, owner-only fixture schedule editing, owner-only whole-tournament replacement reconciliation, Migration 018 server contract, operational-readiness/audit presentation and the Stage 17A tournament-pick hand-off. No migration or product code is added; fixture/reconciliation/UI rows remain scheduled.

- **v1.16:** Records the accepted Stage 13G-0 IA map, More strategy and hardwired-data inventory as functional planning contracts. Schedules Stage 13G-A through 13G-D after Stage 13F-K, with Stage 16A seeding interleaved before the final coherence proof. No Stage 13F-K implementation, Stage 16A acceptance or Stage 13P-A row moves.

- **v1.15:** Expanded the scheduled Stage 16A opening batch to include 24 provisional teams, nineteen deterministic synthetic personas, independent phase/correction points assertions, large/tiny/multiple/no-league membership, marker-safe teardown and hosted Euro staging simulation. Added partial acceptance rows for real multi-user persistence, database-aware Time & Phase behaviour and correction recalculation. No Stage 13F-K, Stage 13P-A or Stage 17A row moves.

- **v1.14:** Stage 13F-J from `63d7acb` adds the read-only Migration 017 player-insight contract, canonical Original/KO points storytelling, Home rank-gap context, privacy-safe H2H insight and provisional `TeamLabel` treatment on the modified player surfaces. The player-insight row moves to functional after owner acceptance. A new Stage 16A provisional-team seeding rehearsal row is added as scheduled; no later-stage row moves.

- **v1.13:** Stage 13F-I approves the versioned Original Predictor tournament-pick contract from `74c8dd3`: total goals, top scorer and highest-scoring team are worth 20 points each; nearest-total ties and official joint winners receive full points; one global lock, no joker, no KO points, no migration, and the player selector waits for Stage 17A. Stage 13F-K is recorded as the complete Admin operations backbone before polish.

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
