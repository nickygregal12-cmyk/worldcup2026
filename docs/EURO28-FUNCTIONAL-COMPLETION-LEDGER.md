# EURO 2028 PREDICTOR
## Functional Completion Ledger
### Version 1.2 — reconciled for Stage 14B Batch 2 from commit `66adb1f`

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
| Private leagues | ✅ FUNCTIONAL | Both standings exist; controller reduced to 399 lines with presentation extracted and unchanged | — |
| Results and leaderboards data | ✅ FUNCTIONAL | Both complete overall tables are returned and rendered for signed-in users | — |
| Results and leaderboards access | 🟠 PARTIAL | Reachable at `#/results`; desktop top nav, mobile More. Leaderboards are buried below results/live tables with no dedicated destination or deep link | 13F-0 |
| Site-wide information architecture | 🟠 PARTIAL | No authoritative route-to-feature access map; combined screens hide major journeys and role-aware access is incomplete | 13F-0 |
| Team Profile Sheet | ✅ FUNCTIONAL | Accepted in Stage 13E | — |
| Head-to-head comparison | 🟠 PARTIAL | Secure league comparison exists; overall and match-aligned presentation are incomplete | 13F-B |
| Tappable player identity | 🟠 PARTIAL | Some names are clickable; no shared player primitive or universal behaviour | 13F-B |
| Match Centre/per-match stats | ❌ MISSING | No live Euro per-match drill-in | 13F-C |
| Bracket Health | ❌ MISSING | No alive/dead path and remaining-points view | 13F-D |
| Extra tournament picks | 🕓 SCHEDULED | Original Predictor feature; final list/values still require approval | 13F-I/17A |
| Share Card | 🕓 SCHEDULED | Reconsider only after final design and location are approved | Post-design |

## Section B — Guest mode

Intended model: guests use Groups, Original Bracket and KO Predictor when open; predictions persist automatically in the same browser; an account is required for points and leagues; sign-up offers safe one-tap transfer.

| Item | Status | Evidence / notes | Owner |
|---|---|---|---|
| Guest resolver | ✅ FUNCTIONAL | Same canonical slot-reference resolver | — |
| Guest Groups/Original browser persistence | ✅ FUNCTIONAL | Local browser storage exists and survives signup on the same browser/domain | — |
| Guest KO access and persistence | 🕓 SCHEDULED | Intended and must be verified end to end | 13F-A |
| Guest-to-account transfer | 🟠 PARTIAL | Service logic exists; live journey is incomplete and copy is misleading | 13F-A |
| Signup encouragement | ❌ MISSING | No designed conversion journey | 13F-A |
| Manual JSON file controls | ⚠️ INCOHERENT | Development-era recovery UX conflicts with seamless conversion; remove from normal journey | 13F-A |
| Lucky Dip | 🕓 SCHEDULED | Euro-native Groups-only implementation; no odds dependency | 13F-A |

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
| WCAG token contrast audit | 🟠 PARTIAL | 58 light/dark token pairs are automated; four exact light-theme exceptions remain for Batch 3 | 14B Batch 3 |
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

- **v1.0:** Independent audit draft.
- **v1.1:** Corrected H2H/player identity to partial, separated guest storage from dormant file tools, corrected guest account-import terminology, recorded three over-cap screens, recorded actual fixture and Netlify deployment state, and added site-wide information architecture/access.
- **v1.2:** Recorded accepted architecture governance, split all three oversized live screens, removed every temporary component cap, and moved contrast automation to partial pending four explicit Batch 3 corrections.
