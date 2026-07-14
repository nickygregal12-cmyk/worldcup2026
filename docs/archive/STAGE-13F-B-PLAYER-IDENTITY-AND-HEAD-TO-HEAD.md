> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Euro 2028 Predictor — Stage 13F-B
## Shared player identity and complete head-to-head comparison
### Base checkpoint: `2e2b9a8`

## Objective

Complete the player-to-player comparison journey without changing prediction privacy, scoring, locks, database contracts or competition boundaries.

Every approved league and overall leaderboard player entry must use one accessible player-identity primitive. Both entry points must open the same aligned head-to-head presentation for the selected competition.

## Delivered behaviour

### Shared player identity

- One `PlayerIdentity` primitive belongs to the shared design system.
- League standings and overall leaderboards use the same identity anatomy and activation behaviour.
- Other players are accessible comparison buttons with an explicit accessible name.
- The signed-in player remains clearly marked as `You` and is not an accidental self-comparison trigger.
- Initials provide a neutral identity mark without adding profile data or changing privacy.

### Complete head-to-head comparison

- League and overall entry points use one `PlayerHeadToHead` surface.
- Current-player and selected-player ranks and points are shown for the selected competition only.
- Original Predictor and KO Predictor totals never combine.
- Original comparison aligns all 36 group-score positions and all 15 winner-only bracket positions.
- KO comparison aligns all 15 real knockout fixtures.
- Rows are grouped by group or knockout round so the complete comparison remains usable on phones and larger screens.
- Each aligned row shows both players side by side and labels the selection as same, different or protected.
- Score, advancing team, decision method and joker information remain competition-specific.
- Missing predictions are shown honestly as not saved.

### Privacy and authorisation

- Existing authorised RPCs remain the only data source.
- Original predictions remain private until the global lock.
- KO predictions remain released fixture by fixture after the real match starts.
- Protected rows render a privacy state rather than inferred or browser-derived prediction data.
- No direct browser write or public profile browse is introduced.

## Tests and audits

- shared player identity rendering and accessibility tests;
- aligned Original and KO comparison model tests;
- complete privacy-state comparison test;
- updated Stage 11 and Stage 13D compatibility audits;
- dedicated `audit:player-comparison` gate in `npm run check`;
- architecture, token, lint, unit and production-build gates.

## Explicit non-goals

- no public player profile page;
- no new avatar/profile fields;
- no social following or messaging;
- no scoring change;
- no lock or visibility change;
- no database migration;
- no Migration 016;
- no combining Original and KO Predictor totals.

## Ledger rows

The batch moves both Stage 13F-B rows together:

- Head-to-head comparison → `✅ FUNCTIONAL`;
- Tappable player identity → `✅ FUNCTIONAL`.

Stage 13F-B is not complete if league and overall journeys diverge or if either competition is only partially aligned.
