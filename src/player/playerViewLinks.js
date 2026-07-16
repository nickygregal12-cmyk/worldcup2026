export function normalisePlayerViewCompetition(value) {
  return value === 'ko_predictor' || value === 'koPredictor' ? 'ko_predictor' : 'original'
}

const PLAYER_VIEW_TABS = new Set(['predictions', 'bracket', 'tables', 'points', 'headToHead'])

export function normalisePlayerViewTab(value) {
  return PLAYER_VIEW_TABS.has(value) ? value : 'predictions'
}

export function buildPlayerViewHref({ userId, competitionKey, tab = 'predictions' } = {}) {
  const params = new URLSearchParams()
  if (userId) params.set('user', userId)
  params.set('competition', normalisePlayerViewCompetition(competitionKey))
  const normalisedTab = normalisePlayerViewTab(tab)
  if (normalisedTab !== 'predictions') params.set('tab', normalisedTab)
  return `#/player?${params.toString()}`
}

export function openPlayerView({ userId, competitionKey, tab } = {}) {
  const href = buildPlayerViewHref({ userId, competitionKey, tab })
  if (globalThis.location) globalThis.location.hash = href
  return href
}
