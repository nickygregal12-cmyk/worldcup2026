# Local Scenario Runner — Runbook

How to stand up a fully-populated Euro 2028 world on your machine: synthetic players
with predictions and points, matches that are finished or in progress, populated
leagues and leaderboards, and a clock you can move to any instant in the tournament.

Everything here targets the **local Docker Supabase stack only**. It never touches
Euro staging (`gcfdwobpnanjchcnvdco`) or WC26 production (`ouhxawizadnwrhrjppld`); the
context guard refuses to run if it detects either.

---

## 1. What this is, and what it is not

There are two separate time mechanisms in this repo. They are easy to confuse.

| | Admin "Time & Phase simulator" | Scenario runner (this document) |
|---|---|---|
| Where | Admin Control Room, in the app | Terminal |
| What it changes | Only what the app thinks "now" is | Actual match rows, scores, points, leagues |
| Produces live scores | No | Yes |
| Runs the scoring engine | No | Yes |
| Target | Staging (owner-only) | Local Docker only |

The admin panel changes *perceived time* and nothing else — the migration says so
explicitly: *"It does not mutate fixtures, results, locks or scoring data."* If you
move the admin clock past a kickoff, the match does not become live, because no
result row ever changes.

The scenario runner is the one that materialises data. On every `set-time T` it derives
each match's state from T (`scheduled` / `live` / `final`), writes real scores through
the production `private.euro28_record_match_result` function, resolves knockout slots
through the real resolver, and re-runs `private.euro28_recalculate_points`. It also sets
the same `tournament_time_controls` row the admin panel uses, so the app clock follows.

It is idempotent and bidirectional: you can jump forwards, backwards, or re-run the same
instant, and the world recomputes from scratch each time.

Source: `scripts/stage16a-p6c-executor.mjs`.

---

## 2. Prerequisites

1. **Local Supabase stack running.** `npx supabase start`, then confirm with
   `npx supabase status`. The database container must be `supabase_db_euro28predictor`
   (override with `STAGE16A_LOCAL_DB_CONTAINER` if yours differs).
2. **Branch must be `euro28-development`.** The guard refuses `main` and `master`
   outright, and refuses any branch that is not `euro28-development`.
3. **A backup.** Seeding and clock changes refuse to run without a checksum-verified
   backup less than 6 hours old. Step 4 below creates one.

---

## 3. Environment

The context guard is fail-closed: all four variables must be present, and two must match
exactly. Paste this into your shell (one session; they are not persisted).

```bash
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY="$(npx supabase status -o json | python3 -c 'import json,sys; print(json.load(sys.stdin)["SERVICE_ROLE_KEY"])')"
export STAGE16A_ALLOW_STAGING_SEED_WRITE=true
export STAGE16A_SEED_TEARDOWN_CONFIRMATION=I_UNDERSTAND_STAGE16A_SYNTHETIC_TEARDOWN_ONLY
export STAGE16A_TARGET=local
export EURO28_BACKUP_ROOT="$HOME/euro28-backups"
mkdir -p "$EURO28_BACKUP_ROOT"
```

Notes:

- `STAGE16A_ALLOW_STAGING_SEED_WRITE` must be the exact string `true`.
- `STAGE16A_SEED_TEARDOWN_CONFIRMATION` must be that exact phrase.
- `EURO28_BACKUP_ROOT` must be **outside the git repo** — the backup script refuses to
  write inside it.
- Optional escape hatches: `STAGE16A_BACKUP_MAX_AGE_MIN` (default 360),
  `STAGE16A_SKIP_BACKUP_PRECONDITION=i-accept-the-risk` (do not).

---

## 4. The commands

```bash
npm run stage16a:p6c:backup                          # required first; writes a verified dump
npm run stage16a:p6c:seed                            # 19 players, predictions, 3 leagues
npm run scenario:set-time -- 2028-06-14T20:00:00Z    # move the clock; derives all match state
npm run scenario:verify                              # row counts and point totals
npm run scenario:reset-now                           # back to real time; unwinds match state
npm run scenario:teardown                            # remove all synthetic data
```

The `--` before the timestamp is required; npm needs it to pass the argument through.

`set-time` prints what it did:

```json
{ "clock": { "T": "2028-06-14T20:00:00.000Z",
             "scheduled": 21, "live": 1, "final": 14, "writes": 15 },
  "counts": { "users": 19, "total_points_original": 2500, "confirmed_results": 14 } }
```

### Useful instants

| Instant | What you get |
|---|---|
| `2028-06-09T18:00:00Z` | Pre-lock. Predictions still open, nothing played. |
| `2028-06-09T19:30:00Z` | Opening match in progress. Nothing scored yet. |
| `2028-06-14T20:00:00Z` | Mid-group. 14 played, 1 live, populated leaderboard. |
| `2028-06-21T22:00:00Z` | Group stage complete. All 36 played, KO slots resolved. |
| `2028-07-09T22:00:00Z` | Tournament complete. |

Any ISO instant works; those are just convenient ones. The thirteen named presets used by
the admin panel live in `src/timePhase/timePhaseModel.js`.

---

## 5. Pointing the app at it

The runner writes to **local Docker**. By default `.env.local` points at **remote
staging**, so if you skip this step you will seed a world and see none of it.

`.env.local` needs three things:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<ANON_KEY from: npx supabase status>

