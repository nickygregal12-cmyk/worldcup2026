import { EURO28_TIE_BREAK_CONFIG } from './euro28ResolverConfig.js'

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0
}

function numericOrNull(value) {
  return Number.isFinite(value) ? Number(value) : null
}

function normaliseTeam(team) {
  if (typeof team === 'string') {
    return {
      teamId: team,
      stableKey: team,
      fairPlayPoints: null,
      qualifierRank: null,
    }
  }

  const teamId = team?.teamId ?? team?.id
  if (!teamId) throw new TypeError('Every group team requires a teamId')

  return {
    ...team,
    teamId,
    stableKey: String(team.stableKey ?? team.slotCode ?? teamId),
    fairPlayPoints: numericOrNull(team.fairPlayPoints),
    qualifierRank: numericOrNull(team.qualifierRank),
  }
}

function createEmptyStats(team) {
  return {
    ...team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }
}

function validateMatch(match, knownTeamIds, groupCode) {
  const homeTeamId = match?.homeTeamId
  const awayTeamId = match?.awayTeamId

  if (!homeTeamId || !awayTeamId) {
    throw new TypeError(`Group ${groupCode} match requires homeTeamId and awayTeamId`)
  }
  if (homeTeamId === awayTeamId) {
    throw new TypeError(`Group ${groupCode} match cannot use the same team twice`)
  }
  if (!knownTeamIds.has(homeTeamId) || !knownTeamIds.has(awayTeamId)) {
    throw new TypeError(`Group ${groupCode} match contains a team outside the group`)
  }

  const homeScoreMissing = match.homeScore == null
  const awayScoreMissing = match.awayScore == null
  if (homeScoreMissing !== awayScoreMissing) {
    throw new TypeError(`Group ${groupCode} match must provide both scores or neither score`)
  }
  if (!homeScoreMissing && (!isNonNegativeInteger(match.homeScore) || !isNonNegativeInteger(match.awayScore))) {
    throw new TypeError(`Group ${groupCode} scores must be non-negative integers`)
  }
}

function addMatch(statsByTeamId, match) {
  if (match.homeScore == null || match.awayScore == null) return false

  const home = statsByTeamId.get(match.homeTeamId)
  const away = statsByTeamId.get(match.awayTeamId)
  const homeWon = match.homeScore > match.awayScore
  const awayWon = match.awayScore > match.homeScore

  home.played += 1
  away.played += 1
  home.goalsFor += match.homeScore
  home.goalsAgainst += match.awayScore
  away.goalsFor += match.awayScore
  away.goalsAgainst += match.homeScore

  if (homeWon) {
    home.wins += 1
    away.losses += 1
    home.points += 3
  } else if (awayWon) {
    away.wins += 1
    home.losses += 1
    away.points += 3
  } else {
    home.draws += 1
    away.draws += 1
    home.points += 1
    away.points += 1
  }

  home.goalDifference = home.goalsFor - home.goalsAgainst
  away.goalDifference = away.goalsFor - away.goalsAgainst
  return true
}

function splitByMetric(teamIds, metric, direction = 'desc') {
  const buckets = new Map()

  for (const teamId of teamIds) {
    const value = metric(teamId)
    const key = String(value)
    if (!buckets.has(key)) buckets.set(key, { value, teamIds: [] })
    buckets.get(key).teamIds.push(teamId)
  }

  return [...buckets.values()]
    .sort((left, right) => {
      if (left.value === right.value) return 0
      if (direction === 'asc') return left.value < right.value ? -1 : 1
      return left.value > right.value ? -1 : 1
    })
    .map(bucket => bucket.teamIds)
}

function splitPartitions(partitions, metric, direction = 'desc', shouldApply = () => true) {
  return partitions.flatMap(teamIds => {
    if (teamIds.length < 2 || !shouldApply(teamIds)) return [teamIds]
    return splitByMetric(teamIds, metric, direction)
  })
}

function calculateMiniTable(teamIds, completedMatches, teamById) {
  const selected = new Set(teamIds)
  const statsByTeamId = new Map(teamIds.map(teamId => [teamId, createEmptyStats(teamById.get(teamId))]))

  for (const match of completedMatches) {
    if (selected.has(match.homeTeamId) && selected.has(match.awayTeamId)) {
      addMatch(statsByTeamId, match)
    }
  }

  return statsByTeamId
}

function applyHeadToHead(teamIds, completedMatches, teamById) {
  if (teamIds.length < 2) return [teamIds]

  const miniTable = calculateMiniTable(teamIds, completedMatches, teamById)
  let partitions = [teamIds]
  partitions = splitPartitions(partitions, teamId => miniTable.get(teamId).points)
  partitions = splitPartitions(partitions, teamId => miniTable.get(teamId).goalDifference)
  partitions = splitPartitions(partitions, teamId => miniTable.get(teamId).goalsFor)

  if (partitions.length === 1) return [teamIds]

  return partitions.flatMap(partition => {
    if (partition.length < 2) return [partition]
    const reapplied = applyHeadToHead(partition, completedMatches, teamById)
    return reapplied.length === 1 && reapplied[0].length === partition.length
      ? [partition]
      : reapplied
  })
}

