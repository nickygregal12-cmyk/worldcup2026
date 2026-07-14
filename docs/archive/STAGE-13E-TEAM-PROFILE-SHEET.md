# Euro 2028 Predictor — Stage 13E Team Profile Sheet

## Status

Stage 13E adds a reusable team information sheet to the Euro application. It is deliberately opened from the shared team identity rather than introduced as another navigation destination.

Starting checkpoint:

- branch: `euro28-development`;
- latest accepted subject: `Harden Euro Stage 13D signed-in journeys`;
- migrations before this stage: `14`;
- permitted staging project: `gcfdwobpnanjchcnvdco`.

Stage 13E adds Migration 015 because the existing schema did not contain centrally managed tournament-team editorial content or a server-authorised aggregate boundary. No result, scoring, joker or competition rule changes are included.

## Product behaviour

Selecting a resolved team flag or name inside the shared `TeamLabel` opens a responsive bottom sheet. The main navigation is unchanged.

The activation boundary is intentionally narrow:

- resolved team identity: opens the sheet;
- unresolved or TBC identity: does not open the sheet;
- score inputs: remain independent controls;
- joker controls: remain independent controls;
- prediction cards and surrounding surfaces: do not open the sheet.

`TeamLabel` is the single reusable trigger across Groups, Bracket, KO Predictor, results, tables and league comparison surfaces. The sheet disables its own nested team label trigger to avoid recursive opening.

## Three approved data sources

### 1. Curated team facts

Migration 015 creates `public.tournament_team_profiles` for:

- ranking;
- qualifying route;
- best EURO finish;
- a short editorial note;
- revision and update metadata.

Browser roles receive no direct table access. Results administrators may inspect this information through a protected RPC, while only the tournament owner may create or update it. Every edit uses optimistic revision checking and creates an append-only `team_profile_updated` admin event.

This content is tournament-specific and is not hardcoded into React components. Provisional content must remain visibly labelled until the official field is confirmed.

### 2. App-owned tournament state

The sheet reuses the canonical result snapshot and live resolver already used by Stage 13D. It can show:

- current group position;
- played, points and goal difference;
- canonical live and completed results;
- the next currently resolved fixture;
- an honest provisional tie-break notice where applicable.

It does not fetch recent form, club data, player data or external football statistics.

### 3. Original Predictor outlook

`get_team_profile_sheet` returns the viewing user’s own Original Predictor milestone choices when signed in. Community percentages are calculated only from complete 15-pick Original brackets.

The aggregate milestones are:

- predicted group winner;
- reach Round of 16;
- reach quarter-finals;
- reach semi-finals;
- reach final;
- win EURO 2028.

The KO Predictor is not included and no Original/KO points are combined.

## Privacy boundary

Community prediction aggregates are gated by the persisted global Original Predictor lock:

```text
prediction_locked_at is not null
and prediction_locked_at <= clock_timestamp()
```

Before that boundary:

- `aggregates_visible` is false;
- `eligible_prediction_count` is null;
- `aggregates` is JSON null;
- the browser receives no aggregate counts or percentages;
- the sheet displays a clear private state.

The viewing user’s own bracket choices may still be shown because those are their own authorised data. The public RPC is security-definer, but browser roles retain no direct access to prediction or curated-profile tables.

## Interface states

The sheet covers:

- loading;
- full success;
- curated-content empty;
- no tournament results yet;
- prediction aggregates private;
- no complete aggregate sample;
- partial failure where one source remains available;
- complete error with retry.

The presentation uses existing semantic tokens, typography, flags, badges and dialog primitives. It supports light and dark appearance and behaves as a bottom sheet on narrow screens.

## Administration

The existing protected control room now includes a Team Profile Sheet editor.

- `admin_list_team_profiles`: any active tournament administrator may inspect all tournament-team rows.
- `admin_upsert_team_profile`: owner only.
- stale revisions return SQLSTATE `40001`.
- every successful edit requires an audit note.
- direct browser writes remain unavailable.

## Migration rationale

A migration was necessary because these requirements could not be implemented safely with the first fourteen migrations:

1. curated profile facts needed a central, revisioned and audited source;
2. aggregate prediction percentages needed a server boundary that returns no aggregate payload before lock;
3. owner-only administration could not be achieved through a browser-local or hardcoded data file.

Migration 015 does not change:

- prediction storage contracts;
- scoring values;
- joker caps or multiplier;
- Original/KO competition separation;
- canonical result authority;
- bracket resolution;
- tournament lock behaviour.

## Validation

Stage-specific checks:

```bash
npm run audit:team-profile
npx vitest run \
  src/design-system/__tests__/TeamLabel.test.jsx \
  src/teamProfile/__tests__/TeamProfileSheet.test.jsx \
  src/teamProfile/__tests__/teamProfileModel.test.js \
  src/teamProfile/__tests__/teamProfileService.test.js \
  src/journey/__tests__/OriginalBracket.test.jsx \
  src/koPredictor/__tests__/KoPredictorMatchCentre.test.jsx \
  src/admin/__tests__/adminOperationsModel.test.js \
  src/admin/__tests__/adminOperationsService.test.js \
  --maxWorkers=4
```

Database test, against a disposable local database first:

```bash
npx supabase start
npx supabase migration up --local
npm run test:db:015:local
```

The linked test must not be run casually because the test transaction exercises the irreversible lock guard, even though pgTAP rolls the transaction back:

```bash
npm run test:db:015:linked
```

The full repository gate remains:

```bash
npm run check
```

## Deferred real-data acceptance

The 2028 participants, official rankings, qualifying routes and recent tournament records are not yet final. Stage 13E therefore proves the storage, privacy and presentation contract using clearly provisional visual data. Official content population belongs to the later confirmed-team stage.
