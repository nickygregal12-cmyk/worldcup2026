# Stage 13G-ACCOUNT-1 — Account destination rebuild

Status: implemented pending local/deployed acceptance.

This stage implements the approved Account reference prototype as a focused destination rebuild after Stage 13G destination reference adoption. It does not include Admin, Match Centre or Tournament/How to Play work.

## Scope

- Rebuild the signed-in `#/account` state in `src/auth/AccountAccess.jsx`.
- Keep the existing display-name update, password-reset and sign-out service behaviour.
- Add an identity header with display initial, display name and private email summary.
- Add read-only quick stats: leagues joined, group scores saved and group jokers armed.
- Move the guest transfer surface out of the persistent Account page and into a one-time post sign-in/sign-up dialog path.
- Amend Stage 13G-C1 guest-transfer copy to: `Keep your predictions from this device?` and `Keep these predictions`.
- Add Security & preferences rows for change password, Match reminders coming soon and Daily points update coming soon.
- Add a Leagues shortcut row linking to `#/leagues`.
- Add a Danger zone with sign out plus `Clear my predictions` before the Original Predictor lock.
- Retire dead legacy `src/pages/Profile.jsx` after confirming the real Account route renders `src/auth/AccountAccess.jsx`.

## Clear my predictions contract

The clear action is available only before the central Original Predictor lock as derived from `resolveTournamentLifecycle()`. It clears Original Predictor group scores and pre-tournament bracket picks by saving an empty Original Predictor bundle through the existing atomic save RPC. It does not touch KO Predictor entries, leagues, account identity or guest device storage. No migration is added.

## Boundaries

- Active migrations remain 18.
- No Migration 019.
- No new scoring logic.
- No resolver change.
- No Account route change.
- No push-notification implementation.
- Account/Admin/Match Centre later batches remain separate.

## Deployed close-out

Closed at `734ad9b Rebuild Stage 13G account destination` on `euro28-development`. Post-deploy `npm run verify:foundation-page` passed. Active migrations remain 18 and no Migration 019 was created.

The expanded 2026-07-05 prompt repeats the guest-transfer modal requirement; this is already implemented by this stage as a one-time post sign-in/sign-up keep/start-fresh dialog. The visual modal prototype is now recorded under `docs/reference-prototypes/euro28-guest-transfer-modal-prototype.html` for future comparison, not as a new Account rebuild request.
