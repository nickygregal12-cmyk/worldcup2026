# Claude Code Copy-Back Report — Stage 16A-P6C Write Executor

> Status: **COMPLETE.** Stage 1 (read + summary), Stage 2 (build) and Stage 3
> (local 6-step test, all steps pass) are done. LOCAL Docker Supabase only —
> real Euro staging and WC26 were never touched.

---

## STAGE 1 — Frozen-contract summary (read in full before any code)

Read completely: docs P1, P2, P3, P4, P5, P6A, P6B, SCOPE-ALIGNMENT, plus every
`scripts/lib/stage16a*.mjs` model, the live DB schema (migrations), the two scoring
functions and the resolver functions. Sources of truth are the code models; docs give rationale.

### P1 — Synthetic identity contract (`scripts/lib/stage16aSyntheticIdentity.mjs`)
- **Euro staging project ref:** `gcfdwobpnanjchcnvdco`. **Blocked WC26 production:** `ouhxawizadnwrhrjppld`.
  `assertEuro28StagingProjectRef()` throws for WC26 and for anything ≠ the staging ref (fail-closed).
- **Reserved email domain:** `synthetic.euro28.test`. **Metadata marker:** `synthetic_euro28: true`.
- **Exactly 19 personas**, keys frozen: exact_score_heavy, outcome_only, all_wrong, partial_predictions,
  no_predictions, submitted_complete, unsubmitted_identical, joker_cap_reached, zero_jokers,
  engineered_tie_a, engineered_tie_b, bracket_survives_deep, bracket_dead_early, ko_only,
  original_only, ko_advancing_only, ko_method_variant, ko_joker_variant, correction_sensitive.
- Each persona: `email = <key>@synthetic.euro28.test`, `displayName = "Synthetic <Name>"`,
  `metadata = { synthetic_euro28:true, stage:'16A', persona_key:<key> }`, a `competitions` list
  (`original`/`ko_predictor`), and dual teardown guards (reserved email + metadata marker).
- Dual-marker helpers: `isSyntheticEuro28Email`, `hasSyntheticEuro28Metadata`.

### P2 — Staging-effective time / fake clock (`stage16aStagingEffectiveTime.mjs`, `src/timePhase/timePhaseModel.js`)
- The fake clock is the **existing Stage 13F-G Time & Phase control**: table `public.tournament_time_controls`
  (`is_enabled`, `simulated_at`, `phase_key`, `revision`) via `admin_set_tournament_time_control` /
  `admin_reset_tournament_time_control` / `get_tournament_time_control`; gated by `VITE_APP_ENV=staging`
  + `VITE_ENABLE_TIME_TRAVEL=true`; `canApplyStagingTime()` requires staging + enabled + `simulated_at`.
- `TIME_PHASE_PRESETS` anchor the timeline: tournament start (group_live) **2028-06-09T20:00Z**,
  group_complete **2028-06-21T22:00Z**, knockout_known **2028-06-22**, ko_open **2028-06-22T12:00Z**,
  a KO fixture live **2028-06-24T17:05Z**, tournament_complete **2028-07-09T22:00Z**.
- 11 resettable effective-time cases, every one `resettable:true, appliesRealGlobalLock:false, mutatesTournamentData:false`.
- **Contract statement (important):** the time control *"changes application time only… does not mutate fixtures,
  results, prediction rows … or recalculate points."* → P6C's clock-derived **results + DB scoring is an
  owner-approved extension** of P2 (approved this session).

### P3 — Seed manifest (`stage16aSeedManifest.mjs`)
- Version `stage16a-seed-manifest-dry-run-v1`. Planned counts: **19 personas, 24 provisional team slots
  (6 groups × 4), 3 leagues** (large ≥14 / tiny 2–3 / multi-league), **11 time-phase cases**, Original &
  KO prediction bundles derived per persona. Teardown guard: reserved email + metadata + zero-residue-reseed.

