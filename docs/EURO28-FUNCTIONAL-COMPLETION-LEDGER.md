# EURO 2028 PREDICTOR
## Functional Completion Ledger
### Version 1.6 — Stage 13F-B player identity and complete H2H from commit `2e2b9a8`

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
| Match Centre/per-match stats | ❌ MISSING | No live Euro per-match drill-in | 13F-C |
| Bracket Health | ❌ MISSING | No alive/dead path and remaining-points view | 13F-D |
| Extra tournament picks | 🕓 SCHEDULED | Original Predictor feature; final list/values still require approval | 13F-I/17A |
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
| Manual JSON file controls | 🚫 REJECTED | Removed from the live prediction journey; dormant recovery modules remain quarantined for Stage 13F-H cleanup unless separately approved | 13F-H |
| Lucky Dip | ✅ FUNCTIONAL | Groups-only local weighted score generation; fill-empty and confirmed replace-all modes preserve jokers and clear stale bracket picks | — |

## Section C — Admin

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Server result entry/corrections/recalculation | ✅ FUNCTIONAL | Revision-safe and audit-logged | — |
| Admin invisible to non-admins | ❌ MISSING | Universal route and More entry expose the destination | 13F-E |
| Admin UI fit for purpose | ❌ MISSING | One stacked legacy control page; not phone-ready | 13F-F |
| Staging Time & Phase controls | ❌ MISSING | Client clock cannot drive database lock/privacy rules | 13F-G/16 |
| Profile curation | ✅ FUNCTIONAL | Stage 13E owner editing | — |

## Section D — Architecture and enforcement

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Token architecture and raw-colour audit | ✅ FUNCTIONAL | Central semantic tokens and active colour audit | — |
| Charter architecture section | ✅ FUNCTIONAL | Restored in Charter v1.7 and enforced by `audit:architecture` | — |
| File-size/structure audit | ✅ FUNCTIONAL | 31 active JSX files checked; all are within the 400-line hard cap and temporary component caps are empty | — |
| WCAG token contrast audit | ✅ FUNCTIONAL | All 58 registered light/dark token pairs pass; muted text and joker light-theme tokens were minimally corrected and the exception allowlist is empty | — |
| Mount inversion | ❌ MISSING | Development-era root owns the real application | 13F-H |
| Foundation naming retired | ❌ MISSING | Seven active Foundation components plus helpers | 13F-H |
| Visual fixtures isolated | ⚠️ INCOHERENT | Not normally activatable on HTTPS staging, but fixture code/data ship in production bundle | 13F-H/15A |
| WC26 inherited source deleted | 🕓 SCHEDULED | Delete after Playwright coverage; never touch `main` | 15E |
| Netlify Functions hygiene | ⚠️ INCOHERENT | Only health/heartbeat/observability are Euro-active; inherited handlers enter deploy input | 13F-H |

## Section E — Orphaned features

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Per-league locks/snapshots | 🚫 REJECTED | One global lock; delete snapshot function | 13F-H/15E |
| Daily Questions | 🚫 REJECTED | Delete inherited implementation | 15E |
| PWA and push notifications | 🕓 SCHEDULED | Carry only as a coherent, tested Euro-native feature | 18C |
| Offline players | 🕓 SCHEDULED | Carry as managed private-league participants and secure account claim | 16E |
| Odds | 🚫 REJECTED | Reconsider only with separately approved free/licensed provider | 18B gate |
| Weather | 🚫 REJECTED | Not core Match Centre content | — |
| Trustworthy live minute | 🕓 SCHEDULED | UI slot in Match Centre; automatic source only if Stage 18B is approved | 13F-C/18B |

## Section F — Operations

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Backup/restore tooling | ✅ FUNCTIONAL | Rehearse at Stage 19 | — |
| Staging owner access | ✅ FUNCTIONAL | Documented controlled grant | — |
| Health endpoint and heartbeat | ✅ FUNCTIONAL | Stage 14 deployed verification accepted | — |
| Sentry reporting | 🟠 PARTIAL | Integration exists without credentials; activation gate at Stage 16 | 16 |
| Dependency updates | 🟠 PARTIAL | Monthly manual review until default-branch decision after WC26 | OB-1 |
| Hosted simulation project | 🔒 DECISION PENDING | Free tier already occupied; initial Stage 16 is local-only | 16 |

## Change log

- **v1.6:** Stage 13F-B replaces ad hoc player-name buttons with one shared identity primitive, completes aligned league and overall H2H for both competitions, and schedules the presentation-only converging bracket/share-image batch at Stage 13P-A.
- v1.5 — Stage 13F-A records separate KO guest persistence, seamless browser-draft continuation and transfer, progress-aware signup prompts, removal of normal JSON controls and Euro-native Lucky Dip.


- **v1.0:** Independent audit draft.
- **v1.1:** Corrected H2H/player identity to partial, separated guest storage from dormant file tools, corrected guest account-import terminology, recorded three over-cap screens, recorded actual fixture and Netlify deployment state, and added site-wide information architecture/access.
- **v1.2:** Recorded accepted architecture governance, split all three oversized live screens, removed every temporary component cap, and moved contrast automation to partial pending four explicit Batch 3 corrections.
- **v1.3:** Corrected the two affected light-theme tokens, removed all four contrast exceptions, and marked the WCAG token contrast gate functional.
- **v1.4:** Separated Results from Leaderboards, added direct competition-specific Home access, adopted the site-access contract and retained Admin invisibility as a separate unresolved row.