function allHaveFiniteValue(teamIds, teamById, key) {
  return teamIds.every(teamId => Number.isFinite(teamById.get(teamId)[key]))
}

function resolveTiePartition(teamIds, completedMatches, statsByTeamId, teamById) {
  let partitions = applyHeadToHead(teamIds, completedMatches, teamById)
  partitions = splitPartitions(partitions, teamId => statsByTeamId.get(teamId).goalDifference)
  partitions = splitPartitions(partitions, teamId => statsByTeamId.get(teamId).goalsFor)
  partitions = splitPartitions(partitions, teamId => statsByTeamId.get(teamId).wins)
  partitions = splitPartitions(
    partitions,
    teamId => teamById.get(teamId).fairPlayPoints,
    'asc',
    ids => allHaveFiniteValue(ids, teamById, 'fairPlayPoints'),
  )
  partitions = splitPartitions(
    partitions,
    teamId => teamById.get(teamId).qualifierRank,
    'asc',
    ids => allHaveFiniteValue(ids, teamById, 'qualifierRank'),
  )

  return partitions
}

export function calculateGroupStats({ groupCode, teams, matches }) {
  if (!groupCode) throw new TypeError('groupCode is required')
  if (!Array.isArray(teams) || teams.length < 2) throw new TypeError(`Group ${groupCode} requires at least two teams`)
  if (!Array.isArray(matches)) throw new TypeError(`Group ${groupCode} matches must be an array`)

  const normalisedTeams = teams.map(normaliseTeam)
  const teamById = new Map(normalisedTeams.map(team => [team.teamId, team]))
  if (teamById.size !== normalisedTeams.length) throw new TypeError(`Group ${groupCode} contains duplicate teams`)

  const knownTeamIds = new Set(teamById.keys())
  const seenMatchKeys = new Set()
  const statsByTeamId = new Map(normalisedTeams.map(team => [team.teamId, createEmptyStats(team)]))
  const completedMatches = []

  for (const match of matches) {
    validateMatch(match, knownTeamIds, groupCode)
    const matchKey = String(match.matchNumber ?? match.id ?? `${match.homeTeamId}-${match.awayTeamId}`)
    if (seenMatchKeys.has(matchKey)) throw new TypeError(`Group ${groupCode} contains duplicate match ${matchKey}`)
    seenMatchKeys.add(matchKey)

    if (addMatch(statsByTeamId, match)) completedMatches.push(match)
  }

  return {
    groupCode,
    teamById,
    statsByTeamId,
    completedMatches,
    incompleteMatchCount: matches.length - completedMatches.length,
  }
}

export function resolveGroupTable({ groupCode, teams, matches }) {
  const calculation = calculateGroupStats({ groupCode, teams, matches })
  const { teamById, statsByTeamId, completedMatches } = calculation
  const teamIds = [...teamById.keys()]

  let partitions = splitByMetric(teamIds, teamId => statsByTeamId.get(teamId).points)
  partitions = partitions.flatMap(partition => {
    if (partition.length < 2) return [partition]
    return resolveTiePartition(partition, completedMatches, statsByTeamId, teamById)
  })

  const unresolvedTieGroups = partitions
    .filter(partition => partition.length > 1)
    .map(partition => [...partition].sort((left, right) => {
      const leftKey = teamById.get(left).stableKey
      const rightKey = teamById.get(right).stableKey
      return leftKey.localeCompare(rightKey)
    }))

  const unresolvedTeamIds = new Set(unresolvedTieGroups.flat())
  const orderedTeamIds = partitions.flatMap(partition => {
    if (partition.length < 2) return partition
    return [...partition].sort((left, right) => {
      const leftKey = teamById.get(left).stableKey
      const rightKey = teamById.get(right).stableKey
      return leftKey.localeCompare(rightKey)
    })
  })

  const rows = orderedTeamIds.map((teamId, index) => ({
    ...statsByTeamId.get(teamId),
    rank: index + 1,
    officialTieBreakResolved: !unresolvedTeamIds.has(teamId),
    previewFallbackUsed: unresolvedTeamIds.has(teamId),
  }))

  return {
    groupCode,
    tieBreakVersion: EURO28_TIE_BREAK_CONFIG.version,
    tieBreakStatus: EURO28_TIE_BREAK_CONFIG.status,
    rows,
    unresolvedTieGroups,
    completedMatchCount: calculation.completedMatches.length,
    incompleteMatchCount: calculation.incompleteMatchCount,
    issues: unresolvedTieGroups.map(teamIds => ({
      code: 'PROVISIONAL_TIE_FALLBACK',
      groupCode,
      teamIds,
      message: 'The preview used a stable fallback because the provisional official criteria did not separate these teams.',
    })),
  }
}
