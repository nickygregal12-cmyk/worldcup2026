# Reference file install map — locked set v5

This map lists approved HTML files that should be copied into `docs/reference-prototypes/` during the recording stage.

Approved files should be copied byte-exact unless a separate final-sweep stage is explicitly scoped.

## Already recorded at `96a9624`

| Contract | Target |
|---|---|
| Groups | `docs/reference-prototypes/euro28-groups-page-prototype.html` or existing recorded Groups reference |
| League table D | `docs/reference-prototypes/euro28-league-page-prototype.html` |
| Bracket G | `docs/reference-prototypes/euro28-bracket-page-prototype.html` |
| KO Predictor F | `docs/reference-prototypes/euro28-ko-predictor-contract.html` or existing KO Predictor reference |

## Superseded by v2 (Stage CONTRACTS-PROTOTYPE-V2-INSTALL)

The rows above record what was installed at `96a9624`. Four of those surfaces have since been re-drafted. The v2 file is the binding contract; the v1 file is retained under a `-v1-superseded` suffix as provenance only and must not be implemented against.

| Contract | Binding (v2) | Retained provenance (v1) |
|---|---|---|
| Home | `docs/reference-prototypes/euro28-home-page-prototype-v2.html` | `euro28-home-page-prototype-v1-superseded.html` |
| Groups | `docs/reference-prototypes/euro28-groups-page-prototype-v2.html` | `euro28-groups-page-prototype-v1-superseded.html` |
| KO Predictor | `docs/reference-prototypes/euro28-ko-predictor-prototype-v2.html` | `euro28-ko-predictor-contract-v1-superseded.html` |
| Bracket | `docs/reference-prototypes/euro28-bracket-page-prototype-v2.html` | `euro28-bracket-page-prototype-v1-superseded.html` |

Note the KO Predictor v1 was named `euro28-ko-predictor-contract.html`, not `-prototype.html`; the v2 file adopts the `-prototype-v2` stem.

## To record from later approved candidates

| Source file from chat/downloads | Suggested target |
|---|---|
| `euro28-home-contract-candidate-B.html` | `docs/reference-prototypes/euro28-home-page-prototype.html` |
| `euro28-match-centre-contract-candidate-A.html` | `docs/reference-prototypes/euro28-match-centre-page-prototype.html` |
| `euro28-player-view-contract-candidate-A.html` | `docs/reference-prototypes/euro28-player-view-prototype.html` |
| `euro28-points-breakdown-contract-candidate-A.html` | `docs/reference-prototypes/euro28-points-breakdown-page-prototype.html` |
| `euro28-account-contract-candidate-B.html` | `docs/reference-prototypes/euro28-account-page-prototype.html` |
| `euro28-tournament-overview-contract-candidate-A.html` | `docs/reference-prototypes/euro28-tournament-page-prototype.html` |
| `euro28-how-to-play-rules-contract-candidate-A.html` | `docs/reference-prototypes/euro28-how-to-play-page-prototype.html` |
| `euro28-admin-control-room-contract-candidate-A.html` | `docs/reference-prototypes/euro28-admin-page-prototype.html` |
| `euro28-results-page-prototype.html` | `docs/reference-prototypes/euro28-results-page-prototype.html` |
| `euro28-leaderboards-page-prototype.html` | `docs/reference-prototypes/euro28-leaderboards-page-prototype.html` |
| `euro28-offline-player-claim-prototype.html` | `docs/reference-prototypes/euro28-offline-player-claim-prototype.html` |
| `euro28-bracket-health-prototype.html` | `docs/reference-prototypes/euro28-bracket-health-prototype.html` |
| `euro28-team-profile-sheet-prototype.html` | `docs/reference-prototypes/euro28-team-profile-sheet-prototype.html` |
| `euro28-shared-states-prototype (1).html` | `docs/reference-prototypes/euro28-shared-states-prototype.html` |

## Source brief to distil into docs

| Source | Suggested target |
|---|---|
| `Euro 2028 Predictor Build Brief.pdf` | Do not add as user-facing product content. Distil into Charter/Register/Roadmap/Stage docs. Optional archival copy under `docs/reference-briefs/` only if the repo uses that pattern. |

## Naming caution

Do not rename existing reference files in the recording stage just to standardise names. Record the suffix convention now, then align names deliberately in a later cleanup stage only if needed.


## One-contract-per-surface rule

Every later approved candidate for a surface that already has a reference file must replace the existing file for that surface at the existing filename. Do not create a second reference file beside the first.

At `96a9624`, the following approved candidates must install into existing filenames rather than new filenames:

| Surface | Existing target to replace |
|---|---|
| Player View | `docs/reference-prototypes/euro28-player-view-prototype.html` |
| Points Breakdown | `docs/reference-prototypes/euro28-points-breakdown-page-prototype.html` |
| Tournament Overview | `docs/reference-prototypes/euro28-tournament-page-prototype.html` |
| How to Play / Rules | `docs/reference-prototypes/euro28-how-to-play-page-prototype.html` |
| Admin Control Room | `docs/reference-prototypes/euro28-admin-page-prototype.html` |

Results, Leaderboards, Offline Player Claim, Bracket Health, Team Profile Sheet and Shared States are genuinely new surfaces in the reference library, so their listed targets are correct.

Recording-stage acceptance must include a manual assertion that there is exactly one reference file per surface in `docs/reference-prototypes/`. A small permanent audit should be added in a later implementation/tooling stage so duplicate visual contracts cannot recur.

## Shared States source verification

The Shared States source filename may appear as `euro28-shared-states-prototype (1).html` because it came from a duplicate local download. Before installing it byte-exact, verify the chosen source file header contains `APPROVED VISUAL CONTRACT (approved by Nicky 2026-07-05` and the six-state inventory: More menu, loading, error, unknown route, invite/join and privacy placeholders. If multiple local copies differ, use the approved-header copy and report the discrepancy rather than guessing.

## v5 source preservation

Preserve `CANDIDATE-TEAM-POOL-BRIEF.md` and `sources/Euro 2028 Predictor Brief.pdf` in the recording package as future staging/admin data guidance. These are not visual contracts and do not install into `docs/reference-prototypes/`.