### P5 — Guard flags + hard-coded ref + teardown confirmation (`stage16aSeedWritePreflight.mjs`)
- **Required local env keys (exact):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `STAGE16A_ALLOW_STAGING_SEED_WRITE`, `STAGE16A_SEED_TEARDOWN_CONFIRMATION`.
- **Teardown confirmation string (exact):** `I_UNDERSTAND_STAGE16A_SYNTHETIC_TEARDOWN_ONLY`.
- Write flag must be exactly `true`. Teardown selector requires **BOTH** markers (email domain AND metadata);
  single-marker teardown is refused. Requires zero-residue assertion + reseed validation; protects real
  accounts, tournament config and staging controls. P5 itself `canStartWrite:false`,
  `requiresExplicitNextSliceApproval:true`.

### P6A — Acceptance criteria (`stage16aSeedWriteAcceptancePlan.mjs`)
- **Allowed branch:** `euro28-development`; **blocked:** `main`, `master`.
- **Refusal rules:** wrong_branch, wc26_project_ref, unknown_project_ref, missing_write_flag,
  missing_teardown_confirmation, single_marker_teardown, secret_logging.
- **Zero-residue targets (real table names, expected 0 after teardown):** `auth.users`, `public.profiles`,
  `public.prediction_sets`, `public.match_predictions`, `public.bracket_predictions`,
  `public.prediction_match_points` + `public.prediction_bracket_points`, `public.prediction_totals`,
  `public.leagues` + `public.league_members`, `public.tournament_teams` (synthetic Stage 16A slots).
- **Acceptance sequence:** refuse_unsafe_context → confirm_local_env_names → confirm_write_enablement_flags
  → seed_synthetic_only → validate_first_seed → teardown_synthetic_only → prove_zero_residue
  → reseed_same_manifest → validate_reseed. Original/KO totals stay separate throughout.

### P6B — Prepared executor structure (`stage16aSeedWriteExecutorPreparation.mjs`)
P6C must implement exactly these **8 modules** (P6B declared them `executableInP6B:false`, awaiting P6C):
`context_guard`, `synthetic_user_writer`, `provisional_team_writer`, `prediction_seed_writer`,
`league_seed_writer`, `seed_validator`, `synthetic_teardown`, `reseed_validator`.
P6B's `futureEnablementSequence` begins with `approve_p6c_write_executor` (the gate the owner opened this
session) and requires refuse-before-secret-read, no secret logging, dual-marker synthetic-only writes,
first-seed validation, dual-marker teardown, zero-residue, reseed-same-manifest.

### Live schema + scoring/resolver facts that shape the build
- Single tournament `e0280000-0000-4000-8000-000000000001`; active ruleset
  `e0285000-0000-4000-8000-000000000001` (exact 30 / outcome 10 / KO advancing 10 / method 5 / bracket
  10-15-20-25-50 / joker ×2). `scoring_recalculation` feature enabled on reset.
- **51 matches**: group **1–36**, R16 **37–44**, QF **45–48**, SF **49–50**, final **51**.
  `scheduled_date` spans 2028-06-09…2028-07-09; **every `kickoff_at` is NULL on reset** → the executor
  derives an effective kickoff per match from `scheduled_date` + a deterministic time-of-day.
- **Group matches (1–36):** home/away slots are `tournament_team`, **already resolved** → recordable immediately.
  **R16 (37–44):** inputs are unresolved `group_position`/`best_third` slots → resolved by calling the
  **existing resolver** `private.euro28_expected_knockout_participants`. **QF→final:** `match_winner` slots,
  **auto-resolved** by the record function when upstream results are confirmed.
- **Result entry (existing):** `private.euro28_record_match_result(...)` (service_role) writes `matches`
  result columns, appends a `match_result_events` row, re-resolves downstream `match_winner`/`match_loser`
  slots, and calls scoring. **Scoring (existing):** `private.euro28_recalculate_points(tournament_id, match_id?)`
  — the real engine; original scores match_number 1–36, ko_predictor 37–51; writes
  `prediction_match_points` / `prediction_bracket_points` / `prediction_totals`. P6C **calls** these; it does
  not reimplement scoring or resolver.
