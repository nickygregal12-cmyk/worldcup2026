> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Euro 2028 Predictor — Product completeness register alignment

Date: 5 July 2026  
Scope type: docs/audit-only decision alignment  
Gate owner: Product completeness before wider Euro 2028 signups

## Purpose

WC26 proved the predictor format with a small friends-and-family audience. Euro 2028 is being planned as a larger semi-public product, so the completion gates now include stranger-facing trust, support, moderation, capacity, privacy, monitoring and load-readiness decisions.

This slice records those decisions and gates. Where values are not yet selected, the value remains an owner decision before the relevant gate closes. It does not implement any user-facing feature, seed data, database write, migration, scoring rule, resolver rule or route change.

## Recorded signup gates

The following must be closed before registration is opened beyond the trusted WC26-style group:

1. **RULES-1** — a public rules and trust page rendered from configuration/constants where applicable. It must include scoring, tie-breaks, correction policy, support contact, privacy note and deletion path.
2. **Display-name and league-name moderation** — admin rename power for players/leagues, a small blocked-word check at signup and league creation, and published policy wording that inappropriate names may be changed.
3. **Support channel** — a dedicated scalable support contact, with the exact address/channel recorded before RULES-1 closes.
4. **Capacity decision** — an owner-selected planning number and budget/tier decision. The current planning range is 650–1,300 users, reflecting 10–20× WC26 usage.
5. **Email confirmation decision** — owner must record whether confirmation is on or off before wide signups. Recommendation remains on for stranger-scale registration.
6. **Privacy note and deletion path** — Supabase data region must be confirmed and the deletion route must be documented before wide signups.

## Recorded tournament gates

The following must be closed before the first Euro 2028 match:

1. **Tie-break ladders** — final standings and leaderboard tie-break ladders must be published and resolver-backed before tournament scoring matters.
2. **Load reality-check** — Stage 16A seeded data should exercise the planning number against leaderboards, Match Centre and league pages. Pagination or other performance changes must be scoped if a large table is too slow.
3. **Uptime and error monitoring** — uptime monitoring and real error reporting must be visible to the owner before matchday one.

## Scheduled, not launch-blocking

The following remain scheduled but are not immediate signup gates:

- Offline player lifecycle: create → score → visible in leagues → claim.
- Unknown-route fallback verification and friendly not-found behaviour if needed.
- Growth mechanics beyond the existing guest-first journey, including invite links/public-league join flow.

## Boundaries

This slice is documentation and audit only.

- No Supabase writes.
- No Auth user creation.
- No prediction seeding.
- No service-role credential use, read or print.
- No scoring changes.
- No resolver changes.
- No UI route changes.
- No database migration.
- Active migrations remain 18.
- Migration 019 is not created.
- Original Predictor and KO Predictor remain separate.
- Predicted and live brackets never blend.
