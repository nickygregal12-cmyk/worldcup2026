# STAGE-LEAGUE-SETUP-AND-INVITES-1 — League Setup and Invites Recording

Status: complete once committed and verified.
Type: docs/audit-only recording stage.

## Scope

This stage records the league setup and invite product contract before any implementation work. It covers the user journey for creating a private league, joining one from an invite/code, understanding league privacy, and recovering cleanly from invite edge cases.

It records:

- create league flow;
- join league flow;
- invite-code states;
- invalid/expired/full league states;
- league privacy explanation;
- empty league states;
- member list clarity;
- post-signup/post-login league continuation;
- league share/invite copy;
- public signup still closed until implementation gates are complete.

## Create league flow

The create league flow should be short and confidence-building. A signed-in user should understand the league name, privacy level, invite/share option, and what happens next after creation.

Creation copy should explain that a private league is a shared member list across the app, while Original Predictor and KO Predictor standings remain separate competitions.

The first-success state should give a clear next action: copy invite code/link, invite people, or go to the league.

## Join league flow

The join league flow should accept an invite code/link and return clear states. It should not strand the user on a dead page or silently fail.

Guests can inspect the general join context, but actually joining a private league requires the correct account/sign-in flow unless a later implementation explicitly proves a safe guest membership model. Join codes do not bypass signup/auth gates.

After sign-up or sign-in, the app should preserve the intended league continuation where possible, rather than forcing the user to restart the join flow.

## Invite-code states

Invite-code states must cover:

- valid invite;
- already a member;
- invalid code;
- expired code;
- full league;
- league deleted/closed;
- signed-out user who needs to continue after sign-in/sign-up.

Each state needs a user-safe explanation and one obvious recovery action.

## Invalid/expired/full league states

Invalid, expired and full league states should not look like app failures. They should explain the issue in plain English and direct the user to ask the league organiser/admin for a new invite or support.

Full league copy must respect recorded capacity decisions. It must not imply that wider public signup or unlimited leagues/users are open.

## League privacy explanation

League privacy explanation should make clear:

- private leagues show members in that league;
- Original Predictor and KO Predictor standings remain separate;
- Original predictions remain hidden until the global Original Predictor lock/release point;
- KO Predictor picks release fixture-by-fixture according to KO rules;
- league membership does not combine Original and KO points.

The privacy explanation must stay conservative and should not over-claim features that are not implemented.

## Empty league states

An empty league should not feel broken. It should show that the league exists, explain that members will appear after people join, and offer invite/share actions to the organiser where permitted.

Ordinary members should see a calm empty or low-member state without owner-only controls.

## Member list clarity

Member lists should distinguish organiser/admin cues, the current user, pending/empty states and visible member counts. Member list clarity should not expose private account details beyond what the app is designed to show.

Member list copy should keep Original Predictor and KO Predictor standings separate and avoid suggesting one combined winner unless a future stage explicitly implements a combined social view that does not alter scoring.

## Post-signup/post-login league continuation

When a user follows a league invite while signed out, the intended league should survive the sign-in/sign-up journey where technically possible. The continuation must not overwrite guest predictions, bypass the guest import prompt, or create hidden memberships without user confirmation.

If the continuation cannot be completed safely, the app should show clear copy and let the user enter the invite code again.

## League share/invite copy

League share/invite copy should be short, clear and mobile-friendly. It should explain that the recipient may need to sign in or request access depending on the signup gate state.

Public signup remains closed until implementation gates are complete. Invite copy must not imply that anyone with a link can register publicly until signup gates are actually implemented and approved.

## After-lock league joining

Joining a league after the Original Predictor lock should not remove valid pre-deadline prediction points. Copy should explain that existing eligible predictions can still count, while late or missing predictions do not become valid because of a league invite.

This rule must not merge Original Predictor and KO Predictor points.

## Safety and non-goals

This stage is docs/audit-only.

It does not change:

- runtime UI;
- routes;
- Auth configuration;
- Supabase schema, RPCs, RLS or service-role use;
- league membership writes;
- official result entry;
- scoring engine;
- resolver behaviour;
- fake-result writes;
- migrations.

Database remains at 18 active migrations. Migration 019 is not created.

Original Predictor and KO Predictor points remain separate.

## Acceptance evidence

Acceptance is the passing `audit:league-setup-invites` script and full `npm run check`.

Marker record: create league flow; join league flow; invite-code states; invalid/expired/full league states; league privacy explanation; post-signup/post-login league continuation; league share/invite copy; public signup remains closed until implementation gates are complete; Migration 019 remains blocked.
