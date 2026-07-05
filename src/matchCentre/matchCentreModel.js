import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'
import { RESULT_COMPETITION } from '../results/resultModel.js'

const STARTED_STATUSES = new Set(['live', 'paused', 'completed', 'abandoned'])

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)))
}

function stageLabel(match) {
  if (match.groupCode) return `Group ${match.groupCode}`
  if (match.matchNumber <= 44) return 'Round of 16'
  if (match.matchNumber <= 48) return 'Quarter-finals'
  if (match.matchNumber <= 50) return 'Semi-finals'
  return 'Final'
}

function stageKey(matchNumber) {
  if (matchNumber <= 44) return 'round_of_16'
  if (matchNumber <= 48) return 'quarter_final'
  if (matchNumber <= 50) return 'semi_final'
  return 'final'
}

function team(reference, teamId, fallback) {
  if (!teamId) return Object.freeze({ id: null, label: fallback, isoCode: null, unresolved: true })
  const record = reference?.teamsById?.[teamId]
  return Object.freeze({
    id: teamId,
    label: record?.label ?? record?.slotCode ?? fallback,
    isoCode: record?.fifaCode ?? record?.isoCode ?? null,
    isProvisional: Boolean(record?.isProvisional),
    unresolved: false,
  })
}

function liveParticipants(match, liveSnapshot) {
  if (match.matchNumber <= 36) return { homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId }
  const resolved = liveSnapshot?.knockout?.byMatchNumber?.[match.matchNumber]
  return {
    homeTeamId: resolved?.homeTeamId ?? null,
    awayTeamId: resolved?.awayTeamId ?? null,
  }
}

function resultFor(liveSnapshot, matchId) {
  return liveSnapshot?.results?.find(row => row.matchId === matchId) ?? null
}

function displayState(result, fallbackStatus) {
  if (result?.resultStatus === 'manual_review') return 'review'
  if (['live', 'paused'].includes(result?.status)) return 'live'
  if (result?.confirmed) return 'completed'
  if (fallbackStatus === 'abandoned') return 'abandoned'
  return 'upcoming'
}

function fixtureFromMatch(reference, liveSnapshot, match) {
  const participants = liveParticipants(match, liveSnapshot)
  const result = resultFor(liveSnapshot, match.matchId)
  return Object.freeze({
    matchId: match.matchId,
    matchNumber: match.matchNumber,
    stageLabel: stageLabel(match),
    scheduledDate: match.scheduledDate ?? null,
    kickoffAt: match.kickoffAt ?? null,
    venueLabel: match.venueName ?? match.venueLabel ?? null,
    home: team(reference, participants.homeTeamId, match.matchNumber > 36 ? 'Home slot unresolved' : 'Home team TBC'),
    away: team(reference, participants.awayTeamId, match.matchNumber > 36 ? 'Away slot unresolved' : 'Away team TBC'),
    participantsResolved: Boolean(participants.homeTeamId && participants.awayTeamId),
    state: displayState(result, result?.status ?? match.status),
    status: result?.status ?? match.status ?? 'scheduled',
    score: result?.scoreVisible ? `${result.normalTimeHomeGoals}–${result.normalTimeAwayGoals}` : null,
    resultDetail: result?.decisionMethod ? result.decisionMethod.replaceAll('_', ' ') : null,
    resultRevision: Number(result?.resultRevision ?? 0),
    corrected: Number(result?.resultRevision ?? 0) > 1,
  })
}


export function buildMatchCentreLifecycle({ fixture, competitionKey, lifecycle }) {
  if (!fixture) {
    return Object.freeze({ tone: 'info', title: 'Match Centre is preparing', body: 'Fixture context will appear once the tournament reference has loaded.' })
  }
  const isKo = Number(fixture.matchNumber) > 36
  const competitionLabel = competitionKey === RESULT_COMPETITION.KO_PREDICTOR ? 'KO Predictor' : 'Original Predictor'

  if (fixture.state === 'live') {
    return Object.freeze({
      tone: 'danger',
      title: 'This fixture is live',
      body: `${competitionLabel} picks follow the current fixture release rules while official scores stay separate from prediction totals.`,
    })
  }
  if (fixture.state === 'review') {
    return Object.freeze({
      tone: 'warning',
      title: 'Result review is active',
      body: 'Scores may be visible, but points wait for the confirmed or corrected official result.',
    })
  }
  if (fixture.state === 'completed') {
    return Object.freeze({
      tone: 'safe',
      title: 'Fixture completed',
      body: 'Confirmed result context and maximum points are shown without combining Original and KO Predictor totals.',
    })
  }
  if (isKo && !fixture.participantsResolved) {
    return Object.freeze({
      tone: 'info',
      title: 'Knockout participants are not known yet',
      body: 'The KO Predictor remains separate and only opens for this match once the real fixture is resolved.',
    })
  }
  if (!lifecycle?.started) {
    return Object.freeze({
      tone: 'info',
      title: 'Fixture is scheduled',
      body: 'Match Centre is ready, but prediction visibility still follows the tournament timing and privacy gates.',
    })
  }
  return Object.freeze({
    tone: 'info',
    title: 'Fixture is waiting for kick-off',
    body: 'Community selections and points context will update when the fixture reaches the relevant release state.',
  })
}

