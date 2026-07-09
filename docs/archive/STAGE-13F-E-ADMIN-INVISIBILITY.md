> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13F-E — Admin invisibility

Checkpoint: `4532b99`

This batch removes every ordinary-user discovery path to tournament administration while preserving the complete control room for server-verified administrators.

## Accepted behaviour

- Admin appears in More only after `get_my_tournament_admin_access` confirms the signed-in user is an administrator.
- Signed-out users, ordinary signed-in users and failed permission checks never receive an Admin navigation item.
- A direct `#/admin` visit fails closed through neutral checking, signed-out, denied or verification-error states.
- The normal page title and navigation do not advertise the Admin destination while access is unverified or denied.
- Verified administrators retain direct route access and the existing audited control-room operations.
- Client state never grants access; the existing server-authorised RPC remains the source of truth.

No database, role model, privilege, scoring, lock or tournament invariant changes are included.
