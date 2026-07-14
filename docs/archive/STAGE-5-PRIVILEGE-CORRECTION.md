# Stage 5 — Linked function privilege correction

## Reason

Migration 006 passed locally but one linked pgTAP assertion showed that the hosted Euro staging project granted `EXECUTE` on the profile rename RPC to `anon`.

The linked project uses older Supabase default privileges that can explicitly grant new `public` functions to browser roles. Revoking only `PUBLIC` therefore did not remove the role-specific `anon` grant.

## Correction

Migration `202607010007_euro28_auth_function_privileges.sql`:

- revokes browser-role execution from internal trigger and validation functions;
- grants display-name availability only to `anon` and `authenticated`;
- grants profile rename only to `authenticated`;
- revokes execution from `anon` for the rename RPC;
- changes future `postgres` function defaults in `public` to require explicit browser grants.

It does not alter profile data, prediction storage, guest state, leagues, scoring, results or the WC26 environment.

## Verification

The Stage 5 pgTAP file now contains 39 checks, including:

- anonymous users cannot execute the rename RPC;
- authenticated users can execute the rename RPC;
- internal profile functions are not browser-callable;
- availability remains callable by the intended roles;
- newly created `postgres` functions do not automatically grant execution to `anon` or `authenticated`.

Run:

```bash
npm run test:db:005:local
npm run test:db:006:local
npm run test:db:005:linked
npm run test:db:006:linked
```

## Separate hosted scoring correction

The later linked Migration 005 rerun found an unrelated hosted data drift: the provisional group-stage joker cap was `8`. Migration 008 corrects that value separately and does not change the function privilege work recorded here.
