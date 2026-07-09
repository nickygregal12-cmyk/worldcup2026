import { describe, expect, it } from 'vitest'
import {
  PREDICTION_STORAGE_TARGET,
  resolvePredictionStoragePolicy,
  writesToAccount,
} from '../predictionStoragePolicy.js'

describe('prediction storage policy', () => {
  it('writes a guest edit to the device', () => {
    const policy = resolvePredictionStoragePolicy({ signedIn: false, accountRows: 0, guestTouched: 3 })
    expect(policy.storageTarget).toBe(PREDICTION_STORAGE_TARGET.DEVICE)
    expect(writesToAccount(policy)).toBe(false)
    expect(policy.accountAuthoritative).toBe(false)
  })

  it('writes a signed-in edit to the account even with untouched guest storage', () => {
    const policy = resolvePredictionStoragePolicy({ signedIn: true, accountRows: 12, guestTouched: 0 })
    expect(writesToAccount(policy)).toBe(true)
    expect(policy.guestTransferMode).toBe(false)
  })

  // The regression. A signed-in account with zero saved rows plus one device pick used to route
  // every edit to localStorage, so accountRows never left 0, so the mode never cleared.
  it('never diverts a signed-in edit to the device, even with an empty account and device picks', () => {
    const policy = resolvePredictionStoragePolicy({ signedIn: true, accountRows: 0, guestTouched: 1 })
    expect(policy.storageTarget).toBe(PREDICTION_STORAGE_TARGET.ACCOUNT)
    expect(writesToAccount(policy)).toBe(true)
    expect(policy.accountAuthoritative).toBe(true)
  })

  it('still offers the guest import as a decision point in that same state', () => {
    const policy = resolvePredictionStoragePolicy({ signedIn: true, accountRows: 0, guestTouched: 1 })
    expect(policy.guestTransferMode).toBe(true)
    expect(policy.canOfferGuestImport).toBe(true)
  })

  it('refuses to offer a guest import once the account holds saved predictions', () => {
    const policy = resolvePredictionStoragePolicy({ signedIn: true, accountRows: 1, guestTouched: 51 })
    expect(policy.canOfferGuestImport).toBe(false)
    expect(policy.guestTransferMode).toBe(false)
    expect(policy.guestPicksStranded).toBe(true)
    expect(writesToAccount(policy)).toBe(true)
  })

  it('never offers an import to a signed-out visitor', () => {
    const policy = resolvePredictionStoragePolicy({ signedIn: false, accountRows: 0, guestTouched: 51 })
    expect(policy.canOfferGuestImport).toBe(false)
    expect(policy.guestTransferMode).toBe(false)
  })

  it('treats the account as authoritative for every signed-in combination', () => {
    for (const accountRows of [0, 1, 51]) {
      for (const guestTouched of [0, 1, 51]) {
        const policy = resolvePredictionStoragePolicy({ signedIn: true, accountRows, guestTouched })
        expect(writesToAccount(policy)).toBe(true)
        expect(policy.accountAuthoritative).toBe(true)
        // An import may never be offered against a non-empty account.
        if (accountRows > 0) expect(policy.canOfferGuestImport).toBe(false)
      }
    }
  })

  it('tolerates missing and non-numeric inputs', () => {
    expect(resolvePredictionStoragePolicy().storageTarget).toBe(PREDICTION_STORAGE_TARGET.DEVICE)
    const policy = resolvePredictionStoragePolicy({ signedIn: true, accountRows: undefined, guestTouched: Number.NaN })
    expect(writesToAccount(policy)).toBe(true)
    expect(policy.guestTransferMode).toBe(false)
  })
})