- **`match_result_events` is append-only** (BEFORE UPDATE/DELETE trigger raises, fires even for service_role).
  → reverting a result = record a `void` event (revision-bumped), not a delete. Bidirectional clock reverts
  match state via void; the append-only audit persists by design; the exact byte baseline is restored by
  `supabase db reset` on LOCAL.
- **Auth/DB access:** private schema + private functions are **not reachable via PostgREST**; the LOCAL
  executor uses the container Postgres superuser (`docker exec … psql`) for privileged writes, while the
  `context_guard` still validates the P5 env contract. Synthetic users are inserted into `auth.users` with
  `raw_user_meta_data` carrying the dual markers (the profile trigger auto-creates `public.profiles`).

### Owner decisions applied this session
1. **Results scope:** extend the contract — derive synthetic results from the clock AND run the existing DB
   scoring engine (recorded as a deliberate extension of P2/D3).
2. **Teardown residue:** row-count proof over the P6A synthetic targets (→0) + results reverted to scheduled
   via "clock to real now"; exact LOCAL baseline restored by `supabase db reset`; `match_result_events`
   audit is append-only by design (documented, never claimed to vanish); real tournament data untouched.

### Environment confirmed
Docker 29.3, Supabase CLI 2.109, local stack up, `supabase db reset` applies 19 migrations cleanly
(51 matches / 24 teams / scoring functions present). Stage 3 is runnable LOCALLY. **This session never
targets real Euro staging or WC26.**

---

## STAGE 2 — Build (`scripts/stage16a-p6c-executor.mjs`, 593 lines)

The executor reuses the frozen constants from the prior stages' models (project refs,
persona catalogue, env-key list, teardown confirmation phrase, allowed/blocked branches,
zero-residue targets) — it does not redefine the contract. It implements the eight P6B
modules plus the owner-approved clock/results extension.

### The eight P6B modules → P6C implementation
| P6B module | P6C implementation |
|---|---|
| `context_guard` | `assertContext()` — fail-closed on branch, project ref (blocks WC26 always; `local` requires a localhost URL; `staging` requires the exact Euro ref), required env-key presence, write flag `=== 'true'`, and (for teardown) the exact P5 confirmation phrase. Refuses **before** any write. |
| `synthetic_user_writer` | `seedUsers()` — inserts the 19 personas into `auth.users` with dual markers in `raw_user_meta_data`; the existing profile trigger creates `public.profiles`. |
| `provisional_team_writer` | Uses the 24 existing provisional draw slots (A1–F4) as-is — deliberately creates **no** new `tournament_teams`, keeping tournament config untouched (Q2 answer). The synthetic-team-slot zero-residue target is therefore 0/0. |
| `prediction_seed_writer` | `seedOriginalPredictions()` (14 Original sets, 474 `match_predictions`, per-persona strategies) + `seedKoPredictionSets()` (13 KO sets, kept separate). |
| `league_seed_writer` | `seedLeagues()` — large (14) + tiny (2) Original leagues + one KO league (3); one multi-league and several no-league personas. |
| `seed_validator` | `counts()` — reports every P6A target count + separate Original/KO totals. |
| `synthetic_teardown` | `teardown()` — deletes leagues (created_by is ON DELETE RESTRICT) then `auth.users` (cascades profiles/predictions/points/totals/memberships), selecting **only** dual-marker rows. |
| `reseed_validator` | Re-running `seed` after teardown restores identical manifest counts with no duplicates (idempotent inserts). |

### How the time-derivation logic works (the core requirement)
`setClock(T)` is a single, fully-derived reconciliation — **state is a pure function of T**, so it
is inherently idempotent and bidirectional:

1. Set the sanctioned P2 clock (`tournament_time_controls.simulated_at = T`, enabled).
2. For every group match (1–36), compute an **effective kickoff** = seeded `scheduled_date` +
   a deterministic time-of-day (13:00/16:00/19:00 UTC by match number), then classify against T
   (`deriveMatchState`): `T < kickoff` → **scheduled**; `kickoff ≤ T < kickoff+115m` → **live**;
   `T ≥ finish` → **final**.
