/**
 * Presentation helpers for Home. Pure formatting and derivation — no data is
 * invented here, and nothing that lacks a source is guessed at.
 */

function dateFromValue(value) {
  return value ? new Date(String(value).includes('T') ? value : `${value}T12:00:00Z`) : null
}

export function formatKickoffTime(value, fallback = 'TBC') {
  const date = dateFromValue(value)
  if (!date || Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' })
    .format(date)
    .replace(' ', '')
}

export function formatKickoffDateTime(value, fallback = 'To be confirmed') {
  const date = dateFromValue(value)
  if (!date || Number.isNaN(date.getTime())) return fallback
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }).format(date)
  return `${day} · ${formatKickoffTime(value)}`
}

export function formatDayLabel(dayKey, fallback = 'Tomorrow') {
  const date = dateFromValue(dayKey)
  if (!date || Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'Europe/London' }).format(date)
}

export function formatRank(rank) {
  return rank ? `${rank}` : '—'
}

/** A dash, never a false zero, when the section behind a figure failed to load. */
export function formatPoints(points, dataAvailable = true) {
  return dataAvailable && Number.isFinite(Number(points)) ? `${Number(points)}` : '—'
}

/** Concise leader-gap storytelling per the Home contract. */
export function leaderGap({ isLeader, pointsBehindLeader }) {
  if (isLeader) return ' · Leading'
  return pointsBehindLeader > 0 ? ` · ${pointsBehindLeader} behind leader` : ''
}

/**
 * How a finished prediction turned out, derived from the predicted score and
 * the actual score alone.
 *
 * The re-cut prototype prints a per-match points chip ("Exact +5"). Home has no
 * per-match points source — the result columns carry none, and the model
 * refuses to invent them — so the outcome is told in words, which the data does
 * support, and the number is not fabricated.
 */
export function matchOutcome(card) {
  if (!card?.predictedScore || !card?.scoreLabel) return null
  const [predictedHome, predictedAway] = card.predictedScore.split('–').map(part => Number(part.trim()))
  const [actualHome, actualAway] = card.scoreLabel.split('–').map(part => Number(part.trim()))
  if (![predictedHome, predictedAway, actualHome, actualAway].every(Number.isFinite)) return null

  if (predictedHome === actualHome && predictedAway === actualAway) return 'exact'
  const sign = (home, away) => Math.sign(home - away)
  if (sign(predictedHome, predictedAway) === sign(actualHome, actualAway)) return 'result'
  return 'miss'
}

export const OUTCOME_NOTE = Object.freeze({
  exact: 'exact score',
  result: 'right result, wrong score',
  miss: 'not this time',
})

/** Counts for the post-match day summary, derived the same honest way. */
export function summariseDay(cards) {
  const counts = { exact: 0, result: 0, miss: 0 }
  for (const card of cards) {
    const outcome = matchOutcome(card)
    if (outcome) counts[outcome] += 1
  }
  return counts
}
