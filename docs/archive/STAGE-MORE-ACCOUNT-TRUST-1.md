> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# STAGE-MORE-ACCOUNT-TRUST-1 — More, Account and Trust Recording

Status: complete once committed and verified.
Type: docs/audit-only recording stage.

## Scope

This stage records the More, Account and Trust product contract before any implementation work. It covers the secondary navigation and trust surfaces that support the core prediction journey.

It records:

- More menu information architecture;
- Support route/content contract;
- Privacy and data wording;
- Settings placement;
- About page/content contract;
- Account request/delete wording;
- signup gate copy;
- admin-only link visibility;
- public signup still closed until implementation gates are complete.

## More menu information architecture

The More menu is the secondary navigation hub. The primary bottom navigation remains Groups, Bracket/KO, Home, Leagues and More.

The target More menu order is:

1. How to Play / Rules.
2. Tournament information.
3. Account and settings.
4. Support.
5. Privacy and data.
6. About Euro 2028 Predictor.
7. Admin control room, visible only to authorised administrators.

The More menu must not become a dumping ground. It should keep support, privacy and account actions clear and separate.

## Support route/content

Support should cover access, league invites, account issues, scoring questions and incorrect-looking states.

Support should explain that official results and scoring corrections are handled through admin workflows. It must not promise live chat, automated email workflows, guaranteed response times or public helpdesk features unless those are implemented later.

## Privacy and data wording

Privacy and data wording should say that guest predictions are browser-only and unscored, signed-in predictions are account-stored, league sharing follows the correct lock/release rules, and Original Predictor and KO Predictor evidence remains competition-scoped.

Privacy copy must not over-claim. If self-service export, deletion or account-request tooling is not implemented, the surface should use contact-admin/request wording.

## Settings placement

Settings should sit under Account for signed-in users and under More for general app preferences. Theme/appearance remains a local preference.

Settings must not expose admin-only toggles, fake clocks, scenario-runner controls, seed-write controls, staging controls or Supabase controls to ordinary users.

## About page/content

About Euro 2028 Predictor should explain that the app is a private prediction game for UEFA Euro 2028, with separate Original Predictor and KO Predictor competitions, private leagues and deferred official result APIs.

The About page must not imply official UEFA endorsement or deploy UEFA branding without permission.

## Account request/delete wording

Account request/delete wording should be careful and owner-controlled. Until self-service deletion/export exists, the app should present contact-admin/request wording.

Clearing guest/browser predictions and requesting account deletion are different behaviours and must stay separate.

## Signup gate copy

Public signup remains closed until implementation gates are complete. The trust layer can explain the closed-signup state, but it must not open public signup.

Signup gate copy should continue to cover support capacity, user/league capacity, email confirmation, privacy wording and name moderation.

## Admin-only link visibility

Admin control room links must be hidden from guests and ordinary signed-in users. They should only appear for authorised administrators or owners.

Hiding the link is not the security boundary. Route guards, RPC permissions, RLS and database enforcement remain the real boundary.

## Safety and non-goals

This stage is docs/audit-only.

It does not change:

- runtime UI;
- routes;
- Auth configuration;
- Supabase schema, RPCs, RLS or service-role use;
- official result entry;
- scoring engine;
- resolver behaviour;
- fake-result writes;
- migrations.

Database remains at 18 active migrations. Migration 019 is not created.

Original Predictor and KO Predictor points remain separate.

## Acceptance evidence

Acceptance is the passing `audit:more-account-trust` script and full `npm run check`.

Marker record: signup gate copy; admin-only link visibility; public signup remains closed until implementation gates are complete; must not imply official UEFA endorsement.
