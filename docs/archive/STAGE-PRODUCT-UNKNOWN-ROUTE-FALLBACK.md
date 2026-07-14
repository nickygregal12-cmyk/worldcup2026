> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage PRODUCT-UNKNOWN-ROUTE-1 — Unknown route fallback

## Status

Implemented as a product-completeness recovery slice.

Unknown app hashes now render a friendly recovery screen instead of silently falling through to Home.

The fallback confirms that predictions have not been changed and gives safe recovery links to Home, Groups and How to Play.

Invalid Admin sections remain inside the protected Admin route recovery path.

## Scope

This slice covers route recovery, shared copy, tests, documentation and audit coverage only.

No scoring changes.

No resolver changes.

No prediction-save changes.

No Supabase writes.

No service-role use.

No user creation.

No prediction seeding.

No migration.

## Safety

No Supabase writes are introduced by this slice.

Original Predictor and KO Predictor remain separate.

Original Predictor points and KO Predictor points must never combine.

Predicted bracket context and live bracket context must never blend.

WC26 production and main remain untouched.

## Database

Active migrations remain 18.

Migration 018 remains the latest active migration.

Migration 019 is not created.

This slice does not prove a schema or read-contract gap.

## Acceptance

Local gates:

- npm run audit:unknown-route-fallback
- npm run check

Browser checks:

- #/not-a-route shows the friendly fallback screen.
- Home, Groups and How to Play recovery links work.
- #/admin?section=not-real still recovers inside Admin.
- #/groups, #/bracket and #/how-to-play still work normally.
