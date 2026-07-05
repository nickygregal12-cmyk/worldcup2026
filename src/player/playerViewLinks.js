export function normalisePlayerViewCompetition(value) {
  return value === 'ko_predictor' || value === 'koPredictor' ? 'ko_predictor' : 'original'
}

export function buildPlayerViewHref({ userId, competitionKey } = {}) {
  const params = new URLSearchParams()
  if (userId) params.set('user', userId)
  params.set('competition', normalisePlayerViewCompetition(competitionKey))
  return `#/player?${params.toString()}`
}

export function openPlayerView({ userId, competitionKey } = {}) {
  const href = buildPlayerViewHref({ userId, competitionKey })
  if (globalThis.location) globalThis.location.hash = href
  return href
}
