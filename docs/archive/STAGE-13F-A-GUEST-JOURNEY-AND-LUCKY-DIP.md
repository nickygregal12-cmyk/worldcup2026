> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Euro 2028 Predictor — Stage 13F-A
## Guest journey completion and Euro-native Lucky Dip
### Base checkpoint: `51696c3`

## Objective

Make the intended guest experience fully usable without changing scoring, locks, privacy, server authorisation or the database.

Guests must be able to use the Original Predictor and available KO Predictor fixtures, leave and return on the same browser, create an account without losing unfinished work, and move eligible predictions into that account through the existing controlled save contracts.

## Delivered behaviour

### Original Predictor

- Existing Groups and Original Bracket browser persistence remains canonical.
- Signing in with an unfinished browser draft keeps that draft visible and editable.
- The empty account workspace does not hide or replace the browser draft.
- Once all 51 Original selections are complete, one action imports them through `save_my_prediction_bundle` using the existing guest-import source.
- Existing account predictions are never overwritten.
- The browser copy and guest review flag are cleared only after the account save and reload succeed.

### KO Predictor

- Available real-fixture entries use a separate versioned browser-storage model.
- Scores, advancing team, method and five KO jokers remain separate from Original Predictor data.
- Guest edits save immediately on the device.
- Signing in preserves the browser KO draft when the account has no KO entries.
- Complete available fixtures can be moved into the account through the existing KO save RPC.
- Existing KO account entries are never overwritten.
- The browser KO copy is cleared only after the controlled account save succeeds.

### Account conversion

- Original and KO guest progress is detected on the Account screen.
- One transfer action moves every currently eligible competition.
- Incomplete or conflicting browser drafts remain untouched and receive a clear next action.
- Progress-aware prompts link guests to Account from both predictor journeys.
- Ordinary JSON import/export controls are removed from the live product.

### Lucky Dip

- Groups-only weighted local score generation.
- `Fill empty scores` leaves completed scores unchanged.
- `Replace all scores` requires confirmation.
- Jokers are never added, removed or moved.
- Changed tables use the canonical resolver and stale bracket picks are cleared.
- No odds, rankings, network call or inherited WC26 Lucky Dip code is used.

## Tests and audits

- guest KO state/storage tests;
- guest account-transfer planning tests;
- Lucky Dip distribution, preservation and stale-bracket tests;
- updated Groups, guest and KO audits;
- dedicated `audit:guest-journey` gate in `npm run check`.

## Explicit non-goals

- no partial Original server import;
- no scoring changes;
- no lock changes;
- no privacy changes;
- no account merging;
- no database migration;
- no Migration 016;
- no WC26 source reuse;
- no advanced JSON recovery UI.

## Ledger rows

The batch moves these rows to their final Stage 13F-A state:

- Guest KO access and persistence → `✅ FUNCTIONAL`;
- Guest-to-account transfer → `✅ FUNCTIONAL`;
- Signup encouragement → `✅ FUNCTIONAL`;
- Manual JSON file controls → `🚫 REJECTED` from the normal journey;
- Lucky Dip → `✅ FUNCTIONAL`.