export function buildMatchCentreNavigation({ reference, liveSnapshot, matchNumber }) {
  if (!reference?.tournamentId) throw new TypeError('A Euro tournament reference is required')
  const all = [...reference.groupMatches, ...reference.knockoutMatches]
    .sort((left, right) => left.matchNumber - right.matchNumber)
  const requested = Number(matchNumber)
  const index = all.findIndex(match => match.matchNumber === requested)
  const safeIndex = index >= 0 ? index : 0
  const current = all[safeIndex]
  return Object.freeze({
    current: fixtureFromMatch(reference, liveSnapshot, current),
    previous: safeIndex > 0 ? fixtureFromMatch(reference, liveSnapshot, all[safeIndex - 1]) : null,
    next: safeIndex < all.length - 1 ? fixtureFromMatch(reference, liveSnapshot, all[safeIndex + 1]) : null,
    requestedFound: index >= 0,
  })
}

function matchPrediction(bundle, matchNumber) {
  return (bundle?.match_predictions ?? []).find(row => Number(row.match_number) === Number(matchNumber)) ?? null
}

function bracketPrediction(bundle, matchNumber) {
  return (bundle?.bracket_predictions ?? []).find(row => Number(row.match_number) === Number(matchNumber)) ?? null
}

function scoreText(prediction) {
  if (!Number.isInteger(prediction?.home_score_90) || !Number.isInteger(prediction?.away_score_90)) return null
  return `${prediction.home_score_90}–${prediction.away_score_90}`
}

function teamLabel(reference, teamId) {
  if (!teamId) return null
  return reference?.teamsById?.[teamId]?.label ?? reference?.teamsById?.[teamId]?.slotCode ?? 'TBC'
}

function originalMaximum(matchNumber, prediction) {
  if (matchNumber <= 36) {
    const base = EURO_SCORING_CONFIG.match.EXACT_SCORE
    return base * (prediction?.joker_applied ? EURO_SCORING_CONFIG.joker.MULTIPLIER : 1)
  }
  return EURO_SCORING_CONFIG.bracket[stageKey(matchNumber)] ?? 0
}

function koMaximum(prediction) {
  const base = EURO_SCORING_CONFIG.match.EXACT_SCORE
    + EURO_SCORING_CONFIG.koPredictor.CORRECT_ADVANCING_TEAM
    + EURO_SCORING_CONFIG.koPredictor.CORRECT_DECISION_METHOD
  return base * (prediction?.joker_applied ? EURO_SCORING_CONFIG.joker.MULTIPLIER : 1)
}

function buildMemberLine({ member, bundle, competitionKey, matchNumber, reference, currentUserId }) {
  const prediction = competitionKey === RESULT_COMPETITION.ORIGINAL && matchNumber > 36
    ? bracketPrediction(bundle, matchNumber)
    : matchPrediction(bundle, matchNumber)
  const visible = Boolean(bundle?.visible)
  const saved = Boolean(prediction)
  const advancingTeamId = prediction?.advancing_tournament_team_id ?? null
  const maximumPoints = competitionKey === RESULT_COMPETITION.ORIGINAL
    ? originalMaximum(matchNumber, prediction)
    : koMaximum(prediction)

  return {
    userId: member.userId,
    displayName: member.displayName,
    rank: member.rank,
    totalPoints: member.totalPoints,
    isCurrentUser: member.userId === currentUserId,
    visibility: !visible ? 'private' : saved ? 'visible' : 'not_saved',
    reason: !visible ? bundle?.reason ?? 'Predictions are not visible yet.' : saved ? null : 'No saved selection for this fixture.',
    score: scoreText(prediction),
    advancingTeamId,
    advancingTeamLabel: teamLabel(reference, advancingTeamId),
    decisionMethod: prediction?.decision_method ?? null,
    jokerApplied: Boolean(prediction?.joker_applied),
    maximumPoints: saved ? maximumPoints : 0,
  }
}

export function buildFixtureImpact({ members, bundlesByUserId, competitionKey, matchNumber, reference, currentUserId }) {
  if (!Object.values(RESULT_COMPETITION).includes(competitionKey)) throw new TypeError('Unsupported Match Centre competition')
  const lines = (members ?? []).map(member => buildMemberLine({
    member,
    bundle: bundlesByUserId?.[member.userId] ?? null,
    competitionKey,
    matchNumber,
    reference,
    currentUserId,
  }))
  const visible = lines.filter(line => line.visibility === 'visible')
  const community = new Map()
  for (const line of visible) {
    const key = line.advancingTeamId ?? (line.score ? `score:${line.score}` : 'other')
    const label = line.advancingTeamLabel ?? line.score ?? 'Other selection'
    const current = community.get(key) ?? { key, label, count: 0 }
    current.count += 1
    community.set(key, current)
  }
  const totalVisible = visible.length
  const communityRows = [...community.values()]
    .map(row => ({ ...row, percent: totalVisible > 0 ? Math.round((row.count / totalVisible) * 100) : 0 }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))

  return Object.freeze({
    competitionKey,
    memberCount: lines.length,
    visibleCount: visible.length,
    privateCount: lines.filter(line => line.visibility === 'private').length,
    notSavedCount: lines.filter(line => line.visibility === 'not_saved').length,
    lines: freezeRows(lines.sort((left, right) => right.maximumPoints - left.maximumPoints || left.rank - right.rank)),
    community: freezeRows(communityRows),
  })
}

export function defaultMatchNumber(reference, liveSnapshot) {
  const all = [...reference.groupMatches, ...reference.knockoutMatches].sort((left, right) => left.matchNumber - right.matchNumber)
  const live = all.find(match => STARTED_STATUSES.has(resultFor(liveSnapshot, match.matchId)?.status) && ['live', 'paused'].includes(resultFor(liveSnapshot, match.matchId)?.status))
  if (live) return live.matchNumber
  const upcoming = all.find(match => !resultFor(liveSnapshot, match.matchId)?.confirmed)
  return (upcoming ?? all.at(-1))?.matchNumber ?? 1
}
