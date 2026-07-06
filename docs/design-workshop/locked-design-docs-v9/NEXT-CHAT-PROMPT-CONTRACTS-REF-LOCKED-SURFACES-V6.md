# Next chat prompt — Record locked visual contracts and missing-surface decisions v6

You are continuing the Euro 2028 Predictor project. This is a RECORDING stage only: docs and reference library, not product implementation.

The user has supplied two inputs:

1. The previous locked design docs pack, not yet added to the repo.
2. `Euro 2028 Predictor Build Brief.pdf`, which adds Home Clarity and missing-surface decisions.

Use this v6 pack as the merged source of truth. Do not install any earlier pack separately. The v3 corrections file is already folded in.

## Repo state to verify first

Branch: `euro28-development`  
Known verified base before this recording stage: `96a9624 Record approved visual contracts`  
Euro staging site: `https://euro28-predictor-dev.netlify.app`  
Euro staging Supabase project: `gcfdwobpnanjchcnvdco`  
Database state: 18 active migrations; no Migration 019; Migration 019 not approved.

Before editing, run:

```bash
git status --short
git branch --show-current
git log -3 --oneline
npm run check
```

## Hard boundaries

Recording only.

Do not change:

- `src/`
- `supabase/`
- tests
- audit logic
- scoring logic
- resolver logic
- Auth settings
- Supabase configuration
- service-role tooling
- RLS
- database functions
- WC26 production

Do not create a migration. Do not create Migration 019.

If an audit needs marker alignment because the docs/reference library changed, stop and ask before changing audit logic. The preferred recording stage is docs/reference only.

## Approved visual contracts to record

The repo already has `DESIGN-CONTRACTS-APPROVAL-1` at `96a9624`, recording:

- Groups.
- Leagues / League table D.
- Bracket G.
- KO Predictor F.

Record all later approved/confirmed contracts:

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

## Byte-exact reference files

Approved HTML files supplied in chat must be copied into `docs/reference-prototypes/` byte-exact unless the user explicitly asks for a final sweep first. The HTML header comments are part of the record.

Do not edit approved HTML during this recording stage.

## File suffix convention

Record this convention in the Design Charter:

`*-prototype.html` is the canonical filename suffix for standalone HTML reference files going forward. Approval status is recorded in the file header and docs, not by renaming every file to `*-contract.html`.

Do not rename existing files in this recording commit unless the user explicitly scopes a naming-cleanup stage.

## New build-brief decisions to record

Record the following in the Charter, Register, Ledger and Roadmap, as appropriate:

### Functional smoothness rule

Dynamic pages must render the correct state immediately or show a neutral skeleton/settling state until the canonical state is known. They must not flash the wrong CTA, lock state, signed-out state, guest state, competition state or navigation action.

### Home Clarity

Home must answer: "What should I do now?"

Home before the tournament should use one main countdown: Original Predictor locks when the first match kicks off.

Home must show no KO Predictor presence before KO Predictor readiness. KO Predictor discovery before readiness belongs in How to Play or More, not Home.

Home primary CTA should follow Original Predictor progress:

- No picks started: Start Groups.
- Groups incomplete: Continue Groups.
- Groups complete, bracket incomplete: Continue to Bracket.
- Groups and bracket complete, Review incomplete: Review Picks.
- Review complete before lock: You're ready / View leagues / Join league.
- Original locked: View your picks / View leagues.
- Tournament live: View today's matches / View points / View leagues.

Home matchdays should order rows live → upcoming → finished, with rows linking to Match Centre.

Home should support between-match, end-of-day and rest-day states calmly.

### Review Picks

Review Picks is needed, preferably at `/#review`. It is the final Original Predictor completion checklist.

It should include Groups completion, joker use, Original Bracket completion, champion/finalists, top scorer, group goals/tiebreak, leagues, lock status and edit/save/done/share/join actions.

Top scorer should likely be entered on Review. Group goals should be auto-calculated from Groups and editable only if used as a tiebreak/bonus value.

After lock, Review becomes read-only.

### Prediction Trends

Prediction Trends is approved at `/#prediction-trends`.

It is post-lock only. It starts as a post-lock aggregate prediction snapshot, then becomes a live tournament trends surface. Do not revive old `/stats` or old Tournament Pulse routes without approval.

Home may show Prediction Trends prominently for roughly 24–48 hours after Original Predictor lock, then move it into More or a lower-priority Home slot.

Original Predictor trends are primary. KO Predictor trends may appear only as a clearly labelled secondary section.

### Welcome / onboarding

Welcome is needed, likely at `/#welcome`. It is a temporary entry/setup surface, not a permanent main nav item.

It may appear for first visit, first sign-in, invite entry, guest transfer confirmation or new account setup.

### Invite / join league states

Invite/join states need proper handling: valid, invalid, expired, already joined, league full, signed-out, guest joining, account required, successful join, and safe return to Leagues.

### League Settings / Manage League

League Settings / Manage League is likely needed as a contextual sheet, not a permanent nav page.

Start with safe existing actions only, such as copy invite link/code and supported owner actions.

### Activity / Updates

Activity is useful but should start light. It can be a compact Home card, a More entry, or a later route. Do not build push notifications or email digests unless separately scoped.

### Match Centre trends section

Do not revive old `MatchStats.jsx` as a separate route. Useful match-level insights should live inside Match Centre under names such as Prediction Split, Match Trends, Crowd View or Points on the Line.

### Tournament Picks placement

Do not revive old `Awards.jsx` directly.

Tournament-wide picks should be placed:

