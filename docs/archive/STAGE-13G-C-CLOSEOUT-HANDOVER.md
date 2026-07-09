> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Euro 2028 Predictor — Stage 13G-C Close-out Handover

## Current branch and safety position

Branch: euro28-development

Latest known completed commit:

2e6f79b Compact Stage 13G league shell

Euro development site:

https://euro28-predictor-dev.netlify.app

Euro staging Supabase project:

gcfdwobpnanjchcnvdco

WC26 production must not be touched.

WC26 production project reference remains blocked by safety tooling.

Active migrations remain 18.

Migration 019 has not been created.

## Safety rules for the next chat

Do not touch main.

Do not touch WC26 production.

Do not use git add .

Do not commit secrets.

Do not create Migration 019 unless a genuine schema/read-contract gap is proved.

Do not blend Original Predictor and KO Predictor.

Original Predictor and KO Predictor must remain separate competitions, with separate points and separate standings.

Use exact Terminal commands for all file changes, checks, staging, commits and pushes.

## Latest completed product thread

Stage 13G-C league simplification is complete through C6.

### Stage 13G-C4 — Compact league standings

Commit:

f0adebe Compact Stage 13G league standings

Outcome:

- Default mini-league table is compact.
- Table is Rank | Member | Points.
- Groups / Bracket / Scored / Match points columns were removed from the default league table.
- Breakdown material remains available through deeper destinations.
- Original Predictor and KO Predictor standings remain separate.

### Stage 13G-C5 — League member detail destination

Commit:

8e83971 Add Stage 13G league detail destination

Verifier alignment commit:

9374950 Align league detail verifiers

Outcome:

- The old compare picker was removed from the league page.
- Selecting a member row opens the member detail destination below the compact table.
- Selected row treatment and scroll-to-detail behaviour were added.
- PlayerHeadToHead remains the comparison detail surface.
- Original Predictor and KO Predictor comparison boundaries remain separate.

### Stage 13G-C6 — Compact league page shell

Commit:

2e6f79b Compact Stage 13G league shell

Outcome:

- Default league page now prioritises:
  - league selector
  - Original / KO toggle
  - compact Rank | Member | Points table
- Secondary material now sits behind details after the table:
  - league code
  - lifecycle/privacy copy
  - summary cards
  - shared-member note
- The league intro keeps the required competition-boundary sentence:
  - Original Predictor and KO Predictor ranks and points are always shown separately.
- The old unused MemberPicker block was removed.
- C6 audit was added to the full check chain.

## Final verification state after C6

The following passed before close-out:

npm run check
check exit: 0

npm run verify:foundation-page
verify exit: 0

Known full-gate evidence:

- 84 test files passed.
- 420 tests passed.
- Build passed.
- Active migrations remain 18.
- Migration 019 was not created.
- WC26 production remained untouched / blocked.

## Current league render order

The final league page structure is:

1. LeaguePicker
2. CompetitionTabs
3. LeagueCodeDisclosure
4. LeagueCompetitionHeading
5. StandingsTable
6. LeagueSecondaryDetails
7. LeagueDetailDestination

This is intentional.

## Remaining league-model notes

The following model/test markers still exist and are expected:

- buildLeagueRaceSummary
- gapLabel

They are retained because the race-summary model can still support deeper or secondary views. They are not rendered as default table clutter.

The following forbidden UI markers should only appear inside audit scripts or historical docs:

- Compare with member
- <th>Groups</th>
- <th>Bracket</th>
- <th>Scored</th>
- <th>Match points</th>

They must not reappear in the active league UI.

## Recommended next step

Before starting the next major build stage, run a roadmap and scope alignment pass.

Recommended next handover task:

Stage 13G-C close-out / roadmap alignment

Recommended next build option after alignment:

Stage 16 — staging-only data seeding and acceptance batch

Stage 16 must not begin until the roadmap confirms the boundaries.

## Stage 16 boundary reminder

Stage 16 must open with staging-only data seeding and acceptance coverage:

- provisional teams
- synthetic users
- deterministic prediction personas
- leagues
- scenario results and corrections
- teardown and repeatable reseeding

Stage 16 must:

- fail closed against WC26 production
- use local service-role credentials only
- not commit secrets
- keep Original Predictor and KO Predictor separate
- avoid component, resolver and scoring changes
- avoid a migration unless a genuine schema/read-contract gap is proved

## Do not regress

Do not reintroduce:

- a combined Original/KO leaderboard
- default league table breakdown columns
- the old member compare picker
- user-facing result-correction FAQ wording
- WC26 app routes
- WC26 database writes
- Migration 019 without a proven schema/read-contract gap