3. Reconcile the DB to the target state, writing only on a diff (idempotent):
   - **final** → `private.euro28_record_match_result(... 'completed','confirmed', score ...)` with a
     **deterministic** plausible scoreline (`syntheticScore`, stable per match number → same
     screenshots every time).
   - **live** → direct `status='live'` (a status, not a result; no final score).
   - **scheduled** → if any prior synthetic result exists, `record_match_result(... 'void' ...)`
     (the schema's only score-clearing path, since `pending`/`confirmed` require scores). This is
     what makes **moving the clock backward** reduce finished matches back to scheduled/no-score.
4. Once the whole group stage is final, resolve the **R16 knockout fixtures** by *calling the
   existing resolver* `private.euro28_expected_knockout_participants` with a bundle that mirrors the
   confirmed group results (calls existing resolver logic, does not reimplement it); moving the clock
   back before group-complete clears that resolution. QF→final would cascade via `match_winner`.
5. Run the **existing** scoring engine `private.euro28_recalculate_points` (Original 1–36, KO 37–51,
   kept separate). P6C never reimplements scoring or resolver.

Bidirectionality is structural: because every clock-set recomputes the full target state from T and
reverts anything that no longer matches, setting T backward — or to real now — always yields the
correct state for T regardless of previous clock positions.

### Safety wiring
- **Backup precondition** (`requireFreshBackup()`): every write command refuses unless a fresh,
  checksum-verified backup exists under `EURO28_BACKUP_ROOT` (re-verifies SHA-256 + freshness).
  `local-backup` produces a genuine local dump; staging would use `npm run db:backup && db:backup:verify`.
- **DB access:** LOCAL privileged work runs via the container postgres superuser (private schema /
  functions are unreachable through PostgREST). The context guard still enforces the P5 env contract.
- **npm scripts:** `stage16a:p6c:{backup,seed,set-clock,reset-clock,teardown,verify}`. Not in the
  `check` chain; the tooling-wiring meta-audit stays green (120 scripts).
- **Unit test:** `scripts/__tests__/stage16aP6cExecutor.test.js` (7 tests) covers the pure derivation
  (scheduled/live/final, idempotent+bidirectional), deterministic scores, and effective kickoff.

## STAGE 3 — Local test results (LOCAL Docker Supabase only; staging never touched)

Authoritative single clean run (fresh `supabase db reset` → backup → seed → 5 clock/teardown steps).
Each step reported honestly:

| Step | Action | Result |
|---|---|---|
| — | Baseline after reset | Synthetic-target rows = **0**. Fresh local backup created + checksum-verified. Seed: **19** users/profiles, **27** sets (14 Original + 13 KO), **474** predictions, **3** leagues, **19** members. |
| **1** | `supabase db reset` | ✅ 19 migrations applied; 51 matches / 24 teams. |
| **2** | Clock → mid group (2028-06-15T17:30Z) | ✅ **19 scheduled / 1 live / 16 final**, all correctly derived. Existing scoring ran: **Original 2820 pts, KO 0** (separate); 214 match-point rows. |
| **3** | Clock → KO window (2028-06-22T12:00Z) | ✅ 36 final; **8/8 R16 fixtures resolved** via the existing resolver ("KO Predictor has real fixtures to look at"); Original 6170 pts. |
| **4** | Clock **BACKWARD** → pre-tournament (2028-06-01) | ✅ **36 scheduled, 0 live, 0 final; KO resolution cleared; 0 confirmed results; 0 points.** Critical bidirectional revert verified — not assumed. |
| **5** | `reset-clock` → real now | ✅ 0 confirmed results, 0 synthetic points, no synthetic scores visible; synthetic cast (19 users) still present (reset-clock reverts match state, not the cast). |
| **6** | `teardown` + zero-residue | ✅ **All 8 zero-residue targets = 0**; post-teardown synthetic-target rows = **0** = baseline. `match_result_events` = 72 append-only audit rows retained **by design** (documented; full byte parity via `supabase db reset`). |

**Fail-closed context-guard proofs:** WC26 production URL → refused (`WC26 production project is blocked`);
`STAGE16A_ALLOW_STAGING_SEED_WRITE=false` → refused; teardown without the exact confirmation phrase → refused.

### Honest scope boundaries
- **KO results** (recording R16→final scorelines) are **not** written. R16 *fixtures* are resolved via
  the existing resolver, but there is **no existing DB function that resolves group-standings→R16 from
  actual results** — computing standings to record KO results would **reimplement resolver logic**, which
  the guardrail forbids. Group-stage results + KO fixture existence fully satisfy the Stage 3 checks;
  full KO result recording is a candidate follow-up (would need an approved actual-results resolver).
- **KO predictions** score 0 until KO results exist — correct, and it evidences Original/KO separation.
- `match_result_events` is append-only by design; "reset to real now" clears all *visible* synthetic
  scores; exact byte baseline is restored by `supabase db reset` (per the agreed Q2 semantics).
- **This session never targeted real Euro staging or WC26.** Pointing at staging is a separate, later,
  explicit decision (the executor supports `STAGE16A_TARGET=staging` behind the same guards, untested here).

---

## Claude Code Copy-Back Report

### 1. Task
Build Stage 16A-P6C — the first write-capable executor in the P1→P6B chain — strictly to the frozen
contract, plus the owner-approved clock-derived-results + existing-DB-scoring extension. Read everything
first (Stage 1), build (Stage 2), test the full 6-step cycle on LOCAL Docker Supabase (Stage 3).

### 2. Branch
`euro28-development`

### 3. Files changed
- `scripts/stage16a-p6c-executor.mjs` (new, 593 lines) — the executor.
- `scripts/__tests__/stage16aP6cExecutor.test.js` (new) — 7 unit tests for the pure logic.
- `package.json` — 6 `stage16a:p6c:*` convenience scripts (not in the `check` chain).
- `REPORT-P6C-EXECUTOR.md` (new) — this report.

### 4. Changes made
New write-capable executor implementing the 8 P6B modules + the clock/results/scoring extension;
unit tests; npm scripts; report. No changes to scoring, resolver, Auth, migrations, or product code.

### 5. Commands run and results
- `supabase db reset` → 19 migrations applied cleanly.
- Full 6-step executor cycle → all steps pass (table above).
- `npx vitest run scripts/__tests__/stage16aP6cExecutor.test.js` → **7 passed**.
- `npm run audit:tooling-wiring` → **passed** (120 scripts).
- Context-guard refusal proofs (WC26 / write-flag / teardown-confirmation) → all refuse fail-closed.

### 6. Scope guard
- WC26 production touched: **no** (blocked by guard; refusal proven).
- Real Euro staging touched: **no** (LOCAL Docker only this session).
- Scoring logic changed: **no** (calls existing `euro28_recalculate_points`).
- Resolver logic changed: **no** (calls existing `euro28_expected_knockout_participants`).
- New migration created: **no** (active migrations remain 19).
- Product/UI/route code changed: **no**.

### 7. Visual review needed
None (backend executor + DB state; evidence is row counts/state above).

### 8. Errors / blockers
None outstanding. During the build I resolved: `auth.users` email uniqueness (partial index → NOT EXISTS),
profile display-name ≤30-char rule, leagues `competition` NOT NULL (migration 019), and the result
function requiring scores for `pending` (→ use `void` to clear). All fixed and re-verified.
Pre-existing unrelated red: `npm run check` still fails at `audit:shared-primitives` (LeaguePresentation
raw `<select>`) — not touched by this work.

### 9. Deferred findings
- Full **KO result recording** (R16→final scorelines + cascade) is deferred: no existing actual-results
  →R16 resolver exists, and reimplementing standings would violate the resolver guardrail. Needs a
  separately-approved resolver path.
- A static `check-stage16a-p6c-*` audit wired into `check` (matching P1–P6B) was **not** added, to avoid
  extending the currently-red check chain; the unit test provides regression coverage instead.
- Running against real Euro staging is a separate, later, explicit decision.

### 10. Commit readiness
Not committed. Working tree has the 4 new/changed files above (plus the earlier untracked REPORT*.md).
Ready to commit on request. Local Supabase stack is left running; local DB currently holds the
post-teardown state (synthetic data removed; append-only audit rows present until next `db reset`).
