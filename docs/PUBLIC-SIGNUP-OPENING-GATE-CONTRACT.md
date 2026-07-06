# Public Signup Opening Gate Contract

## Contract status

`STAGE-PUBLIC-SIGNUP-OPENING-GATE-1` is the final written gate before any true public registration opening stage.

The contract records the opening checklist, owner approval requirement and non-change boundary. It is not permission to open wider public registration.

## Locked gate markers

The stage must preserve these markers:

- final pre-open checklist for public signup;
- visible “registration still closed / opening soon” state;
- explicit owner approval requirement before opening registration;
- confirmation that email confirmation is ON;
- confirmation redirect URLs are correct;
- confirmation capacity limits are acceptable;
- confirmation support/contact route is ready;
- confirmation display-name moderation is active;
- no Supabase Auth dashboard/config change in the patch;
- public registration remains closed;
- No Migration 019.

## Opening approval checklist

The next stage must not open public registration unless the owner has explicitly approved the action after checking:

- account email confirmation is enabled;
- sign-up, sign-in and recovery redirects return to the Euro 2028 app;
- support/contact route or route-equivalent content is ready for public users;
- 250-user / 20-league capacity is still acceptable, or a new owner decision is recorded;
- display-name moderation is active before account creation;
- display-name availability is checked before account creation;
- privacy wording avoids unsupported infrastructure or region claims;
- WC26 production remains blocked;
- no service-role key or private admin credential is exposed to the browser.

## Non-change boundary

This contract is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema, RPC, RLS, service-role use, browser writes, scoring, resolver behaviour, result entry, fake-result writes, league writes or migrations.

Active migrations remain 18. Migration 019 must not be created unless a genuine schema/read-contract gap is proved and separately approved.
