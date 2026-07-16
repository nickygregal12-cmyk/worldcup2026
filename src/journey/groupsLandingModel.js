const LIVE_STATUSES = new Set(['live', 'paused'])
const FINISHED_STATUSES = new Set(['completed', 'abandoned'])

function instant(match) {
  const raw = match.kickoffAt ?? match.scheduledDate
  if (!raw) return null
  const value = String(raw).includes('T') ? raw : `${raw}T12:00:00Z`
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

function byInstantThenNumber(left, right) {
  const leftTime = instant(left) ?? Number.POSITIVE_INFINITY
  const rightTime = instant(right) ?? Number.POSITIVE_INFINITY
  return leftTime - rightTime || left.matchNumber - right.matchNumber
}

/** Live first, otherwise the next fixture, otherwise the most recent result. */
export function relevantGroupMatch(reference, now = new Date()) {
  const matches = reference?.groupMatches ?? []
  if (matches.length === 0) return null

  const live = matches.filter(match => LIVE_STATUSES.has(match.status)).sort(byInstantThenNumber)
  if (live.length > 0) return live[0]

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const future = matches
    .filter(match => !FINISHED_STATUSES.has(match.status) && (instant(match) ?? Number.POSITIVE_INFINITY) >= nowMs)
    .sort(byInstantThenNumber)
  if (future.length > 0) return future[0]

  const finished = matches
    .filter(match => FINISHED_STATUSES.has(match.status) || match.resultStatus === 'confirmed')
    .sort((left, right) => byInstantThenNumber(right, left))
  return finished[0] ?? [...matches].sort(byInstantThenNumber)[0]
}
