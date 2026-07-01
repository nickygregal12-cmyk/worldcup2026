import {
  EURO28_BEST_THIRD_COMBINATIONS,
  EURO28_BEST_THIRD_MATRIX,
  EURO28_BEST_THIRD_TARGET_MATCHES,
  EURO28_GROUP_CODES,
  EURO28_TIE_BREAK_CONFIG,
} from './euro28ResolverConfig.js'

function splitByMetric(rows, metric, direction = 'desc') {
  const buckets = new Map()

  for (const row of rows) {
    const value = metric(row)
    const key = String(value)
    if (!buckets.has(key)) buckets.set(key, { value, rows: [] })
    buckets.get(key).rows.push(row)
  }

  return [...buckets.values()]
    .sort((left, right) => {
      if (left.value === right.value) return 0
      if (direction === 'asc') return left.value < right.value ? -1 : 1
      return left.value > right.value ? -1 : 1
    })
    .map(bucket => bucket.rows)
}

function splitPartitions(partitions, metric, direction = 'desc', shouldApply = () => true) {
  return partitions.flatMap(rows => {
    if (rows.length < 2 || !shouldApply(rows)) return [rows]
    return splitByMetric(rows, metric, direction)
  })
}

function allHaveFiniteValue(rows, key) {
  return rows.every(row => Number.isFinite(row[key]))
}

function compareStableRows(left, right) {
  const leftKey = String(left.stableKey ?? left.teamId)
  const rightKey = String(right.stableKey ?? right.teamId)
  const groupDifference = left.groupCode.localeCompare(right.groupCode)
  return groupDifference || leftKey.localeCompare(rightKey)
}

function normaliseQualifiedThird(third) {
  const groupCode = third?.groupCode
  const teamId = third?.teamId
  if (!EURO28_GROUP_CODES.includes(groupCode) || !teamId) {
    throw new TypeError('Every qualified third-place entry requires a valid groupCode and teamId')
  }
  return { ...third, groupCode, teamId }
}

export function buildBestThirdCombinationKey(groupCodes) {
  if (!Array.isArray(groupCodes) || groupCodes.length !== 4) {
    throw new TypeError('Exactly four third-place group codes are required')
  }

  const uniqueCodes = [...new Set(groupCodes)]
  if (uniqueCodes.length !== 4 || uniqueCodes.some(code => !EURO28_GROUP_CODES.includes(code))) {
    throw new TypeError('Third-place group codes must be four unique values from A to F')
  }

  const combinationKey = uniqueCodes.sort().join('')
  if (!EURO28_BEST_THIRD_COMBINATIONS.includes(combinationKey)) {
    throw new TypeError(`Unsupported best-third combination ${combinationKey}`)
  }
  return combinationKey
}

export function rankBestThirdTeams(groupTables) {
  const thirdPlaceRows = EURO28_GROUP_CODES.map(groupCode => {
    const table = groupTables?.[groupCode]
    const row = table?.rows?.find(candidate => candidate.rank === 3) ?? table?.rows?.[2]
    if (!row) throw new TypeError(`Group ${groupCode} has no third-place row`)
    return { ...row, groupCode }
  })

  let partitions = [thirdPlaceRows]
  partitions = splitPartitions(partitions, row => row.points)
  partitions = splitPartitions(partitions, row => row.goalDifference)
  partitions = splitPartitions(partitions, row => row.goalsFor)
  partitions = splitPartitions(partitions, row => row.wins)
  partitions = splitPartitions(
    partitions,
    row => row.fairPlayPoints,
    'asc',
    rows => allHaveFiniteValue(rows, 'fairPlayPoints'),
  )
  partitions = splitPartitions(
    partitions,
    row => row.qualifierRank,
    'asc',
    rows => allHaveFiniteValue(rows, 'qualifierRank'),
  )

  const unresolvedTieGroups = partitions
    .filter(rows => rows.length > 1)
    .map(rows => [...rows].sort(compareStableRows).map(row => ({ groupCode: row.groupCode, teamId: row.teamId })))
  const unresolvedTeamIds = new Set(unresolvedTieGroups.flatMap(group => group.map(row => row.teamId)))

  const ranking = partitions
    .flatMap(rows => rows.length > 1 ? [...rows].sort(compareStableRows) : rows)
    .map((row, index) => ({
      ...row,
      bestThirdRank: index + 1,
      qualifiesAsBestThird: index < 4,
      officialTieBreakResolved: !unresolvedTeamIds.has(row.teamId),
      previewFallbackUsed: unresolvedTeamIds.has(row.teamId),
    }))

  const qualifiedThirds = ranking.slice(0, 4)
  const combinationKey = buildBestThirdCombinationKey(qualifiedThirds.map(row => row.groupCode))

  return {
    tieBreakVersion: EURO28_TIE_BREAK_CONFIG.version,
    tieBreakStatus: EURO28_TIE_BREAK_CONFIG.status,
    ranking,
    qualifiedThirds,
    combinationKey,
    unresolvedTieGroups,
    issues: unresolvedTieGroups.map(rows => ({
      code: 'PROVISIONAL_BEST_THIRD_TIE_FALLBACK',
      rows,
      message: 'The best-third preview used a stable fallback because the provisional official criteria did not separate these teams.',
    })),
  }
}

export function resolveBestThirdAssignments(qualifiedThirds) {
  const normalised = qualifiedThirds.map(normaliseQualifiedThird)
  const combinationKey = buildBestThirdCombinationKey(normalised.map(row => row.groupCode))
  const thirdByGroup = new Map(normalised.map(row => [row.groupCode, row]))
  const assignmentsByMatch = {}

  for (const targetGroupWinner of ['B', 'C', 'F', 'E']) {
    const thirdPlaceGroup = EURO28_BEST_THIRD_MATRIX[targetGroupWinner][combinationKey]
    const qualifiedThird = thirdByGroup.get(thirdPlaceGroup)
    if (!qualifiedThird) {
      throw new TypeError(`Best-third matrix selected non-qualifying group ${thirdPlaceGroup}`)
    }

    const matchNumber = EURO28_BEST_THIRD_TARGET_MATCHES[targetGroupWinner]
    assignmentsByMatch[matchNumber] = {
      matchNumber,
      targetGroupWinner,
      thirdPlaceGroup,
      teamId: qualifiedThird.teamId,
    }
  }

  const assignedGroups = Object.values(assignmentsByMatch).map(row => row.thirdPlaceGroup).sort()
  if (assignedGroups.join('') !== combinationKey) {
    throw new TypeError(`Best-third matrix did not allocate all groups in ${combinationKey} exactly once`)
  }

  return {
    combinationKey,
    assignmentsByMatch,
  }
}
