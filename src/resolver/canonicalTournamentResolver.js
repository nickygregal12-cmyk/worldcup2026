import {
  EURO28_GROUP_CODES,
  EURO28_RESOLVER_VERSION,
  EURO28_TIE_BREAK_CONFIG,
  RESOLVER_CONTEXT,
} from './euro28ResolverConfig.js'
import { resolveGroupTable } from './groupStandings.js'
import { rankBestThirdTeams, resolveBestThirdAssignments } from './bestThird.js'
import { resolveKnockoutBracket } from './knockoutBracket.js'

const VALID_CONTEXTS = new Set(Object.values(RESOLVER_CONTEXT))

function assertContext(context) {
  if (!VALID_CONTEXTS.has(context)) {
    throw new TypeError(`Resolver context must be one of: ${[...VALID_CONTEXTS].join(', ')}`)
  }
}

function assertContextRecords(records, label, context) {
  if (!Array.isArray(records)) throw new TypeError(`${label} must be an array`)

  for (const record of records) {
    if (record?.context !== context) {
      throw new TypeError(
        `${label} contains ${record?.context ?? 'an unlabelled'} record while resolving ${context}; contexts must never be blended`,
      )
    }
  }
}

function normaliseGroup(group) {
  const code = group?.code
  if (!EURO28_GROUP_CODES.includes(code)) throw new TypeError(`Unsupported Euro 2028 group ${code ?? 'unknown'}`)
  if (!Array.isArray(group.teams) || group.teams.length !== 4) {
    throw new TypeError(`Group ${code} must contain exactly four teams`)
  }
  return { ...group, code }
}

export function resolveEuro28Tournament({
  context,
  groups,
  groupMatches,
  knockoutDecisions = [],
}) {
  assertContext(context)
  if (!Array.isArray(groups) || groups.length !== EURO28_GROUP_CODES.length) {
    throw new TypeError('The Euro 2028 resolver requires all six groups')
  }
  assertContextRecords(groupMatches, 'groupMatches', context)
  assertContextRecords(knockoutDecisions, 'knockoutDecisions', context)
  if (groupMatches.length !== 36) {
    throw new TypeError('The Euro 2028 resolver requires all 36 group fixtures, with unresolved scores left null')
  }
  if (groupMatches.some(match => !EURO28_GROUP_CODES.includes(match.groupCode))) {
    throw new TypeError('Every group match must identify one of groups A to F')
  }

  const matchKeys = groupMatches.map(match => String(match.matchNumber ?? match.id ?? ''))
  if (matchKeys.some(key => !key) || new Set(matchKeys).size !== matchKeys.length) {
    throw new TypeError('Every group match requires a unique matchNumber or id')
  }

  const normalisedGroups = groups.map(normaliseGroup)
  const groupByCode = new Map(normalisedGroups.map(group => [group.code, group]))
  if (groupByCode.size !== EURO28_GROUP_CODES.length) throw new TypeError('Euro 2028 groups must use A to F exactly once')
  for (const code of EURO28_GROUP_CODES) {
    if (!groupByCode.has(code)) throw new TypeError(`Euro 2028 group ${code} is missing`)
  }

  const groupTables = {}
  for (const groupCode of EURO28_GROUP_CODES) {
    const group = groupByCode.get(groupCode)
    const matches = groupMatches.filter(match => match.groupCode === groupCode)
    if (matches.length !== 6) throw new TypeError(`Group ${groupCode} must contain exactly six fixtures`)
    groupTables[groupCode] = resolveGroupTable({
      groupCode,
      teams: group.teams,
      matches,
    })
  }

  const bestThirdRanking = rankBestThirdTeams(groupTables)
  const bestThirdAssignments = resolveBestThirdAssignments(bestThirdRanking.qualifiedThirds)
  const knockout = resolveKnockoutBracket({
    groupTables,
    bestThirdAssignments,
    knockoutDecisions,
  })

  return {
    resolverVersion: EURO28_RESOLVER_VERSION,
    context,
    tieBreak: EURO28_TIE_BREAK_CONFIG,
    groupTables,
    bestThird: {
      ...bestThirdRanking,
      ...bestThirdAssignments,
    },
    knockout,
    issues: [
      ...EURO28_GROUP_CODES.flatMap(code => groupTables[code].issues),
      ...bestThirdRanking.issues,
      ...knockout.issues,
    ],
  }
}
