// Where a prediction edit is written, and whether device picks may still be offered for import.
//
// The rule this encodes, in order of authority:
//
//   1. Once signed in, the account is the ONLY write target. A signed-in edit is never written to
//      device storage, whatever guest picks happen to sit in this browser.
//   2. Guest picks never take priority over, and never overwrite, an account's saved picks. They
//      may only be *offered* for import, and only while the account holds no predictions.
//   3. The offer is a decision point (keep or discard), never an implicit adoption.
//
// This used to be inlined in PredictionJourney.jsx as `guestTransferMode`, which was then used as
// the storage selector. That deadlocked: a signed-in account with zero saved rows plus one device
// pick routed every edit to localStorage, so the account never gained a row, so the mode never
// cleared. `guestTransferMode` survives here as an *offer* flag only — it must not gate the write.

export const PREDICTION_STORAGE_TARGET = Object.freeze({
  ACCOUNT: 'account',
  DEVICE: 'device',
})

export function resolvePredictionStoragePolicy({ signedIn = false, accountRows = 0, guestTouched = 0 } = {}) {
  const rows = Number.isFinite(accountRows) ? accountRows : 0
  const touched = Number.isFinite(guestTouched) ? guestTouched : 0
  const accountHasPredictions = rows > 0

  return Object.freeze({
    // Rule 1: signed in means account, always.
    storageTarget: signedIn ? PREDICTION_STORAGE_TARGET.ACCOUNT : PREDICTION_STORAGE_TARGET.DEVICE,
    // Rule 2: the account wins the moment there is a session.
    accountAuthoritative: signedIn,
    // Rule 3: an offer, not a redirect. Only while the account is still empty.
    guestTransferMode: signedIn && !accountHasPredictions && touched > 0,
    // Import may never clobber saved account rows.
    canOfferGuestImport: signedIn && !accountHasPredictions && touched > 0,
    guestPicksStranded: signedIn && accountHasPredictions && touched > 0,
  })
}

export function writesToAccount(policy) {
  return policy?.storageTarget === PREDICTION_STORAGE_TARGET.ACCOUNT
}
