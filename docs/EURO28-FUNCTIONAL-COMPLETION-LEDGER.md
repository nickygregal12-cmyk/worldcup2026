# EURO 2028 PREDICTOR
## Functional Completion Ledger
### Version 1.48 — Product completeness register alignment

Product completeness register alignment is accepted as a docs/audit-only scale-gate package. It records the consolidated product completeness roadmap, moves RULES-1, moderation, scalable support, capacity planning, email confirmation, privacy/deletion, tie-break ladders, load reality-check and uptime/error monitoring into explicit signup/tournament gates, and keeps owner-specific values as recorded decisions before wide signups. It does not execute Supabase writes, create Auth users, seed predictions, use or read service-role credentials, change scoring, change resolver logic, change UI routes or create a database migration. Original Predictor and KO Predictor remain separate, active migrations remain 18 and no Migration 019 is created.

### Version 1.47 — Stage 16A-P6A seed write acceptance plan

Stage 16A-P6A — Seed write acceptance plan only is accepted as a docs/audit/test-only no-write package. It records exact local environment names, exact later-slice write flags, exact synthetic markers, exact teardown selector, exact zero-residue proof and exact reseed validation proof while carrying `writesDatabase: false`, `canStartWrite: false`, `hasWriteExecutor: false` and `requiresExplicitNextSliceApproval: true`. It does not execute Supabase writes, create Auth users, seed predictions, use or read service-role credentials, change scoring, change resolver logic, change UI routes or create a database migration. Original Predictor and KO Predictor remain separate, active migrations remain 18 and no Migration 019 is created.

### Version 1.46 — Stage 16A-P5 staging write preflight

Stage 16A-P5 — Staging write preflight and teardown contract is accepted as a no-write preflight package. It records local environment variable names without reading or printing values, sets `canStartWrite: false`, requires `requiresExplicitNextSliceApproval: true`, preserves dual synthetic teardown markers, zero-residue assertion and reseed validation, and does not execute Supabase writes, create Auth users, seed predictions, use service-role credentials, change scoring, change resolver logic, change UI routes or create a database migration. Original Predictor and KO Predictor remain separate, active migrations remain 18 and no Migration 019 is created.

### Version 1.45 — Stage 16A-P4 seed SQL preview dry-run

Stage 16A-P4 — Seed SQL preview dry-run is accepted as a read-only SELECT preview package. It consumes the Stage 16A-P3 manifest dry-run and provides local SQL evidence for 24 provisional team slots, 19 synthetic personas, 11 resettable time-phase cases and three league shapes. It does not execute Supabase writes, create Auth users, seed predictions, require service-role credentials, change scoring, change resolver logic, change UI routes or create a database migration. Original Predictor and KO Predictor remain separate, active migrations remain 18 and no Migration 019 is created.

### Version 1.44 — Stage 16A-P3 seed manifest dry-run

Stage 16A-P3 — Seed manifest dry-run is accepted as a manifest dry-run only package. It records the local dry-run seed manifest for 24 provisional team slots, 19 synthetic personas, 11 resettable time-phase cases, three league shapes, correction marker and dual-marker teardown selectors before any staging write path exists. It includes no database writes, no user creation, no prediction seeding, no service-role credential requirement, no scoring or resolver changes and no database migration. Original Predictor and KO Predictor remain separate, active migrations remain 18 and no Migration 019 is created.

### Version 1.43 — Stage 16A-P2 staging-effective database time

Stage 16A-P2 — Staging-effective database time is accepted as a guarded planning, model and audit package for staging-effective database time. It records the resettable privacy, simulated-lock, release, correction-review and final-state phase catalogue that later seeded acceptance must use through the existing Time & Phase control. It explicitly does not apply the irreversible real global prediction lock, does not create users, does not seed predictions, does not change scoring, does not change resolver logic and creates no database migration. Original Predictor and KO Predictor remain separate, active migrations remain 18 and no Migration 019 is created.

### Version 1.42 — Stage 13G Match Centre reference adoption

Stage 13G-MATCH-CENTRE-REF is accepted as a docs/audit-only reference-adoption package. It records the group-fixture Match Centre decisions, including Match Centre group-match reference adoption markers for `Live projection`, `Final`, `resolveGroupTable` and read-only bracket-point preview, wires `audit:stage13g-match-centre-reference-adoption` into `npm run check`, keeps Stage 13G-MATCH-CENTRE-1 as the separate implementation slice, and preserves active migrations at 18 with no Migration 019.