# Both are required before the app will apply a simulated clock
# (canApplyStagingTime, src/timePhase/timePhaseModel.js).
VITE_APP_ENV=staging
VITE_ENABLE_TIME_TRAVEL=true
```

`VITE_APP_ENV=staging` is correct even though the database is local — it is the string the
time-travel gate checks, not a deployment target.

Restart `npm run dev` afterwards. Vite only reads env at boot.

### If you are working in a Codespace

`127.0.0.1:54321` will not work. Your browser resolves it to your own laptop, where
nothing is listening, and the app fails with `Tournament read failed: TypeError: Failed
to fetch`. The Supabase port is not forwarded, and forwarding it would mean exposing it
publicly.

Instead, route Supabase through the Vite dev server, which is already forwarded. The
proxy is committed in `vite.config.js` (dev-server only, inert unless pointed at). Set:

```bash
VITE_SUPABASE_URL=https://<your-codespace-name>-5173.app.github.dev/local-supabase
```

Same-origin, nothing exposed. Get your Codespace name from `echo $CODESPACE_NAME`.

### Going back to staging

Restore the remote `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env.local` (they
are kept as comments in that file) and restart the dev server. `.env.local` is gitignored,
so none of this travels.

---

## 6. Logging in

Every seeded persona shares one password:

```
password:  synthetic-not-a-real-login
email:     <persona-key>@synthetic.euro28.test
```

Defined as `STAGE16A_SYNTHETIC_PASSWORD` in `scripts/stage16a-p6c-executor.mjs`.

Your own staging account will **not** work here. It lives in the staging database; this is
a different database, in which you have no account.

### The 19 personas

Points shown are for the `2028-06-14T20:00:00Z` scenario above and change with the clock.

| Persona key | Competitions | Pts | What it is for |
|---|---|---|---|
| `submitted_complete` | Original + KO | 420 | Complete submitted Original plus KO evidence. **Best all-round logged-in view.** |
| `exact_score_heavy` | Original + KO | 420 | Many exact group scores; mixed bracket survival. |
| `joker_cap_reached` | Original + KO | 190 | Exactly five group jokers and five KO jokers. |
| `all_wrong` | Original + KO | 150 | Negative control for zero/near-zero scoring paths. |
| `outcome_only` | Original + KO | 140 | Correct outcomes without exact-score precision. |
| `zero_jokers` | Original + KO | 140 | Complete picks, no jokers. |
| `engineered_tie_a` | Original + KO | 140 | Controlled tie-break comparison (pair with B). |
| `engineered_tie_b` | Original + KO | 140 | Controlled tie-break comparison (pair with A). |
| `correction_sensitive` | Original + KO | 140 | Designed to move after a result correction. |
| `unsubmitted_identical` | Original | 140 | Same picks as a submitted user, but not submitted. |
| `original_only` | Original | 140 | Original-only account. |
| `bracket_survives_deep` | Original | 140 | Bracket keeps late-round live value. |
| `bracket_dead_early` | Original | 140 | Bracket loses live value early. |
| `partial_predictions` | Original | 60 | Incomplete bundle — progress and privacy states. |
| `no_predictions` | none | 0 | Signed in, nothing predicted. **Empty states.** |
| `ko_only` | KO | 0 | KO Predictor-only account. |
| `ko_advancing_only` | KO | 0 | KO advancing-team evidence, no method precision. |
| `ko_method_variant` | KO | 0 | KO method evidence for 90/ET/pens checks. |
| `ko_joker_variant` | KO | 0 | KO joker placement variant. |

The KO-only personas score 0 until the clock passes the end of the group stage, since the
KO Predictor has nothing to score before then.

All 19 are members of 3 seeded leagues, so league tables and leaderboards are populated.

---

## 7. Known limitations

**A live match has no scoreline.** By design, `live` means kicked off with `home_score_90`
and `away_score_90` still NULL. Scores only materialise at full time. There is no ticking
in-play score to look at; a live match renders as in-progress with no numbers. If you need
an evolving scoreline, that feature does not exist yet.

**Local `kickoff_at` is NULL for all 51 matches.** The runner therefore falls back to
derived 13:00 / 16:00 / 19:00 UTC slots cycling by match number, so local kick-off times do
**not** match the real fixture list — Match 1 is not at the true Wales v Germany 19:00
kickoff. Staging holds the correct 51/51 kickoffs. `scripts/assign-kickoff-times.mjs` will
populate them locally, but it has not been run against local.

**No regression test guards the seeded logins.** `seedUsers()` shells SQL directly into
Docker, so it is not unit-testable without extracting the SQL into a pure builder. The
23 tests in `scripts/__tests__/stage16aP6cExecutor.test.js` cover the pure clock functions
only.

---

## 8. Safety

- The context guard refuses: any branch other than `euro28-development`; any
  `SUPABASE_URL` that is not localhost when `STAGE16A_TARGET=local`; WC26 production
  unconditionally; and missing or wrong write flags.
- Seeding, clock changes and teardown all refuse without a fresh verified backup.
- All synthetic data carries dual markers: the reserved email domain
  `synthetic.euro28.test` and a `synthetic_euro28` metadata flag. Teardown deletes only
  dual-marker rows, then asserts zero residue across eight tables.
- Run `npm run scenario:teardown` when you are finished. It is exact and verified — it
  will not leave orphans behind.
