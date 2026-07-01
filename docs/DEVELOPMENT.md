# Development workflow

## Branches

- `main` is the live WC26 branch and must not be changed during Euro development.
- `euro28-development` is the Euro staging branch.
- Local work is always performed in `~/Desktop/euro28predictor`.

## Definition of done

A batch is complete only when:

- code and documentation agree;
- `npm run check` passes;
- relevant local database resets and pgTAP suites pass;
- the linked project reference is verified before remote commands;
- the dry run contains only the intended migration;
- hosted migration history, linked pgTAP and database lint pass;
- the working tree is clean and the commit is pushed.

## Current compatibility state

The active Euro application can reach only the foundation, auth, guest, prediction-save and canonical resolver modules. Inherited WC26 pages, stores, components and bracket utilities remain quarantined.

## Core contracts

Prediction content locks globally at the first tournament kick-off. Joker placement locks separately at each match kick-off. Grace is an audited exception for one user and one unstarted match. Knockout score predictions always mean the 90-minute score; advancing team and decision method are separate.

## Canonical resolver

`src/resolver/` is the only tournament progression engine. Guest, predicted and live contexts use its output but cannot be blended. It covers all six groups, best-third ranking, all 15 allocation combinations and matches 37–51.

## Guest workspace

`src/guest/` stores drafts in browser `localStorage`. It performs no Supabase write and contains no account identity. Exported bundles remain portable and unscored.

## Authentication

`src/auth/` handles Euro sign-up, sign-in, recovery, sign-out and owner profile changes. Profile writes use their own narrow RPCs and are not a prediction write path.

## Atomic prediction saving

`src/predictions/` converts complete guest drafts into canonical database rows, calls only `save_my_prediction_bundle()` for writes, and loads owner rows with both tournament and user filters.

Migration 009 is the sole prediction write path. It validates the full supplied bundle on the server and increments the prediction-set revision after a successful transaction.

The guest import button is deliberately explicit. Signing in does not upload the browser draft automatically, and a guest draft cannot overwrite existing account predictions.

## Next implementation boundary

Stage 7 may add:

- group prediction screens;
- knockout prediction screens;
- quiet autosave using the Stage 6 RPC;
- save status and stale-revision recovery;
- completeness guidance;
- submit/review and Edit Predictions controls.

Stage 7 must not add scoring, leagues, results entry or admin controls.