### Version 1.41 — Stage 13G handover and next-reference alignment

Records the post-Admin handover state after `64f2f3e`, adds the expanded Stage 13G prompt and new references for guest-transfer modal, Head-to-head page, Points Breakdown page and spec-echo audit, and schedules Match Centre, Player destinations and UI-copy hygiene as separate next batches. Active migrations remain 18 and no Migration 019 is created.

### Version 1.40 — Stage 13G Admin control-room cosmetic restyle

Stage 13G-ADMIN-1 adopts the approved Admin prototype visual language as a cosmetic-only restyle of the protected control room. Existing Admin routes, permissions, RPCs, audit behaviour, Tournament Picks readiness, scoring and database contracts remain unchanged. Active migrations remain 18 and no Migration 019 is created.

### Version 1.39 — Stage 13G Account destination rebuild

Stage 13G-ACCOUNT-1 rebuilds the signed-in Account destination with identity, quick stats, security/preferences, leagues shortcut, danger zone, one-time guest transfer dialog and Original-only pre-lock clear action. Active migrations remain 18 and no Migration 019 is created.

### Version 1.38 — Stage 13G-B Tournament / How to Play split

Stage 13G-B-TOURNAMENT-1 implements the Tournament/How to Play split: `#/tournament` now owns football facts and `#/how-to-play` owns predictor mechanics. Canonical tournament facts are corrected in `TOURNAMENT_CONFIG` and the Stage 1 model doc. Active migrations remain 18 and no Migration 019 is created.

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
| Results and leaderboards access | ✅ FUNCTIONAL | `#/results` owns live tournament content; `#/leaderboards` owns the full competition tables and points, with More and competition-specific Home links | — |
| Core player information architecture | ✅ FUNCTIONAL | Authoritative site-access map, direct destinations and contextual entry rules are enforced by `audit:access`; restricted Admin visibility remains its own Stage 13F-E row | — |
| Team Profile Sheet | ✅ FUNCTIONAL | Accepted in Stage 13E | — |
| Head-to-head comparison | ✅ FUNCTIONAL | League and overall tables open one shared, competition-scoped surface aligning all 51 Original positions or all 15 KO fixtures with same/different/private/not-saved states | — |
| Tappable player identity | ✅ FUNCTIONAL | One accessible `PlayerIdentity` primitive is used by league standings, overall leaderboards and comparison headers; self identity remains non-interactive | — |
| Match Centre/per-match stats | ✅ FUNCTIONAL | Dedicated fixture route, previous/next navigation, canonical state, Home/Results entry, separate Original/KO views, Overall/private-league scopes, community distribution and points-on-the-line rows accepted in Stage 13F-C | — |
| Match Centre group-match upgrade | 🧭 REFERENCE ACCEPTED | Stage 13G-MATCH-CENTRE-REF records and audits conditional group-only Original tabs, live/final group impact, resolver-backed read-only bracket-point preview, no matchday hardcode and group-specific prediction comparison. Implementation remains separate and must preserve knockout panel behaviour. | 13G-MATCH-CENTRE-1 |
| Bracket Health | ✅ FUNCTIONAL | Immutable Original bracket compared with canonical known fixtures, round health, route conflicts, secured/remaining points, unresolved-original fallback and Match Centre links accepted in Stage 13F-D | — |
| Tournament-pick contract | ✅ FUNCTIONAL | Contract only: approved Original-only set is total tournament goals, top scorer and highest-scoring team; 20 points each; nearest-total ties and official joint winners receive full points; one global lock; no joker; no KO points. The audit proves this contract and Admin readiness, not a player-facing entry surface. | — |
| Tournament-pick persistence and player-facing UI | 🟠 PARTIAL | Admin readiness and the contract exist, but ordinary players cannot yet enter total goals, top scorer or highest-scoring team. Build the player surface inside the Original Predictor journey, lock it at the global lock, score via the central ruleset and show the live race on Home during the tournament. Moving this earlier than Stage 17A requires explicit schedule acceptance. | 13G-C / 17A re-approval |
| Player insight engine and points storytelling | 🟠 PARTIAL | Canonical insight data, lifecycle copy and H2H engines exist, but the accepted product shape is not the current inline strip. Player-name activation must open a dedicated player view with overview, predictions, bracket/tables, dedicated H2H and dedicated points-breakdown destinations, plus informative pre-lock placeholders. The new H2H and Points Breakdown prototypes are recorded as references; implementation remains scheduled. | 13G-PLAYER-DESTINATIONS-REF / 13G-PLAYER-1 |
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
| Tournament-pick Admin readiness home | ✅ FUNCTIONAL | One control-room section renders total goals, top scorer and highest-scoring team plus the Stage 17A dependency, with no fake outcome controls | — |
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
| Stage 16A scope alignment | ✅ FUNCTIONAL | Stage 16A-S0 records the staging-only launch gates, 16A-P1 privacy-safe synthetic identity plumbing, 16A-P2 staging-effective database time, full seeded-cast exclusions, dual synthetic markers, teardown/reseed acceptance and WC26 fail-closed boundary. No component, resolver, scoring, route, database or migration implementation is included; active migrations remain 18 and no Migration 019 is created. | — |

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

