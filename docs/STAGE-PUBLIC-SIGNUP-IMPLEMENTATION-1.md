# STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1

Status: ready for local acceptance.

## Scope

This stage implements the first public-signup safety guard without opening wider public registration. It is a source/test/docs/audit implementation slice.

Recorded implementation points:

- client-side pre-Auth display-name moderation
- existing display-name availability RPC check remains before Auth sign-up
- email confirmation success copy remains aligned with confirmed-email behaviour
- support/contact-admin and privacy gate copy remains visible in the Rules Hub
- public registration remains closed until external Auth/config checks are confirmed

## Guardrails

- Public signup remains closed after this stage
- No Supabase Auth dashboard/config change is made by this patch
- No Supabase schema, RPC, RLS, service-role or browser write change
- No official result-entry change
- No fake-result writes
- No league writes
- No scoring engine change
- No resolver change
- No Migration 019

## Acceptance

Run:

```bash
npm run audit:public-signup-implementation
npm run check
```

The audit must prove moderation happens before the Auth sign-up call, public opening remains false, active migrations remain 18 and no Migration 019 exists.
