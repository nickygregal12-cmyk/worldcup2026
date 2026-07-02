# Euro 2028 staging administrator access

This procedure grants and revokes explicit tournament administrator access for product-owner testing on **Euro staging only**.

## Fixed boundaries

- Permitted project ref: `gcfdwobpnanjchcnvdco`.
- Tournament code: `euro-2028`.
- Product-owner test role: `owner`.
- Browser self-grant remains impossible.
- The tooling does not connect to Supabase and never requests or stores a service-role key.
- Grant and revoke operations use the existing service-managed database function and append an immutable admin operation event.
- No account is granted access silently. The target email, role and audit note must be supplied explicitly.

The Supabase Dashboard SQL Editor runs database queries through the database's privileged server-side SQL path. This is deliberately separate from the public browser application.

## Before granting access

1. Confirm the user has already created and verified their staging account.
2. Confirm the repository is on `euro28-development`, clean, and linked to `gcfdwobpnanjchcnvdco`.
3. Create and verify a fresh application database backup.
4. Confirm the Supabase Dashboard URL contains project ref `gcfdwobpnanjchcnvdco` before opening the SQL Editor.

Recommended product-owner account:

```text
nickygregal12@gmail.com
```

Use the actual staging sign-in email if it differs. Never guess an account address.

## Generate the grant SQL

```bash
cd ~/Desktop/euro28predictor

npm run admin:staging:sql -- \
  --action grant \
  --email nickygregal12@gmail.com \
  --role owner \
  --note "Explicit product-owner staging owner grant for Stage 13 testing" \
  --output /tmp/euro28-staging-admin-grant.sql

cat /tmp/euro28-staging-admin-grant.sql
```

Review the complete SQL file. It must name:

- project ref `gcfdwobpnanjchcnvdco` in the header;
- tournament code `euro-2028`;
- the intended account email;
- role `owner`;
- the exact audit note.

The script refuses to write generated SQL inside the repository.

## Run the grant

1. Open the Supabase Dashboard project `gcfdwobpnanjchcnvdco`.
2. Open **SQL Editor** and create a new query.
3. Paste the reviewed contents of `/tmp/euro28-staging-admin-grant.sql`.
4. Read the target email, tournament and role again.
5. Run the query once.

The query stops without changing anything unless it finds exactly one `euro-2028` tournament and exactly one Auth user matching the email.

A successful result shows:

- `tournament_code = euro-2028`;
- the correct account email;
- `admin_role = owner`;
- `is_active = true`;
- a recent `admin_granted` event with the supplied note.

Do not rerun the grant merely because the page is slow. First use the verification query below.

## Verify independently

Generate read-only verification SQL:

```bash
cd ~/Desktop/euro28predictor

npm run admin:staging:sql -- \
  --action verify \
  --email nickygregal12@gmail.com \
  --output /tmp/euro28-staging-admin-verify.sql

cat /tmp/euro28-staging-admin-verify.sql
```

Run the reviewed verification SQL in the same Euro staging SQL Editor. It performs no mutation.

Then verify through the application:

1. Sign out of the staging site.
2. Sign back in with the granted account.
3. Open **More → Admin**.
4. Confirm the control room loads and identifies the role as `owner`.
5. Do not apply the irreversible global lock or change feature controls merely to test access.

## Revoke access

Generate revocation SQL only when access should be removed:

```bash
cd ~/Desktop/euro28predictor

npm run admin:staging:sql -- \
  --action revoke \
  --email nickygregal12@gmail.com \
  --note "Revoke product-owner staging admin access after testing" \
  --output /tmp/euro28-staging-admin-revoke.sql

cat /tmp/euro28-staging-admin-revoke.sql
```

Review it, confirm project ref `gcfdwobpnanjchcnvdco`, then run it once in the Euro staging SQL Editor.

A successful result shows:

- the correct account email;
- `is_active = false`;
- a recent `admin_revoked` event;
- the supplied revocation note.

Sign out and back in afterwards. **More → Admin** must then show that the account has no administrator access.

## Audit interpretation

`private.euro28_set_tournament_admin` records grant and revoke events in the append-only `public.admin_operation_events` table. When the operation is run from the Dashboard SQL Editor, `performed_by_user_id` is intentionally `null` because the Dashboard operator is not being impersonated as an app user. The explicit note and target user remain recorded. Do not pass the target account as the granting account merely to populate that field; that would create a misleading self-grant audit record.

## Restrictions

- Never expose or paste a service-role key.
- Never add an admin-grant button to the browser application.
- Never edit `private.tournament_admins` directly when the audited function is available.
- Never run the SQL against any project other than `gcfdwobpnanjchcnvdco`.
- Never grant an account without an explicit request, target email, role and audit note.
- Never test owner-only controls by applying the irreversible tournament lock.
