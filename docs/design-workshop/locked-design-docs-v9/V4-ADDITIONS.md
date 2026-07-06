# v5 additions — required corrections folded in

This pack supersedes v3. It includes the required corrections supplied in `V3-PACK-CORRECTIONS.md`.

## 1. No duplicate visual contracts

The install map now directs approved candidates for existing surfaces to replace the current reference file at the existing filename. This prevents the two-contracts-per-surface defect.

Affected existing targets:

- Player View → `docs/reference-prototypes/euro28-player-view-prototype.html`
- Points Breakdown → `docs/reference-prototypes/euro28-points-breakdown-page-prototype.html`
- Tournament Overview → `docs/reference-prototypes/euro28-tournament-page-prototype.html`
- How to Play / Rules → `docs/reference-prototypes/euro28-how-to-play-page-prototype.html`
- Admin Control Room → `docs/reference-prototypes/euro28-admin-page-prototype.html`

Recording acceptance now includes a manual one-reference-per-surface assertion, with a permanent-audit follow-up for a later stage.

## 2. Correctness queue restored

The roadmap/ledger/register now explicitly preserve the three open 13G-C correctness rows:

- Original bracket coherence after group-score edits.
- Predicted group standings.
- Shared third-place table.

Home Clarity may still go first as an explicit decision, but Review Picks and dependent visual adoptions must not silently bypass those rows.

## 3. Tie-break ladders added

The Decision Register draft now includes the confirmed final-standings tie-break ladders:

- Original: closest total goals → most exact group scores → most correct group results → knockout accuracy cascade → shared.
- KO: most exact KO scorelines → most correct KO outcomes → shared.

These apply to final standings only. Live standings may use shared positions.

## 4. Shared States source verification

The install map and next-chat prompt now require verification of the Shared States source header and six-state inventory before byte-exact install, because the local filename contained a duplicate-download suffix.

## 5. Results corrected-result card preserved

The final sweep now says the Results corrected-result card is the exceptional corrected-result state, not normal Home content. It must not be removed during the sweep.
