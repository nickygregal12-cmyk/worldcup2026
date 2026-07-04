# Stage 13G-C1 — Guest import prompt and signed-in copy sweep

## Status

Accepted as the first product-facing build after Stage 13G-H2.

This batch updates the signed-in guest import surface so it matches the accepted one-tap product contract.

No route, scoring, resolver, league, admin, database policy or migration change is made.

## Product contract

When a guest has saved Euro 2028 predictions on this device and then signs up or signs in, the account page must show a dominant prompt:

- heading: “Import your saved Euro 2028 predictions?”
- helper copy: mentions group scores, bracket picks and/or a KO Predictor draft found on this device;
- primary action: “Import predictions to my account”;
- secondary action: “Start fresh”.

The signed-in surface must not use “browser draft”, “browser copy” or similar internal-storage language. It should say “this device” or “device copy”.

## Competition boundaries

Original Predictor and KO Predictor remain separate:

- Original Predictor import covers group scores and pre-tournament bracket picks only;
- KO Predictor import covers real knockout fixture predictions only;
- importing one competition must not blend totals, points, jokers or leaderboards with the other;
- if one account-side competition already exists, that competition is retained and the device copy is not used to overwrite it.

## Start fresh behaviour

The secondary “Start fresh” action clears the saved device-side guest draft and leaves account predictions untouched.

It does not write to the database.

## Acceptance evidence

C1 acceptance requires:

- `GuestAccountTransfer` renders the accepted heading, helper, primary action and secondary action;
- signed-in guest import/account copy no longer mentions “browser draft”, “browser copy” or “browser predictions”;
- tests cover the prompt wording and separate Original/KO readiness;
- `audit:guest-import-prompt` is included in `npm run check`;
- active migrations remain 18;
- no Migration 019 is created.
