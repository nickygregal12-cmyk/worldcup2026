import { describe, expect, it } from 'vitest'
import { createGuestPredictionState } from '../guestPredictionState.js'
import { createGuestPredictionStorage } from '../guestPredictionStorage.js'
import { buildGuestReference } from './fixtures.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
}

describe('guest browser storage', () => {
  it('saves and restores a valid guest state locally', () => {
    const reference = buildGuestReference()
    const storage = createGuestPredictionStorage({ storage: memoryStorage(), reference })
    const state = createGuestPredictionState(reference)

    expect(storage.save(state).status).toBe('saved')
    expect(storage.load()).toMatchObject({ status: 'ready', state })
    expect(storage.clear().status).toBe('cleared')
    expect(storage.load().status).toBe('empty')
  })

  it('fails closed for malformed local JSON', () => {
    const reference = buildGuestReference()
    const browserStorage = memoryStorage()
    const storage = createGuestPredictionStorage({ storage: browserStorage, reference })
    browserStorage.setItem(storage.key, '{bad json')

    expect(storage.load()).toMatchObject({ status: 'invalid', state: null })
  })

  it('reports unavailable browser storage without throwing', () => {
    const storage = createGuestPredictionStorage({ storage: null, reference: buildGuestReference() })

    expect(storage.available).toBe(false)
    expect(storage.load().status).toBe('unavailable')
  })

  it('reports quota or security errors from the browser storage adapter', () => {
    const reference = buildGuestReference()
    const storage = createGuestPredictionStorage({
      reference,
      storage: {
        getItem: () => null,
        setItem: () => { throw new Error('quota exceeded') },
        removeItem: () => {},
      },
    })

    expect(storage.save(createGuestPredictionState(reference))).toEqual({
      status: 'error',
      error: 'quota exceeded',
    })
  })
})