- **v1.37:** Stage 13G destination reference adoption records the Tournament, How to Play, Account, Admin and Match Centre prototypes plus the build-agent brief under `docs/reference-prototypes/`, amends Stage 13G-B so Tournament/How to Play split and canonical tournament fact correction happen before UI work, sequences Account/Admin/Match Centre as later focused batches, and adds `audit:stage13g-destination-reference-adoption` to `npm run check`. Docs/audit only; active migrations remain 18 and no Migration 019 is created.

- **v1.36:** Stage 16A-P1 completes Privacy-safe synthetic identity plumbing. The repo now has a canonical local catalogue of exactly nineteen personas, reserved `@synthetic.euro28.test` emails, required `synthetic_euro28: true` metadata, dual-marker teardown guards, Euro staging project enforcement and explicit WC26 production blocking. This is no user creation, no database writes, no UI exposure, no scoring/resolver/component change and no Migration 019.

- **v1.35:** Stage 16A scope alignment adds the Stage 16A-S0 launch-gate document and audit, records 16A-P1 and 16A-P2 as separately guarded preconditions, freezes the 24-team/19-persona/league/correction/teardown scope, preserves the Euro-staging-only and WC26 fail-closed boundary, and adds `audit:stage16a-scope-alignment` to `npm run check`. No component, resolver, scoring, route, database or migration implementation is included; active migrations remain 18 and no Migration 019 is created.

- **v1.34:** Stage 13G-C1 guest import prompt updates the signed-in import surface to “Import your saved Euro 2028 predictions?”, adds the accepted primary and secondary actions, replaces internal browser-draft copy with device wording, and preserves separate Original Predictor and KO Predictor import boundaries. No database change; active migrations remain 18 with no Migration 019.

- **v1.33:** Stage 13G-H2 product-facing alignment rejects the official UEFA EURO 2028 logo as a deployable asset without explicit permission, evaluates leagues reference patterns as adopt-improved/adapt/drop before build, keeps Tournament Picks player entry as a schedule decision, records the dedicated player route direction and recommends guest import copy as the next tight build. No route, component, scoring, resolver, database or migration change; active migrations remain 18 with no Migration 019.

- **v1.32:** Stage 13G-H1 bypass-class tooling sweep from `dbdcc7d` enforces false-by-default time travel, coverage no-decrease floors, eslint-disable reason/cap governance, DEV-only fixture gating, test-fixture size ratchets and frozen bridge melt rules. No database change and no Migration 019.

- **v1.31:** Stage 13G-H0 housekeeping and record corrections from `5c9f415` update governing documents only: Tournament Picks is corrected to contract-functional but player-surface partial, Player Insight/H2H is corrected to engine-partial pending dedicated destinations, guest signup import flow is confirmed as a dominant one-tap prompt, bypass-class sweep items are recorded, the FAQ list removes result-correction mechanics, bottom-nav alignment wording is clarified, Constitution principle 14 records the slick/frictionless product sensibility, and active migrations remain 18 with no Migration 019.
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

## Stage 13G-C2 — League race-story polish

Status: complete in development.

Stage 13G-C2 adopts the useful league-reference patterns natively in the Euro design system: a current-user `YOU` row anchor, top-three designed treatment and gap-to-leader race context. Rank movement is explicitly deferred until trustworthy previous-rank data exists. Original Predictor and KO Predictor standings remain separate. No database migration was required; active migrations remain 18 and Migration 019 was not created.

## Stage 13G-C3 — League race summary strip

Status: complete in development.

Stage 13G-C3 adds a league race summary strip above ready standings, with you-vs-leader context, leader/current/gap labels, and explicit pre-scoring and empty-member states. Original Predictor and KO Predictor remain separate. Rank movement remains deferred until trustworthy previous-rank data exists. No database migration was required; active migrations remain 18 and Migration 019 was not created.

