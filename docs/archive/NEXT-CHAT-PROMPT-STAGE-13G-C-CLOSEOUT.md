# Next Chat Prompt — Euro 2028 Predictor after Stage 13G-C

You are continuing the Euro 2028 Predictor project.

I will upload a local zipped repo. Treat that zip as the source of truth.

Start by inspecting the current repo state. Do not assume from memory.

## Current known state

Branch:

euro28-development

Latest known completed commit:

2e6f79b Compact Stage 13G league shell

Recent commits:

2e6f79b Compact Stage 13G league shell
9374950 Align league detail verifiers
8e83971 Add Stage 13G league detail destination
f0adebe Compact Stage 13G league standings
8610024 Add Stage 13G-C3 league race summary

Euro dev site:

https://euro28-predictor-dev.netlify.app

Euro staging Supabase project:

gcfdwobpnanjchcnvdco

WC26 production project must not be touched.

Active migrations remain 20.

Migration 019 has not been created.

## Safety rules

Do not touch main.

Do not touch WC26 production.

Do not use git add .

Do not create Migration 019 unless a genuine schema/read-contract gap is proved.

Do not commit secrets.

Do not blend Original Predictor and KO Predictor.

Use exact Terminal commands for all file changes, checks, staging, commits and pushes.

## Current completed area

Stage 13G-C league simplification is complete through C6.

The league page now defaults to:

- League selector
- Original / KO toggle
- Rank | Member | Points table

Secondary details sit after the table:

- League code
- Lifecycle/privacy copy
- Summary cards
- Shared-member note

Member row opens the detail destination below the table.

The old compare picker has been removed.

Original Predictor and KO Predictor ranks and points remain separate.

## Required initial checks

Run:

cd ~/Desktop/euro28predictor

git status --short
git log -8 --oneline
npm run verify:foundation-page
echo "verify exit: $?"

Then inspect:

grep -R "Compare with member\|foundation-member-picker\|LeagueRaceSummary\|Groups</th>\|Bracket</th>\|Scored</th>\|Match points" src/leagues scripts docs | head -80

grep -n "LeaguePicker\|CompetitionTabs\|LeagueCompetitionHeading\|StandingsTable\|LeagueSecondaryDetails\|LeagueDetailDestination\|LeagueCodeDisclosure\|LeagueLifecycleBanner" src/leagues/Leagues.jsx src/leagues/LeaguePresentation.jsx

Expected:

- Old table columns must not appear in active league UI.
- Compare with member should not appear in active league UI.
- Race-summary model references may still exist in model/tests and are acceptable.
- Forbidden UI markers may appear inside audit scripts as forbidden checks.

## Recommended next action

Do a roadmap/scope alignment pass before starting Stage 16.

The next major build should probably be:

Stage 16 — staging-only data seeding and acceptance batch

But only start it after checking the ledger, roadmap and decision register are still aligned.

Stage 16 must cover staging-only deterministic data seeding, synthetic users/personas, leagues, scenario results/corrections, teardown and repeatable reseeding.

Stage 16 must fail closed against WC26 production and must not change components, resolver logic or scoring logic.
