# Public Signup Controlled Open Contract

## Contract status

`STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1` records the runbook for the controlled public signup opening step.

The contract is not permission to open wider public registration. It exists so that the real opening action is deliberate, owner-approved and checked against the Euro 2028 deployment rather than inferred from earlier readiness work.

## Locked controlled-open markers

The stage must preserve these markers:

- controlled public signup opening runbook;
- owner approval must be explicit, current and recorded;
- opening-gate checklist must be satisfied before any public opening;
- email confirmation must be checked in the external account settings;
- account redirect URLs must return to the Euro 2028 app, not WC26;
- display-name moderation remains before account creation;
- display-name availability remains before account creation;
- support/contact route remains visible for public users;
- initial capacity remains 250 users and 20 leagues unless replaced by an owner decision;
- public registration remains closed until the owner completes the external opening action;
- no Supabase Auth dashboard/config change in the patch;
- No Migration 019.

## Opening runbook contract

A future opening stage may only proceed after the owner confirms:

- the target Euro 2028 deployment is correct;
- email confirmation is enabled;
- sign-up, sign-in and recovery redirects return to the Euro 2028 app;
- support/contact help is visible to public users;
- display-name moderation and availability checks run before account creation;
- first opening capacity remains within 250 users and 20 leagues or a new owner decision is recorded;
- no service-role key, admin secret or private credential is exposed to the browser;
- WC26 production remains blocked;
- explicit owner approval has been given for the real opening action.

## Non-change boundary

This contract is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema, RPC, RLS, service-role use, browser writes, scoring, resolver behaviour, result entry, fake-result writes, league writes or migrations.

Active migrations remain 18. Migration 019 must not be created unless a genuine schema/read-contract gap is proved and separately approved.
