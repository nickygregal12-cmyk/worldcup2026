> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 2 — Prediction database design and Migration 005

Status: **implemented as the storage-only Migration 005 foundation**

## Active migration

```text
supabase/migrations/202607010005_euro28_prediction_storage.sql
```

Migration 005 creates:

- `scoring_rulesets`;
- `prediction_sets`;
- `match_predictions`;
- `prediction_grace_windows`.

It also adds these tournament-level controls:

- `active_scoring_ruleset_id`;
- `prediction_contract_version`;
- `prediction_locked_at`.

## Scoring rulesets

Point values, joker multiplier and joker caps are held only on a versioned scoring ruleset. The seeded Euro ruleset is provisional and matches the central application config. Its multiplier is currently `2×`; both exact joker caps remain `NULL` until approved.

A ruleset can be edited while provisional. Once locked or retired, a database trigger prevents silent changes. A prediction set pins the ruleset it uses.

## Prediction sets

There is one prediction set per authenticated user and tournament.

- `submitted_at` records reversible personal review mode only.
- It does not create a snapshot or affect scoring eligibility.
- `revision` is reserved for the later optimistic atomic bundle save route.
- Saved but unsubmitted rows remain equivalent at the tournament lock.

## Match predictions

A stored row contains:

- predicted home and away tournament-team identities;
- the 90-minute score;
- separate knockout advancing team and decision method fields;
- `joker_applied`.

The database shape ensures that an advancing team is one of the two predicted participants. Normal-time decisions require a non-draw score; extra-time and penalty decisions require a draw after 90 minutes.

The migration stores joker allocation but does not create the trusted write route. The future server operation must enforce central caps and the target match kick-off.

## Grace windows

A grace record is scoped to one user and one match. It stores the grantor, grant time, expiry, reason and optional revocation audit. It never changes the global tournament lock. The future trusted write route must also confirm that the match is still unstarted.

## Lock model

- `prediction_lock_at` remains the scheduled opening-match lock.
- `prediction_locked_at` is the persisted global content lock.
- Once `prediction_locked_at` is set, a trigger prevents it being moved or cleared.
- Joker movement is separately judged against each match kick-off.
- Grace is separately judged against one user, one match and its expiry.

## Security

RLS is enabled on all four new tables.

- Anonymous users cannot read prediction or grace data.
- An authenticated owner can read their own prediction set before lock.
- Authenticated prediction reads can be revealed after the tournament lock.
- Published, non-retired scoring configuration is readable for guest rules displays.
- No `anon` or `authenticated` insert, update or delete grants or policies exist.
- Service-role access remains available for later reviewed server operations.

## Deliberate exclusions

Migration 005 does not create:

- the final atomic save RPC or server route;
- guest server storage;
- auth or profile UI;
- leagues;
- scoring runs or point totals;
- admin result entry;
- result-provider integration.

## Verification

Static implementation checks run inside:

```bash
npm run check
```

After a local reset, run the database checks with:

```bash
npx supabase test db --local supabase/tests/database/005_prediction_storage.test.sql
```

After the migration is pushed to the verified Euro staging project, run the same checks remotely:

```bash
npx supabase test db --linked supabase/tests/database/005_prediction_storage.test.sql
```
