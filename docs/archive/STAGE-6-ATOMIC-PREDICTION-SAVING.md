> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage 6 — Atomic prediction saving

## Status

Implemented in Migration 009 and the active Euro foundation. The batch adds the trusted prediction write path required by the later editor without introducing scoring, leagues, result entry or admin controls.

## Migration

`202607010009_euro28_atomic_prediction_save.sql`

## Trusted write route

The only prediction write route is:

```text
public.save_my_prediction_bundle(
  p_tournament_id uuid,
  p_expected_revision bigint,
  p_submitted boolean,
  p_predictions jsonb,
  p_source text
)
```

Execution is granted to `authenticated` only. Anonymous users cannot call it. Browser roles still have no direct prediction-table write grants or policies.

## Transaction model

Every successful request:

1. identifies the caller with `auth.uid()`;
2. locks the tournament row;
3. locks or creates the caller's one prediction set;
4. verifies the expected revision;
5. validates the entire supplied bundle;
6. deletes omitted rows and upserts supplied rows within the same transaction;
7. increments the prediction-set revision once;
8. returns the new revision, review state, guest-import state and saved row count.

A failed validation changes nothing.

## Validation model

The server verifies:

- Euro 2028 tournament identity;
- configured global lock;
- active scoring ruleset;
- maximum 51 rows and no duplicates;
- complete participants and 90-minute scores;
- tournament ownership of every match and team;
- group and knockout field semantics;
- official group fixture participants;
- all 36 group rows before any knockout row;
- the canonical participants for every supplied knockout match;
- configured joker caps and cap totals;
- complete 51-row bundles for submitted review mode;
- complete pre-lock bundles for guest import.

## Lock model

Prediction content changes are blocked after the global lock unless one active grace row applies to the caller and changed match. Grace also ends at expiry or match kick-off.

Joker changes are checked separately. A joker may still move on an unstarted match after global content lock, but cannot be added, removed or moved once its match starts.

Review mode cannot change after global lock.

## Guest import

The signed-in user must press the explicit import button. Import requires:

- a complete valid 51-match browser draft;
- pre-lock timing;
- expected revision zero or the current empty set revision;
- no existing account prediction rows.

The browser draft is retained after import. Signing in never uploads it automatically.

## Browser modules

- `src/predictions/predictionSaveConfig.js`
- `src/predictions/predictionSaveBundle.js`
- `src/predictions/predictionSaveService.js`
- `src/predictions/PredictionSaveFoundation.jsx`

The service uses the RPC for writes. Table access is read-only and filters prediction sets by both tournament and signed-in user.

## Verification

```bash
npm run audit:prediction-save
npm run check
npx supabase db reset
npm run test:db:005:local
npm run test:db:006:local
npm run test:db:008:local
npm run test:db:009:local
```

Migration 009 has 54 pgTAP checks. The JavaScript suite has 155 tests.

## Deliberately excluded

- prediction editor screens;
- automatic autosave UI;
- scoring and recalculation;
- result entry;
- league and leaderboard features;
- admin grant/revoke controls for grace;
- final joker-cap decisions.

These exclusions prevent Stage 6 from becoming a half-built product journey. Stage 7 will connect the editor to this route.
