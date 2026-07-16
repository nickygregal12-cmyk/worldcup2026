import { buildSharedPredictionJourney, LEAGUE_COMPETITION } from '../leagues/leagueModel.js'
import { createGuestPredictionState, resolveGuestTournamentPreview, updateGuestBracketPrediction, updateGuestGroupPrediction } from '../guest/index.js'

const SUPPORTED_COMPETITIONS = new Set([
  LEAGUE_COMPETITION.ORIGINAL,
  LEAGUE_COMPETITION.KO_PREDICTOR,
])

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)))
}

function playerFromRows(rows, memberUserId, fallbackName, isSelf = false) {
  const row = rows.find(item => item.userId === memberUserId) ?? null
  return Object.freeze({
    userId: memberUserId,
    displayName: row?.displayName ?? fallbackName ?? 'Player',
    rank: row?.rank ?? null,
    totalPoints: Number(row?.totalPoints ?? 0),
    scoredMatchCount: Number(row?.scoredMatchCount ?? 0),
    isCurrentUser: isSelf || Boolean(row?.isCurrentUser),
  })
}

function outcomeLabel(row) {
  if (row.visibility !== 'visible') return row.message ?? 'This pick is not available yet.'
  if (row.kind === 'bracket') return row.advancingTeamLabel ? `${row.advancingTeamLabel} through` : 'No bracket pick'
  const parts = [row.score ?? 'No score']
  if (row.advancingTeamLabel) parts.push(`${row.advancingTeamLabel} through`)
  if (row.decisionMethodLabel) parts.push(row.decisionMethodLabel)
  return parts.join(' · ')
}

function buildPredictionRows(journey) {
  return freezeRows(journey.matches.map(row => ({
    key: `${row.kind}-${row.matchNumber}`,
    kind: row.kind,
    matchNumber: row.matchNumber,
    stageLabel: row.stageLabel,
    homeLabel: row.homeLabel,
    awayLabel: row.awayLabel,
    homeTeam: row.homeTeam ?? null,
    awayTeam: row.awayTeam ?? null,
    visibility: row.visibility,
    message: row.message ?? null,
    score: row.score ?? null,
    jokerApplied: Boolean(row.jokerApplied),
    outcomeLabel: outcomeLabel(row),
  })))
}

function buildBracketRows(journey) {
  return freezeRows(journey.bracket.map(row => ({
    key: `${row.kind}-${row.matchNumber}`,
    matchNumber: row.matchNumber,
    stageLabel: row.stageLabel,
    homeLabel: row.homeLabel,
    awayLabel: row.awayLabel,
    homeTeam: row.homeTeam ?? null,
    awayTeam: row.awayTeam ?? null,
    visibility: row.visibility,
    message: row.message ?? null,
    advancingTeamLabel: row.advancingTeamLabel ?? null,
    advancingTeam: row.advancingTeam ?? null,
    outcomeLabel: outcomeLabel(row),
  })))
}

function buildPredictedTables(journey) {
  const groupRows = journey.matches.filter(row => row.stageLabel?.startsWith?.('Group '))
  const groups = new Map()

  for (const row of groupRows) {
    const groupCode = row.groupCode ?? row.stageLabel?.replace('Group ', '') ?? 'Group'
    const current = groups.get(groupCode) ?? { groupCode, rows: [] }
    current.rows.push(row)
    groups.set(groupCode, current)
  }

  return Object.freeze([...groups.values()].map(group => Object.freeze({
    groupCode: group.groupCode,
    rows: freezeRows(group.rows.map(row => ({
      key: `${row.kind}-${row.matchNumber}`,
      matchNumber: row.matchNumber,
      fixture: `${row.homeLabel} v ${row.awayLabel}`,
      visibility: row.visibility,
      score: row.score ?? null,
      jokerApplied: Boolean(row.jokerApplied),
      note: row.visibility === 'visible' ? 'Saved prediction' : row.message ?? 'Not available yet',
    }))),
  })))
}

