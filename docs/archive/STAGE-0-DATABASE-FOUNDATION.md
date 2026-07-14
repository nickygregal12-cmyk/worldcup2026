> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage 0 — Euro Database Foundation

Completed: 30 June 2026

## Repository

Local folder: ~/Desktop/euro28predictor

Git branch: euro28-development

The live WC26 branch remains separate on main.

## Supabase staging project

Project: Euro 2028 Predictor Staging

Project reference: gcfdwobpnanjchcnvdco

Blocked WC26 production reference: ouhxawizadnwrhrjppld

## Migration

Applied migration:

supabase/migrations/202606300001_euro28_core_tournament.sql

Remote migration history confirms:

Local: 202606300001
Remote: 202606300001

## Hosted tables

The following ten tables now exist:

- tournaments
- tournament_stages
- teams
- tournament_teams
- groups
- group_memberships
- venues
- tournament_venues
- match_slots
- matches

## Hosted data

Verified records:

- 1 tournament
- 5 tournament stages
- 6 groups
- 0 teams
- 0 venues
- 0 fixtures

The empty tables are intentional. Official tournament data has not yet been confirmed.

## Security

Verified:

- RLS enabled on all ten tables
- 10 SELECT policies
- 0 browser write policies
- WC26 production reference blocked by the database safety script

## Application read test

The Euro application successfully read the hosted tournament record using:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Verified tournament:

- Code: euro-2028
- Name: UEFA EURO 2028
- Teams: 24
- Groups: 6
- Status: configured
- Public: true
- Provisional: true

## Current position

Stage 0 is complete.

The next development stage is Stage 1: provisional tournament teams, slots and fixture structure.

Official fixtures, scoring and UI redesign must not begin until the provisional tournament model is agreed and tested.
