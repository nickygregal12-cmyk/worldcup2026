# Stage RULES-1A — Rules hub UI upgrade

Date: 5 July 2026
Scope type: UI/model/docs/audit-only presentation slice
Route: existing `#/how-to-play`

## Purpose

This slice turns the existing mechanics page into a fuller rules hub suitable for a larger Euro 2028 audience. It gives a visible product lift without changing routes or backend behaviour.

The page now presents:

- scoring values rendered from the central scoring constants;
- Original Predictor and KO Predictor as separate competitions;
- lock timing and joker rules;
- result correction policy;
- name moderation policy;
- privacy and deletion-path expectations;
- support-contact status; and
- the tie-break ladder as a tournament gate.

## Owner decisions still open

RULES-1A improves the visible page, but it does not close every signup gate. Before wide registration, the owner still needs to record:

- the dedicated scalable support contact;
- the confirmed Supabase data region for the public privacy note;
- the final email-confirmation decision; and
- the capacity/tier planning number.

RULES-1B now makes those unresolved signup gates visible on the Rules Hub itself. It still does not close the gates or invent owner choices.

## Boundaries

This slice is read-only presentation work.

- no Supabase writes;
- no Auth user creation;
- no prediction seeding;
- no service-role credential use, read or print;
- no scoring changes;
- no resolver changes;
- no new UI route;
- no database migration / no migration;
- active migrations remain 18;
- Migration 019 is not created;
- Original Predictor and KO Predictor remain separate; and
- predicted and live brackets never blend.

## Verification

- `npm run audit:rules-hub`
- `npm run audit:product-completeness-roadmap`
- `npm run audit:stage13g-tournament-how-to-play-split`
- `npm run audit:token-contrast-usage`
- `npm run check`
- `npm run verify:foundation-page`

## Eyes-on check

After deploy, open `#/how-to-play` in light and dark theme and confirm:

1. the new hero panel renders as a rules hub rather than the old small FAQ page;
2. Original Predictor and KO Predictor cards are visually separate;
3. the policy cards are readable on mobile;
4. the tie-break panel clearly says it remains a tournament gate; and
5. no new route or sign-up behaviour has appeared.

## STAGE-RULES-SCORING-LOCK-1 follow-on wording target

The Rules Hub must eventually align with the locked scoring/rules target in `docs/RULES-SCORING-LOCKED-CONTRACT.md`.

Important changes from earlier provisional wording:

- group goals are auto-calculated only and are not manually editable;
- correct score and correct result are not cumulative;
- unresolved in-group and best-third predicted ties should ask the user to Change scores or Pick positions;
- delayed/postponed/suspended/abandoned/replay/result-pending matches do not score until official result state is valid;
- Original Predictor and KO Predictor scoring/tiebreaks remain separate.

This doc note does not change the active Rules Hub implementation. UI wording alignment remains a later scoped implementation task.