- Before lock: Review Picks.
- Immediately after lock: Prediction Trends.
- During tournament: Prediction Trends / Tournament.
- After tournament: Prediction Trends archive.

### More menu

More may include Rules/How to Play, Tournament, Results, Account, Settings, Support, Privacy, Prediction Trends, Admin if authorised, About and maybe Activity.

### Global contextual return rule

Every contextual route, sheet, modal or detail surface opened from a known origin must provide a clear way back to that origin. This does not create extra permanent navigation items and does not apply to normal bottom-nav movement.

### Support and Privacy

Support and Privacy are required before public signup opens. Public signup remains closed.

### Old WC26 pages not to revive as-is

Record these mappings:

- `GlobalStats.jsx` / `/stats` → `/#prediction-trends`.
- Tournament Pulse → reference only for Prediction Trends.
- `Awards.jsx` → Review and Prediction Trends.
- `MatchStats.jsx` → Match Centre insights.
- `Predictions.jsx` → Groups / Bracket / Review.
- `PointsSummary.jsx` → Points Breakdown / Player View.
- old `HeadToHead.jsx` → active Player View / H2H destination.
- `PublicLeague.jsx` → invite/join states.
- old `Home.jsx` → keep active HomeDashboard only.

## Final sweep requirement before implementation / seeded testing

Before implementation and seeded-team testing, run a final design/content sweep:

- remove non-user-facing content;
- remove audit/spec wording;
- remove internal notes and prototype labels;
- remove unnecessary public provisional marks;
- ensure Home has no KO Predictor presence before readiness;
- improve Tournament overview content;
- confirm Account has no retired guest-import buttons;
- ensure all click-through journeys have contextual back/return;
- ensure neutral skeletons prevent wrong-state flicker.


## v6 corrections that must be applied during recording

### One contract per surface

Do not create duplicate reference files for surfaces that already exist in `docs/reference-prototypes/`. Replace the existing file at the existing filename. At `96a9624`, these targets are required:

- Player View → `docs/reference-prototypes/euro28-player-view-prototype.html`
- Points Breakdown → `docs/reference-prototypes/euro28-points-breakdown-page-prototype.html`
- Tournament Overview → `docs/reference-prototypes/euro28-tournament-page-prototype.html`
- How to Play / Rules → `docs/reference-prototypes/euro28-how-to-play-page-prototype.html`
- Admin Control Room → `docs/reference-prototypes/euro28-admin-page-prototype.html`

Results, Leaderboards, Offline Claim, Bracket Health, Team Profile Sheet and Shared States are genuinely new library surfaces and may use their listed new targets.

After install, manually assert that `docs/reference-prototypes/` contains exactly one reference file per surface. Record a later permanent-audit follow-up for this.

### Correctness queue

The ledger still has three `MISSING` 13G-C correctness rows: Original bracket coherence after group-score edits, predicted group standings and shared third-place table. Home Clarity may go first as an explicit decision, but Review Picks and later dependent visual adoptions must not silently bypass those rows. Record this in Register/Ledger/Roadmap.

### Tie-break ladders

Add the confirmed final-standings tie-break ladders to the Decision Register:

- Original: closest total goals → most exact group scores → most correct group results → knockout accuracy cascade → shared.
- KO: most exact KO scorelines → most correct KO outcomes → shared.

These apply to final standings only; live standings may use shared positions.

### Shared States source verification

Before installing `euro28-shared-states-prototype (1).html`, verify the header says APPROVED VISUAL CONTRACT approved by Nicky 2026-07-05 and includes the six-state inventory: More menu, loading, error, unknown route, invite/join and privacy placeholders. If duplicate local copies differ, use the approved-header copy and report the discrepancy.

### Results correction-card preservation

The no-standing-corrections rule is Home-specific. The corrected-result card in the Results contract is the exceptional corrected-result state. Do not remove it in the final sweep.

## Commit expectations

One docs/reference commit.

Suggested commit message:

`Record locked visual contracts and journey roadmap`

After commit:

```bash
git push origin euro28-development
npm run verify:foundation-page
```

Stop for the user's terminal evidence.


## Additional locked notes added in v6

- Result corrections are not normal Home content. Home should not promote a standing correction card; exceptional corrections should be explained only where they affect visible points, normally Results, Match Centre or Points Breakdown.
- Prediction Trends requires detailed live-tournament scope: post-lock aggregate snapshot first, then group-stage and knockout-stage trend stories from More, with Original Predictor primary and KO Predictor trends clearly secondary.
## v6 addition to record

The attached v6 pack includes `CANDIDATE-TEAM-POOL-BRIEF.md` and the source PDF `sources/Euro 2028 Predictor Brief.pdf`.

Record this as future staging/admin data guidance only:

- official slots A1–F4 stay stable;
- candidate teams are separate from slot assignments;
- candidate teams are not public confirmed participants;
- assignment must not rewrite predictions;
- no Migration 019 unless explicitly approved after proof of need;
- suggested future stage name: `STAGE-CANDIDATE-TEAM-POOL-1`.


## v6 additional source briefs

Two additional PDFs are supplied in the v6 pack:

- `sources/Euro 2028 Predictor — Admin Scenario Runner.pdf`
- `sources/Simulation Safety Guidelines.pdf`

Record them as future-stage documentation only.

Suggested future stage:

`STAGE-ADMIN-SCENARIO-RUNNER-1`

Do not implement the Scenario Runner during the locked-contract recording commit. Do not change result
entry, scoring, resolver logic, Supabase schema, migrations, service-role tooling, RLS or production
configuration.
