import { afterEach, describe, expect, it } from 'vitest'
import {
  GROUPS_DATE_TABLES_COPY,
  PREDICTION_ACCOUNT_SAVE_UNAVAILABLE,
  PREDICTION_AUTOSAVE_NOTICE,
  PREDICTION_BRACKET_JOKERS_COPY,
  PREDICTION_GROUP_JOKERS_COPY,
  PREDICTION_LOCK_NOTICE,
  PREDICTION_SAVE_CHECK_COPY,
} from '../predictionJourneyCopy.js'
import {
  browserStorage,
  messageForError,
  readGuestReview,
  writeGuestReview,
} from '../predictionJourneyRuntime.js'

const originalLocalStorage = globalThis.localStorage

function referenceFixture() {
  return Object.freeze({
    tournamentId: 'euro2028',
    referenceVersion: 'test-v1',
    groupMatches: [],
    knockoutMatches: [],
  })
}

function installMemoryStorage({ throws = false } = {}) {
  const data = new Map()
  const storage = {
    getItem: key => {
      if (throws) throw new Error('storage unavailable')
      return data.get(key) ?? null
    },
    setItem: (key, value) => {
      if (throws) throw new Error('storage unavailable')
      data.set(key, String(value))
    },
    removeItem: key => {
      if (throws) throw new Error('storage unavailable')
      data.delete(key)
    },
  }

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  })

  return storage
}

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  })
})

describe('Groups player-facing copy', () => {
  it('keeps the replacement copy plain and free from internal contract wording', () => {
    const visibleCopy = [
      GROUPS_DATE_TABLES_COPY,
      PREDICTION_AUTOSAVE_NOTICE,
      PREDICTION_LOCK_NOTICE,
      PREDICTION_GROUP_JOKERS_COPY,
      PREDICTION_BRACKET_JOKERS_COPY,
      PREDICTION_SAVE_CHECK_COPY,
      PREDICTION_ACCOUNT_SAVE_UNAVAILABLE,
    ].join(' ')

    expect(visibleCopy).toContain('Each match card shows its group')
    expect(visibleCopy).toContain('Your account picks save automatically while you edit')
    expect(visibleCopy).toContain('5 group jokers available')
    expect(visibleCopy).not.toContain('euro28-prediction-journey-v3')
    expect(visibleCopy).not.toContain('atomic saving')
    expect(visibleCopy).not.toContain('central provisional Euro 2028 lock configuration')
    expect(visibleCopy).not.toContain('irreversible tournament lock')
  })
})

describe('predictionJourneyRuntime', () => {
  it('maps known account-save errors to player-facing messages', () => {
    expect(messageForError(new Error('revision is stale'))).toBe('These predictions changed in another session. Reload the account draft before editing again.')
    expect(messageForError(new Error('globally locked'))).toBe('Prediction content is locked for the tournament.')
    expect(messageForError(new Error('global lock'))).toBe('Prediction content is locked for the tournament.')
    expect(messageForError(new Error('joker cap exceeded'))).toBe('The configured joker limit has been reached.')
    expect(messageForError(new Error('guest import cannot overwrite existing account rows'))).toBe('This account already contains predictions, so the device draft was not imported.')
    expect(messageForError(new Error('Something else'))).toBe('Something else')
    expect(messageForError('Plain failure')).toBe('Plain failure')
  })

  it('reads and writes the guest review preference without exposing storage failures', () => {
    const reference = referenceFixture()
    const storage = installMemoryStorage()

    expect(browserStorage()).toBe(storage)
    expect(readGuestReview(reference)).toBe(false)

    writeGuestReview(reference, true)
    expect(readGuestReview(reference)).toBe(true)

    writeGuestReview(reference, false)
    expect(readGuestReview(reference)).toBe(false)
  })

  it('treats unavailable browser storage as an optional convenience only', () => {
    const reference = referenceFixture()
    installMemoryStorage({ throws: true })

    expect(readGuestReview(reference)).toBe(false)
    expect(() => writeGuestReview(reference, true)).not.toThrow()
  })
})
