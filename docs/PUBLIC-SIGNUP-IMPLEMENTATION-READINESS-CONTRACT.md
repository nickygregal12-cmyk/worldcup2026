# PUBLIC SIGNUP IMPLEMENTATION READINESS CONTRACT

## Purpose

This contract records the final readiness target before public signup can be implemented for Euro 2028 Predictor. It is a docs/audit-only contract. It does not open public signup and does not change Auth configuration.

## Scope markers

The implementation readiness target must cover:

- public signup gates mapped to owner decisions;
- email confirmation ON expectations;
- support/contact-admin flow;
- 250-user / 20-league capacity guardrails;
- conservative privacy wording;
- display-name moderation expectations;
- low-cost/free hosting assumptions;
- exact “still closed until implementation” wording;
- explicit checks before any Auth config change;
- public signup remains closed until implementation gates are complete;

## Owner decisions mapped

The public signup gates must be mapped to the recorded owner decisions:

- signups are intended to move beyond invite-only only after implementation gates are complete;
- email confirmation ON expectations must be preserved before any public registration change;
- support/contact-admin flow must exist before a wider audience can rely on the app;
- 250-user / 20-league capacity guardrails are the launch planning assumption;
- conservative privacy wording must be used until exact infrastructure claims are confirmed;
- display-name moderation expectations must be implemented before wider public signup;
- low-cost/free hosting assumptions must be monitored before expanding usage.

## Required implementation checks before any Auth config change

Before any future stage changes Auth configuration or opens public signup, the implementation must check and record:

1. the exact Supabase project is the Euro staging/development project, not WC26 production;
2. email confirmation ON expectations are still the intended behaviour;
3. redirect URLs and password-recovery URLs point to the Euro 2028 deployment;
4. the support/contact-admin route or route-equivalent content is visible to signed-out and signed-in users;
5. privacy wording does not claim a specific data region unless confirmed;
6. display-name moderation expectations are implemented or the public gate remains closed;
7. 250-user / 20-league capacity guardrails are still acceptable on the current hosting/Supabase tier;
8. public signup remains closed until implementation gates are complete is shown anywhere users might expect open registration;
9. no service-role key, private admin key or seeded/synthetic account detail is exposed to the browser;
10. no Migration 019 is introduced unless a real schema/read-contract gap is proved and approved.

## User-facing wording target

The product should clearly say that public signup remains closed until implementation gates are complete. It should not imply that email/password registration is open until the actual implementation has been scoped, tested and deliberately enabled.

The support/contact-admin flow should give a calm route for users who need help joining, recovering access, correcting a profile issue or asking about deletion. It must not imply that support can secretly bypass security or see private predictions before the relevant lock/release rule.

## Capacity and privacy target

The first public readiness target is small and controlled: 50 users and 20 leagues before the branded email sender is added. This is a launch planning guardrail, not a promise of unlimited scale.

Privacy wording must stay conservative. It can explain account data, display name, league membership, predictions, scores and support/deletion request information, but it must not invent exact data-region or retention claims.

## Safety boundaries

- No runtime UI change in this stage.
- No route change in this stage.
- No Auth configuration change in this stage.
- No Supabase schema, RPC, RLS, service-role or browser write change.
- No scoring engine change.
- No resolver behaviour change.
- No official result-entry change.
- No fake-result writes.
- No league writes.
- No Migration 019.

## Acceptance target for a future implementation stage

A later implementation stage may only claim public-signup readiness if it proves that the public gate wording, support/contact-admin flow, capacity guardrails, email confirmation ON expectations, privacy wording, display-name moderation expectations and exact checks before any Auth config change are live and verified.

Until then, public signup remains closed until implementation gates are complete.
