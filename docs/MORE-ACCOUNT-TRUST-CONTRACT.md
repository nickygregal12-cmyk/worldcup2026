# Euro 2028 Predictor — More, Account and Trust Contract

Status: recorded for `STAGE-MORE-ACCOUNT-TRUST-1`.
Type: product contract / implementation target.
Scope: docs/audit-only. This contract does not change runtime UI, routes, Auth configuration, Supabase writes, result entry, scoring, resolver behaviour or migrations.

## Purpose

More, Account and Trust is the layer that helps a user understand where to find support, privacy information, account controls and administrative links without interrupting the prediction journey.

The surface should make the app feel safe, clear and owner-controlled. It should not open wider public signup, create new account powers or imply that unimplemented trust actions already exist.

## More menu information architecture

The More destination should act as the secondary navigation hub for non-core prediction tasks. The primary bottom navigation remains Groups, Bracket/KO, Home, Leagues and More.

The More menu information architecture target is:

1. How to Play / Rules.
2. Tournament information.
3. Account and settings.
4. Support.
5. Privacy and data.
6. About Euro 2028 Predictor.
7. Admin control room, visible only to authorised administrators.

The More menu should avoid becoming a dumping ground. It should group trust and account links clearly, keep the most useful items high, and avoid showing admin-only links to ordinary users or guests.

## Support route/content contract

Support should explain how users can get help with access, league invites, account issues, scoring questions and incorrect-looking states.

Support wording should be calm and practical. It should explain that official tournament results and scoring corrections are controlled through admin workflows, not through user-submitted edits.

Support should not promise live chat, guaranteed response times, automated email workflows or public helpdesk features unless those are implemented later.

## Privacy and data wording

Privacy and data wording must use conservative plain-English wording. It should explain:

- guest predictions are browser-only and unscored;
- signed-in predictions are stored against the user account;
- league memberships allow relevant league standings and shared prediction visibility after the correct lock/release point;
- Original Predictor and KO Predictor evidence remains competition-scoped;
- account deletion/request workflows need an explicit later implementation stage before they become functional self-service controls.

The app should avoid over-claiming. If a control is not implemented, the wording should say that the user should contact the organiser/admin rather than presenting a non-functional self-service action.

## Settings placement

Settings should live under Account for signed-in users and in More for general app preferences. Theme/appearance remains a local app preference. Notification, email, marketing or data-export settings should not be presented as available unless they are implemented later.

Settings should not expose admin-only toggles, staging controls, fake clocks, scenario-runner tools or Supabase-related controls to ordinary users.

## About page/content contract

About Euro 2028 Predictor should explain the product in user-facing terms:

- a private football prediction game for UEFA Euro 2028;
- Original Predictor and KO Predictor are separate competitions;
- private leagues and overall standings are supported;
- official result APIs are deferred;
- public signup remains closed until the recorded signup gates are implemented and approved.

The About page should not use UEFA branding as if permission has been granted. It should avoid implying official UEFA endorsement.

## Account request/delete wording

Account request/delete wording should be careful and owner-controlled. Until self-service deletion/export exists, the app should present contact-admin/request wording rather than pretending the action is automated.

Account deletion must not be represented as a simple local clear action. Clearing guest/browser predictions and requesting account deletion are different behaviours and must stay separate.

## Signup gate copy

Public signup remains closed until implementation gates are complete. The More/Account/Trust layer may explain why signup is closed, but it must not open signups or imply that owner decisions have been fully implemented.

Gate copy should continue to cover support capacity, user/league capacity, email confirmation, privacy wording and name moderation.

## Admin-only link visibility

Admin links should be hidden from guests and ordinary signed-in users. They should only appear for authorised admin/owner roles. Hiding the link is not the security boundary; database and route guards remain the real enforcement.

The More menu should never expose scenario-runner, fake-clock, seed-write or staging-only controls to ordinary users.

## Safety boundaries

This contract preserves these hard boundaries:

- no Migration 019;
- no Auth configuration change;
- no Supabase schema, RPC, RLS or service-role change;
- no runtime UI or route implementation in this recording stage;
- no scoring or resolver changes;
- no official result-entry changes;
- no fake-result writes;
- Original Predictor and KO Predictor points remain separate.

## Implementation note

A later implementation stage may build the More/Account/Trust surfaces from this contract. That later stage must prove any required route, model or account-data changes explicitly and keep public signup closed until the recorded implementation gates are complete.

Marker record: signup gate copy; admin-only link visibility; public signup remains closed until implementation gates are complete; must not imply official UEFA endorsement.
