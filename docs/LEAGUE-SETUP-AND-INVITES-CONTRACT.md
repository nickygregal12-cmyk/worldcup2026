# Euro 2028 Predictor — League Setup and Invites Contract

Status: recorded for `STAGE-LEAGUE-SETUP-AND-INVITES-1`.
Type: product contract / implementation target.
Scope: docs/audit-only. This contract does not change runtime UI, routes, Auth configuration, Supabase writes, league membership writes, result entry, scoring, resolver behaviour or migrations.

## Purpose

League setup and invites should make private leagues easy to create, easy to join and easy to understand without weakening the app's privacy, signup, scoring or competition boundaries.

The flow should support casual mobile users. It should avoid dead-end invite links, confusing code errors and unclear privacy states.

## create league flow

The create league flow should ask only for essentials first: league name, confirmation of private league behaviour, and the next action after creation.

A successful create state should clearly offer copy invite code/link, share invite, or open the league. The create flow should not expose Supabase IDs, raw database state or admin-only controls.

A private league is a shared member list for league context, but Original Predictor and KO Predictor standings remain separate competitions.

## join league flow

The join league flow should accept an invite code/link and present a clear state. It should support a signed-out user reaching the join screen, understanding what the invite is for, and then continuing after sign-in/sign-up where safe.

Joining should require the correct account flow unless a future approved implementation creates a safe guest-membership model. Join codes do not bypass signup/auth gates.

The flow should not silently add a membership after a sign-in/sign-up redirect without the user understanding what is happening.

## invite-code states

The invite-code states that must be modelled are:

- valid invite;
- already a member;
- invalid code;
- expired code;
- full league;
- league deleted/closed;
- signed-out user who needs to continue after sign-in/sign-up.

Each state should include plain-English copy and one obvious next action.

## invalid/expired/full league states

Invalid/expired/full league states must not look like app crashes. They should tell the user whether the issue is the code, the invite expiry, league capacity, or league availability.

The recovery path should normally be contact the organiser/admin, request a new invite, return to leagues, or try another code.

Full league copy must respect the recorded user/league capacity decisions and must not imply unlimited public access.

## league privacy explanation

The league privacy explanation must say:

- private leagues show the relevant league member list;
- Original Predictor and KO Predictor standings remain separate;
- Original predictions are hidden until the global Original Predictor lock/release point;
- KO Predictor picks release fixture-by-fixture according to KO rules;
- league membership does not combine Original and KO points;
- joining a league does not make late predictions valid.

Privacy wording should be conservative and should not over-claim export, deletion, notification, moderation or support tooling that is not implemented.

## empty league states

Empty league states should reassure users that the league exists. Organisers should get an invite/share call to action. Ordinary members should see a calm state explaining that members will appear after people join.

Empty states should not expose owner-only controls to ordinary members.

## member list clarity

Member list clarity should cover the current user, organiser/admin cues, visible member counts, pending/empty states and competition-scoped standings. It must not expose private account details beyond the designed display name/profile surface.

The member list should not imply that one combined Original + KO score exists. It can offer competition toggles or separate contexts, but the underlying points remain separate.

## post-signup/post-login league continuation

A league invite followed while signed out should preserve the intended league continuation where technically safe. After sign-up or sign-in, the user should be returned to the join confirmation or league destination.

This continuation must not skip the guest import prompt, overwrite browser predictions, or create hidden memberships without user confirmation.

If the continuation cannot be safely preserved, the app should explain that and ask the user to enter the invite code again.

## league share/invite copy

League share/invite copy should be short and mobile-friendly. It should tell recipients that they may need to sign in or request access depending on the signup gate state.

Public signup remains closed until implementation gates are complete. Invite links must not imply that public registration is open until it has been explicitly implemented, audited and approved.

## after-lock joining

Joining a league after lock should not remove valid pre-deadline prediction points. Existing eligible predictions may count in the league, but a late league invite must not backdate or create valid predictions.

This rule is social/visibility behaviour only. It must not combine Original Predictor and KO Predictor totals.

## Safety boundaries

This contract preserves these hard boundaries:

- no Migration 019;
- no Auth configuration change;
- no Supabase schema, RPC, RLS or service-role change;
- no league membership writes in this recording stage;
- no runtime UI or route implementation in this recording stage;
- no scoring or resolver changes;
- no official result-entry changes;
- no fake-result writes;
- public signup remains closed until implementation gates are complete;
- Original Predictor and KO Predictor points remain separate.

## Implementation note

A later implementation stage may build the create/join/invite surfaces from this contract. That later stage must prove any required route, model, membership or persistence changes explicitly, preserve signup gates, and include acceptance coverage for all invite-code states.

Marker record: create league flow; join league flow; invite-code states; invalid/expired/full league states; league privacy explanation; empty league states; member list clarity; post-signup/post-login league continuation; league share/invite copy; public signup remains closed until implementation gates are complete; Migration 019 remains blocked.