## Stage 13G-C4 — Compact league standings correction

Status: complete in development.

Stage 13G-C4 corrects the over-dense Stage 13G-C2/C3 league presentation. The default private-league table is now a compact running total: rank, member and points. Groups, bracket, scored-match, gap and race-summary breakdowns belong in deeper destinations such as member comparison, player insight, match centre and results. Original Predictor and KO Predictor remain separate. No database migration was required; active migrations remain 18 and Migration 019 was not created.

## Stage 13G-C5 — League row detail destination

Status: complete in development.

Stage 13G-C5 preserves the compact private-league table introduced by C4. The default table remains rank, member and points. Deeper member comparison, point splits, gap context and privacy/lock copy now open through the member row detail destination below the table. Original Predictor and KO Predictor remain separate. No database migration was required; active migrations remain 18 and Migration 019 was not created.

## Stage 13G-C6 — Compact league page shell

Status: complete in development.

Stage 13G-C6 simplifies the default private-league shell around the compact table. The default view now leads with league selection, competition selection and rank/member/points. League code, lifecycle/privacy copy, summary cards and shared-member notes sit behind details after the table. Original Predictor and KO Predictor remain separate. No database migration was required; active migrations remain 18 and Migration 019 was not created.



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
9. Active migrations remain 18 and no Migration 019 is created.

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
9. Active migrations remain 18 and no Migration 019 is created.

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

This package is documentation and audit only. It adds no UI build, no route implementation, no scoring change, no resolver change, no Supabase write, no database policy change and no Migration 019. Active migrations remain 18.

## Stage 13G-REF-2 — Groups and Original Bracket Reference Prototype Adoption

Reference artefacts: `euro28-groups-page-prototype.html` and `euro28-bracket-page-prototype.html`. Scope: no UI build, no route implementation, no scoring change, no resolver change, no Supabase write, no fixture-data implementation, no score-stepper UI implementation.

| Ledger row | Status | Record |
| --- | ---: | --- |
| 13G Groups reference prototype adoption | SCHEDULED | Approved Groups prototype adopted as behavioural, hierarchy and copy spec; rebuild natively and do not port prototype code. |
| S3.1 Joker control | AMENDED / CLOSED | Bare `J` circle retired; joker pill uses star icon, `Joker` label and `2×` when armed; disabled at cap. |
| Groups joker meter | SCHEDULED | Five-dot gold JOKER METER in page controls; same pattern in Groups and KO. |
| S3.3 Groups view switcher | AMENDED / CLOSED | `By group | By date` segmented control; by group while predicting and by date once play begins. |
| 4.2 Predicted tables | AMENDED / CLOSED | Qualification edges and `Calculated live from your predictions.` line. |
| 4.3 Third-place table | AMENDED / CLOSED | Third-place ranking across all six groups under every group table; top four marked bracket-bound. |
| Part 1.3 bracket coherence | AMENDED / CLOSED | Warning-once and FLAG-FOR-RE-PICK; stale picks visibly flagged, never silently kept or dropped. |
| Match card meta line | AMENDED / SCHEDULED | Every card carries date · venue with host-country circle flag · group; values live centrally with fixture data and reuse existing circle-flag assets. |
| Score steppers | AMENDED / SCHEDULED | Desktop-only at ≥640px; clamp 0–15; blank increments from zero; same save/coherence/table flow as typed entry; accessibility resolution required. |
| 13G Original Bracket reference prototype adoption | SCHEDULED | Approved Bracket prototype adopted for stacked mobile and desktop wall-chart layouts. |
| Charter v1.8 wall chart | CONTRACT CHANGE / MOVED INTO 13G | Converging wall chart moves from backlog into 13G scope. |
| Original Bracket control absence | TEST REQUIRED | No score inputs, no method controls and no joker controls anywhere on Original Bracket. |

Active migrations remain 18. No Migration 019.

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

## Stage 13G-BRACKET-REF — Original Bracket Reference Adoption

