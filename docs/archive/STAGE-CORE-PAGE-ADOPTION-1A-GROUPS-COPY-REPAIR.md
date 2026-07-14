> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# STAGE-CORE-PAGE-ADOPTION-1A-GROUPS-COPY-REPAIR

## Status

Accepted as a focused repair after `STAGE-CORE-PAGE-ADOPTION-1A-GROUPS`.

## Reason

The Groups Night Broadcast slice correctly rebuilt the live Groups surface, but Nicky's eye test identified internal lifecycle/config/save-contract wording on the player-facing Groups journey. That wording was technically audit-clean but was not suitable for normal users.

## Repair

The live Groups journey now uses plain player-facing copy:

- date-list helper copy says each match card shows its group and the Tables action opens standings;
- account autosave copy says account picks save automatically while editing;
- lock copy says group-stage predictions lock before the tournament starts;
- footer meta says five group jokers are available, no jokers apply to the original bracket, and completed picks are checked before saving.

The following internal terms must not appear on the live Groups or Prediction Journey UI:

- `central provisional Euro 2028 lock configuration`;
- `irreversible tournament lock`;
- `euro28-prediction-journey-v3`;
- `atomic saving`;
- `Group tags keep context on every ticket`;
- `sticky Tables pill`.

The Stage 1A Groups audit and Stage 13G shared-primitives audit now enforce this player-facing copy boundary.

## Safety

This is a copy/audit/docs repair only. It makes no scoring, resolver, Supabase write, Auth, service-role, fake-result, league-write or migration change. Original Predictor and KO Predictor remain separate. Active migrations remain 18 and no Migration 019 is created.
