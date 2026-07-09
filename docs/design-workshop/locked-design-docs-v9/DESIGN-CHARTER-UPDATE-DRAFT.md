> **PACK SNAPSHOT — do not work from this copy.** Part of the locked v9 install pack, frozen at its 2026-07-06 state. If a canonical version exists it lives outside the pack (docs/ or docs/archive/); a filename search that lands here should follow the canonical copy.

# Design Charter update draft — locked set v2

## Version bump

Bump the Design Charter version when installing this stage.

## Add: approved visual-contract inventory

The approved visual-contract inventory now includes:

- Groups.
- Leagues / League table D.
- Bracket G.
- KO Predictor F.
- Home B.
- Match Centre A.
- Player View A.
- Points Breakdown A.
- Account B.
- Tournament Overview A.
- How to Play / Rules Hub A.
- Admin Control Room A.
- Results.
- Leaderboards.
- Offline Player Claim.
- Bracket Health.
- Team Profile Sheet.
- Shared States.

## Add: same-design-system rule

Every page must use the same approved Euro 2028 Predictor design system. The page content can change, but the app should never feel like a different product between destinations.

The anchors remain:

- Groups Night Broadcast visual contract.
- Leagues / League table D.
- Bracket G.
- KO Predictor F.

## Add: reference filename convention

Standalone HTML reference files should use the `*-prototype.html` suffix going forward. Approval status is recorded in the file header and docs, not inferred from whether the filename says `prototype` or `contract`.

Do not rename existing reference files merely for suffix tidiness unless a later naming-cleanup stage is explicitly scoped.

## Add: final design/content sweep before implementation

Before product implementation and seeded-team testing, all approved references need one final design/content sweep to remove:

- non-user-facing content;
- audit/spec wording;
- internal notes;
- prototype labels;
- unnecessary public provisional marks;
- confusing placeholder examples;
- wrong phase/competition emphasis.

Seeded-team testing should feel like a polished real-user product, not a prototype.

## Add: dynamic smoothness rule

A page matching the visual reference is not enough if it briefly shows the wrong content, CTA, lock state, competition state, account state or navigation action before settling.

Dynamic pages must either render the correct state immediately or show a neutral skeleton/settling state until the canonical state is known.

This applies especially to Home, Review Picks, Welcome, Prediction Trends, Groups, Original Bracket, KO Predictor, Leagues, Match Centre, Player View, Account, invite/join, guest transfer and public-signup gates.

## Add: contextual return rule

Every contextual route, sheet, modal or detail surface opened from a known origin must provide a clear way back to that origin. This applies to click-through journeys, not normal bottom-nav tab changes.


## One reference per surface

The reference library must keep one approved visual contract per surface. If a later candidate supersedes an existing surface, it replaces the existing reference file at that surface's existing filename. New filenames are allowed only for genuinely new surfaces.

## Final standings tie-break display

Live standings may use shared positions. Final standings should use the confirmed tie-break ladders recorded in the Decision Register, with Original and KO Predictor ladders separate.
