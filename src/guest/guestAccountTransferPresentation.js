export function browserStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function messageForError(error) {
  const message = error instanceof Error ? error.message : String(error)
  if (/guest import cannot overwrite/i.test(message)) return 'This account already contains Original Predictor entries, so the device copy was left untouched.'
  if (/globally locked|global lock/i.test(message)) return 'The Original Predictor is locked, so the device copy cannot be kept.'
  if (/revision/i.test(message)) return 'The account changed while the import was running. Reload and try again.'
  return message
}

export function originalStatus(snapshot) {
  if (snapshot.accountOriginal) return 'Account entries already exist'
  if (snapshot.originalCompleteness.readyForAccountImport) return 'Ready to keep'
  return 'Finish the draft before keeping'
}

export function koStatus(snapshot) {
  if (snapshot.accountKo) return 'Account entries already exist'
  if (snapshot.koSummary.complete > 0) return 'Ready to keep'
  return 'Finish one available fixture before keeping'
}

export function importButtonDisabled(snapshot, busy) {
  return Boolean(busy || !snapshot.transferable)
}

export function hasOriginalTransferContent(snapshot) {
  return Boolean(snapshot.hasOriginal)
}

export function hasKoTransferContent(snapshot) {
  return Boolean(snapshot.hasKo)
}

export function formatOriginalProgress(snapshot) {
  return `${snapshot.originalCompleteness.complete}/51 complete`
}

export function formatKoProgress(snapshot) {
  return `${snapshot.koSummary.complete}/${snapshot.koSummary.available} available fixtures complete`
}

export function shouldShowOriginalContinue(snapshot) {
  return Boolean(!snapshot.originalCompleteness.readyForAccountImport && !snapshot.accountOriginal)
}

export function shouldShowKoContinue(snapshot) {
  return Boolean(snapshot.koSummary.complete === 0 && !snapshot.accountKo)
}

export function noticeRole(notice) {
  return notice?.tone === 'danger' ? 'alert' : 'status'
}
