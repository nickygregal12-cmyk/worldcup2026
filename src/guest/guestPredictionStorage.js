import { buildGuestStorageKey } from './guestPredictionConfig.js'
import { upgradeLegacyGuestPredictionState, validateGuestPredictionState } from './guestPredictionState.js'

function storageAvailable(storage) {
  return storage &&
    typeof storage.getItem === 'function' &&
    typeof storage.setItem === 'function' &&
    typeof storage.removeItem === 'function'
}

export function createGuestPredictionStorage({ storage, reference }) {
  const key = buildGuestStorageKey(reference)
  if (!storageAvailable(storage)) {
    return {
      key,
      available: false,
      load: () => ({ status: 'unavailable', state: null, error: 'Browser storage is unavailable.' }),
      save: () => ({ status: 'unavailable', error: 'Browser storage is unavailable.' }),
      clear: () => ({ status: 'unavailable', error: 'Browser storage is unavailable.' }),
    }
  }

  return {
    key,
    available: true,
    load() {
      try {
        const raw = storage.getItem(key)
        if (!raw) return { status: 'empty', state: null, error: null }
        const parsed = JSON.parse(raw)
        const state = upgradeLegacyGuestPredictionState(parsed, reference)
        const validation = validateGuestPredictionState(state, reference)
        if (!validation.valid) {
          return { status: 'invalid', state: null, error: validation.errors.join('; ') }
        }
        return { status: 'ready', state, error: null }
      } catch (error) {
        return {
          status: 'invalid',
          state: null,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },
    save(state) {
      const validation = validateGuestPredictionState(state, reference)
      if (!validation.valid) return { status: 'invalid', error: validation.errors.join('; ') }
      try {
        storage.setItem(key, JSON.stringify(state))
        return { status: 'saved', error: null }
      } catch (error) {
        return { status: 'error', error: error instanceof Error ? error.message : String(error) }
      }
    },
    clear() {
      try {
        storage.removeItem(key)
        return { status: 'cleared', error: null }
      } catch (error) {
        return { status: 'error', error: error instanceof Error ? error.message : String(error) }
      }
    },
  }
}