| Ledger row | Status | Record |
| --- | ---: | --- |
| Stage 13G-BRACKET-REF — Original Bracket reference adopted | ACCEPTED / SPEC SOURCE | `euro28-bracket-page-prototype.html` is the approved behaviour, hierarchy and copy reference for both layouts. |
| Charter v1.8 converging wall chart | CONTRACT CHANGE | Wall-chart layout moves from backlog into Stage 13G Original Bracket scope; this is a visible contract change. |
| Original Bracket responsive split | ACCEPTED / SCHEDULED | `<900px` stacked layout; `≥900px` converging wall chart. |
| Original Bracket slot anatomy | ACCEPTED / SCHEDULED | Source code visible, resolved slots tappable, picked success/tick, unresolved dashed placeholders. |
| Original Bracket pick mechanics | ACCEPTED / TEST REQUIRED | Tap-to-advance winner-only; selective downstream clearing; surviving picks persist. |
| Re-pick presentation | ACCEPTED / TEST REQUIRED | `Re-pick — your tables changed this tie` amber/partial treatment. |
| Champion and context copy | ACCEPTED / COPY LOCKED | Champion strip/box plus approved KO sub-line `Winner picks only — scores and jokers live in the KO Predictor` and predicted-context banner `Your predicted bracket — built from your predicted tables, never blended with live results`. |
| Original Bracket controls absence | ACCEPTED / AUDIT REQUIRED | No score inputs, method controls or joker controls. |
| Connector lines | SIGNED OFF / WITHOUT LINES | First implementation ships without connector lines. |
| Share-card rendering | SIGNED OFF / FOLLOW-ON | Dedicated export surface in later batch; not first Bracket implementation. |
| Tablet band | SIGNED OFF / SINGLE BREAKPOINT | Keep one 900px breakpoint; no silent third layout. |

Active migrations remain 18. Migration 019 is not created.


## Stage 13G-BRACKET-1 — Original Bracket Responsive Wall-Chart Rebuild

| Row | Status | Record |
| --- | ---: | --- |
| Stage 13G-BRACKET-1 — Original Bracket responsive stacked/wall-chart rebuild | IMPLEMENTED / LOCAL ACCEPTANCE REQUIRED | Rebuilds the Original Bracket with stacked vertical layout below 900px and converging wall chart at 900px and above, using shared `OriginalBracketTie` and `OriginalBracketSlot` primitives. |
| Original Bracket source-code slot anatomy | IMPLEMENTED / TESTED | Slots show source references including `1A`, `2B`, `3ABCD` and match-winner `W39` style references. Resolved slots keep `TeamLabel` identity plus separate progression action; unresolved slots are dashed placeholders. |
| Original Bracket re-pick treatment | IMPLEMENTED / TESTED | Stale stored picks render amber treatment with exact flag `Re-pick — your tables changed this tie`; bracket-pick changes prune only downstream picks no longer fed. |
| Original Bracket control absence | IMPLEMENTED / AUDITED | Original Bracket remains winner-only with no score inputs, method controls or joker controls. Active migrations remain 18 and no Migration 019 is created. |

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
10. Active migrations remain 18 and no Migration 019 is created.

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
13. Active migrations remain 18 and no Migration 019 is created.

Next sequenced package: a default-off write-capable skeleton only after explicit approval.


## Product completeness register alignment

Status: complete in development as a docs/audit-only decision-alignment package.

This slice records Euro 2028 scale gates before wider registration and before matchday one. It adds `docs/PRODUCT-COMPLETENESS-ROADMAP.md`, adds `docs/STAGE-PRODUCT-COMPLETENESS-REGISTER-ALIGNMENT.md`, and wires a product-completeness audit into the local gate chain.

Confirmed decisions:

1. RULES-1 is a signup gate and must include scoring, tie-breaks, correction policy, support contact, privacy note and deletion path.
2. Display-name and league-name moderation is a signup gate with admin rename power, blocked-word checks and published policy wording.
3. A scalable support channel is a signup gate; the exact channel/address remains an owner decision before RULES-1 closes.
4. Capacity planning is a signup gate; the planning range is 650–1,300 users and the exact number/tier/auth-email budget remains an owner decision before wide signups.
5. Email confirmation is a signup-gate decision; recommendation is ON, but the owner must record ON/OFF before wide signups.
6. Privacy note and deletion path are signup gates; Supabase data region must be confirmed before publication.
7. Tie-break ladders, load reality-check and uptime/error monitoring are tournament gates before the first Euro 2028 match.
8. Offline player lifecycle, unknown-route fallback and growth mechanics remain scheduled follow-ons.
9. This package has no database writes, no user creation and no prediction seeding.
10. Original Predictor and KO Predictor remain separate; no combined totals or blended standings are approved.
11. Active migrations remain 18 and no Migration 019 is created.

Next sequenced package: RULES-1 or a narrow owner-decision register update for support channel, capacity and email confirmation.
