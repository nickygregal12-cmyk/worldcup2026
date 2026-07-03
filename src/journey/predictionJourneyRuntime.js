import { buildGuestReviewStorageKey } from './predictionJourneyModel.js'

export function browserStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}


export function messageForError(error) {
  const message = error?.message ?? String(error)
  if (/revision is stale/i.test(message)) return 'These predictions changed in another session. Reload the account draft before editing again.'
  if (/globally locked/i.test(message) || /global lock/i.test(message)) return 'Prediction content is locked for the tournament.'
  if (/joker cap/i.test(message)) return 'The configured joker limit has been reached.'
  if (/guest import cannot overwrite/i.test(message)) return 'This account already contains predictions, so the browser draft was not imported.'
  return message
}

export function readGuestReview(reference) {
  const storage = browserStorage()
  if (!storage) return false
  try {
    return storage.getItem(buildGuestReviewStorageKey(reference)) === 'review'
  } catch {
    return false
  }
}

export function writeGuestReview(reference, reviewMode) {
  const storage = browserStorage()
  if (!storage) return
  try {
    const key = buildGuestReviewStorageKey(reference)
    if (reviewMode) storage.setItem(key, 'review')
    else storage.removeItem(key)
  } catch {
    // Review mode is a convenience only; the prediction draft remains safe.
  }
}