function buildPrivacyState({ journey, competitionKey, lifecycle, isSelf }) {
  // You always see your own picks in full, so the pre-release copy never applies to yourself.
  if (isSelf) {
    return Object.freeze({
      state: 'released',
      title: 'Your own predictions',
      copy: competitionKey === LEAGUE_COMPETITION.ORIGINAL
        ? 'This is your own player view, so your Original Predictor picks are always shown in full. Other players only see them after the global prediction lock.'
        : 'This is your own player view, so your KO Predictor picks are always shown in full. Other players see each pick after its fixture starts.',
    })
  }

  const hasReleasedRows = [...(journey.matches ?? []), ...(journey.bracket ?? [])]
    .some(row => row.visibility === 'visible')

  if (journey.releaseState === 'released' || hasReleasedRows) {
    return Object.freeze({
      state: 'released',
      title: competitionKey === LEAGUE_COMPETITION.ORIGINAL ? 'Original picks are available' : 'KO picks are available',
      copy: competitionKey === LEAGUE_COMPETITION.ORIGINAL
        ? 'Original Predictor selections are available for this player. KO Predictor selections stay separate.'
        : 'KO Predictor selections only show for real knockout fixtures that have individually started.',
    })
  }

  if (competitionKey === LEAGUE_COMPETITION.ORIGINAL && !lifecycle?.locked) {
    return Object.freeze({
      state: 'protected',
      title: 'Predictions are under wraps',
      copy: 'Original Predictor selections appear after the global prediction lock. Until then, this view only shows safe player context.',
    })
  }

  return Object.freeze({
    state: 'protected',
    title: 'Some picks are still protected',
    copy: competitionKey === LEAGUE_COMPETITION.ORIGINAL
      ? 'Only released Original Predictor selections are shown for this player.'
      : 'KO Predictor selections release fixture by fixture after each real knockout match starts.',
  })
}

function buildBracketSummary(bracketRows) {
  const visibleRows = bracketRows.filter(row => row.visibility === 'visible')
  const champion = visibleRows.find(row => row.stageLabel === 'Final')?.advancingTeamLabel ?? null

  return Object.freeze({
    visibleCount: visibleRows.length,
    totalCount: bracketRows.length,
    champion,
  })
}

export function buildPlayerBracketPreview({ predictionBundle, reference, isSelf = false }) {
  if (!(isSelf || predictionBundle?.visible) || reference?.context !== 'guest') return null
  const groupRows = new Map((predictionBundle?.match_predictions ?? []).map(row => [Number(row.match_number), row]))
  if ((reference.groupMatches ?? []).some(match => !groupRows.has(match.matchNumber))) return null

  try {
    let draft = createGuestPredictionState(reference)
    for (const match of reference.groupMatches) {
      const row = groupRows.get(match.matchNumber)
      draft = updateGuestGroupPrediction(draft, {
        matchNumber: match.matchNumber,
        homeScore: Number(row.home_score_90),
        awayScore: Number(row.away_score_90),
        jokerApplied: Boolean(row.joker_applied),
      })
    }
    for (const row of predictionBundle?.bracket_predictions ?? []) {
      draft = updateGuestBracketPrediction(draft, {
        matchNumber: Number(row.match_number),
        advancingTeamId: row.advancing_tournament_team_id ?? null,
      })
    }
    const preview = resolveGuestTournamentPreview(reference, draft)
    return preview.completeness.bracket.complete > 0 ? preview : null
  } catch {
    return null
  }
}

export function buildPlayerView({
  memberUserId,
  displayName,
  standingsRows = [],
  predictionBundle,
  competitionKey,
  reference,
  lifecycle = null,
  isSelf = false,
}) {
  if (!SUPPORTED_COMPETITIONS.has(competitionKey)) throw new TypeError('Unsupported player view competition')
  const journey = buildSharedPredictionJourney({ bundle: predictionBundle, reference, competitionKey, viewerIsOwner: isSelf })
  const player = playerFromRows(standingsRows, memberUserId, displayName ?? journey.displayName, isSelf)
  const predictionRows = buildPredictionRows(journey)
  const bracketRows = competitionKey === LEAGUE_COMPETITION.ORIGINAL ? buildBracketRows(journey) : Object.freeze([])
  const predictedTables = competitionKey === LEAGUE_COMPETITION.ORIGINAL ? buildPredictedTables(journey) : Object.freeze([])
  const bracketPreview = competitionKey === LEAGUE_COMPETITION.ORIGINAL
    ? buildPlayerBracketPreview({ predictionBundle, reference, isSelf })
    : null

  return Object.freeze({
    competitionKey,
    player,
    release: buildPrivacyState({ journey, competitionKey, lifecycle, isSelf }),
    tabs: Object.freeze(['predictions', 'bracket', 'tables']),
    predictions: predictionRows,
    bracket: bracketRows,
    bracketSummary: buildBracketSummary(bracketRows),
    bracketPreview,
    predictedTables,
    counts: Object.freeze({
      visiblePredictions: predictionRows.filter(row => row.visibility === 'visible').length,
      protectedPredictions: predictionRows.filter(row => row.visibility === 'private').length,
      jokerPredictions: predictionRows.filter(row => row.jokerApplied).length,
    }),
  })
}
