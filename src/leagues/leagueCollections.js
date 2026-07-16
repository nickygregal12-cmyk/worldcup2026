import { LEAGUE_COMPETITION } from './leagueModel.js'

export function buildLeagueCollections(leagues) {
  const collections = {
    [LEAGUE_COMPETITION.ORIGINAL]: [],
    [LEAGUE_COMPETITION.KO_PREDICTOR]: [],
  }

  for (const league of leagues ?? []) {
    if (collections[league?.competition]) collections[league.competition].push(league)
  }

  return Object.freeze({
    [LEAGUE_COMPETITION.ORIGINAL]: Object.freeze(collections[LEAGUE_COMPETITION.ORIGINAL]),
    [LEAGUE_COMPETITION.KO_PREDICTOR]: Object.freeze(collections[LEAGUE_COMPETITION.KO_PREDICTOR]),
  })
}

export function reconcileLeagueSelections(leagues, previousSelections = {}, preferredLeagueId = null) {
  const collections = buildLeagueCollections(leagues)
  const preferredLeague = preferredLeagueId
    ? (leagues ?? []).find(league => league.id === preferredLeagueId) ?? null
    : null

  const selectedIds = Object.fromEntries(
    Object.values(LEAGUE_COMPETITION).map(competitionKey => {
      const collection = collections[competitionKey]
      const preferredId = preferredLeague?.competition === competitionKey ? preferredLeague.id : null
      const previousId = collection.some(league => league.id === previousSelections[competitionKey])
        ? previousSelections[competitionKey]
        : null
      return [competitionKey, preferredId ?? previousId ?? collection[0]?.id ?? null]
    }),
  )

  return Object.freeze({
    selectedIds: Object.freeze(selectedIds),
    preferredCompetition: preferredLeague?.competition ?? null,
  })
}
