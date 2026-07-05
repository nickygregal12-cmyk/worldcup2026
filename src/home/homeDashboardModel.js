import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'
import { buildKoReadiness } from '../app/koReadiness.js'
import { resolveTournamentLifecycle } from '../config/tournamentLifecycle.js'
import { getNow } from '../lib/clock.js'

function completedOriginalRows(bundle) {
  const rows = bundle?.predictions ?? []
  return {
    groups: rows.filter(row => row.prediction_kind === 'group_score' && Number.isInteger(row.home_score_90) && Number.isInteger(row.away_score_90)).length,
    bracket: rows.filter(row => row.prediction_kind === 'bracket_pick' && row.advancing_tournament_team_id).length,
  }
}

function completedKoRows(bundle) {
  return (bundle?.predictions ?? []).filter(row => (
    Number.isInteger(row.home_score_90) &&
    Number.isInteger(row.away_score_90) &&
    row.advancing_tournament_team_id &&
    row.decision_method
  )).length
}

function pointsValue(results, competitionKey) {
  const key = competitionKey === 'koPredictor' ? 'koPredictor' : 'original'
  const points = results?.myPoints?.[key]
  return Number(points?.totalPoints ?? points?.total_points ?? 0)
}

function leaderboardStory(results, competitionKey, userId) {
  const rows = results?.leaderboards?.[competitionKey] ?? []
  const standing = rows.find(entry => entry.userId === userId) ?? null
  const currentPoints = pointsValue(results, competitionKey)
  const totals = rows
    .map(entry => Number(entry.totalPoints ?? entry.total_points))
    .filter(Number.isFinite)
  const leaderPoints = totals.length > 0 ? Math.max(...totals) : currentPoints
  const higherTotals = [...new Set(totals.filter(total => total > currentPoints))].sort((left, right) => left - right)
  const nextHigherPoints = higherTotals[0] ?? null

  return Object.freeze({
    rank: standing?.rank ?? null,
    pointsBehindLeader: Math.max(0, leaderPoints - currentPoints),
    pointsToNextScore: nextHigherPoints == null ? 0 : nextHigherPoints - currentPoints,
    isLeader: rows.length > 0 && currentPoints === leaderPoints,
  })
}


function countdownLabel(targetIso, now) {
  if (!targetIso) return 'Date to be confirmed'
  const target = new Date(targetIso)
  const current = now instanceof Date ? now : new Date(now)
  const diffMs = target.getTime() - current.getTime()
  if (!Number.isFinite(diffMs)) return 'Date to be confirmed'
  if (diffMs <= 0) return 'Now'
  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days >= 2) return `${days} days${hours ? ` ${hours} hours` : ''}`
  if (days === 1) return `1 day${hours ? ` ${hours} hours` : ''}`
  return `${Math.max(1, totalHours)} hour${totalHours === 1 ? '' : 's'}`
}

function lifecyclePhase(lifecycle, now) {
  const current = now instanceof Date ? now : new Date(now)
  const start = lifecycle.tournamentStartAt ? new Date(lifecycle.tournamentStartAt) : null
  if (start && current >= start) {
    return { key: 'live', label: 'Tournament live', tone: 'danger' }
  }
  if (lifecycle.predictionLockedAt) {
    return { key: 'locked', label: 'Predictions locked', tone: 'warning' }
  }
  if (lifecycle.predictionLockAt && current >= new Date(lifecycle.predictionLockAt)) {
    return { key: 'locked', label: 'Predictions locked', tone: 'warning' }
  }
  return { key: 'build', label: 'Build your predictor', tone: 'safe' }
}

function homeStageLabel(match) {
  if (match?.groupCode) return `Group ${match.groupCode}`
  if (match?.matchNumber <= 36) return 'Group stage'
  if (match?.matchNumber <= 44) return 'Round of 16'
  if (match?.matchNumber <= 48) return 'Quarter-finals'
  if (match?.matchNumber <= 50) return 'Semi-finals'
  return 'Final'
}

function homeTeam(reference, teamId, fallback) {
  if (!teamId) {
    return Object.freeze({
      id: null,
      label: fallback,
      isoCode: null,
      unresolved: true,
    })
  }
  const team = reference?.teamsById?.[teamId] ?? {}
  return Object.freeze({
    id: teamId,
    label: team.label ?? team.slotCode ?? fallback,
    isoCode: team.fifaCode ?? team.isoCode ?? null,
    unresolved: Boolean(team.isProvisional || !team.actualTeamId),
  })
}

function matchCentreCompetition(matchNumber) {
  return Number(matchNumber) > 36 ? 'ko_predictor' : 'original'
}

export function buildHomeMatchHub({ reference, match, dataAvailable }) {
  if (!dataAvailable || !match) return null

  const matchNumber = Number(match.matchNumber)
  const competition = matchCentreCompetition(matchNumber)
  const live = match.displayStatus === 'live'
  const home = homeTeam(reference, match.homeTeamId, matchNumber > 36 ? 'Home slot unresolved' : 'Home team TBC')
  const away = homeTeam(reference, match.awayTeamId, matchNumber > 36 ? 'Away slot unresolved' : 'Away team TBC')

  return Object.freeze({
    matchNumber,
    state: live ? 'live' : 'upcoming',
    tone: live ? 'danger' : 'info',
    title: live ? `Match ${matchNumber} is live` : `Match ${matchNumber} is next`,
    timeLabel: live ? 'Live now' : 'Next to watch',
    stageLabel: homeStageLabel(match),
    scheduledDate: match.kickoffAt ?? match.scheduledDate ?? null,
    home,
    away,
    href: `#/match-centre?match=${matchNumber}&competition=${competition}`,
    cta: live ? 'Open live Match Centre' : 'Open Match Centre',
    note: competition === 'original'
      ? 'Group fixtures open with Original Predictor context first.'
      : 'Knockout fixtures open with KO Predictor context first.',
  })
}
function nextMatch(reference, live) {
  const resultByMatch = new Map((live?.results ?? []).map(result => [result.matchNumber, result]))
  const matches = [...reference.groupMatches, ...reference.knockoutMatches]
    .sort((left, right) => left.matchNumber - right.matchNumber)
  const active = matches.find(match => ['live', 'paused'].includes(resultByMatch.get(match.matchNumber)?.status))
  if (active) return { ...active, displayStatus: 'live' }
  const upcoming = matches.find(match => resultByMatch.get(match.matchNumber)?.status !== 'completed')
  return upcoming ? { ...upcoming, displayStatus: 'upcoming' } : null
}

export function buildHomeDashboard({
  tournament,
  reference,
  session,
  profile,
  guestSummary,
  originalBundle,
  koBundle,
  results,
  leagues,
  sectionErrors = {},
  now = getNow(),
}) {
  const userId = session?.user?.id ?? null
  const signedIn = Boolean(userId)
  const original = signedIn
    ? completedOriginalRows(originalBundle)
    : {
        groups: guestSummary?.groupComplete ?? 0,
        bracket: guestSummary?.bracketComplete ?? 0,
      }
  const lifecycle = resolveTournamentLifecycle(tournament, now)
  const phase = lifecyclePhase(lifecycle, now)
  const ko = buildKoReadiness(reference)
  const originalStory = leaderboardStory(results, 'original', userId)
  const koStory = leaderboardStory(results, 'koPredictor', userId)
  const live = results?.live ?? null
  const activeOrNextMatch = nextMatch(reference, live)
  const liveDataAvailable = !sectionErrors.results
  const matchHub = buildHomeMatchHub({
    reference,
    match: activeOrNextMatch,
    dataAvailable: liveDataAvailable,
  })

  return Object.freeze({
    signedIn,
    displayName: profile?.display_name ?? session?.user?.email?.split('@')[0] ?? null,
    tournament: Object.freeze({
      name: tournament.name,
      startsOn: tournament.starts_on,
      endsOn: tournament.ends_on,
      predictionLockAt: lifecycle.predictionLockAt,
      predictionLockedAt: lifecycle.predictionLockedAt,
      unresolvedTeams: Object.values(reference.teamsById).filter(team => team.isProvisional || !team.actualTeamId).length,
      totalTeams: Object.keys(reference.teamsById).length,
      totalMatches: reference.groupMatches.length + reference.knockoutMatches.length,
    }),
    original: Object.freeze({
      groupComplete: original.groups,
      groupTotal: reference.groupMatches.length,
      bracketComplete: original.bracket,
      bracketTotal: reference.knockoutMatches.length,
      totalComplete: original.groups + original.bracket,
      total: reference.groupMatches.length + reference.knockoutMatches.length,
      submittedAt: originalBundle?.submittedAt ?? null,
      revision: Number(originalBundle?.revision ?? 0),
      points: signedIn ? pointsValue(results, 'original') : null,
      rank: signedIn ? originalStory.rank : null,
      pointsBehindLeader: signedIn ? originalStory.pointsBehindLeader : null,
      pointsToNextScore: signedIn ? originalStory.pointsToNextScore : null,
      isLeader: signedIn ? originalStory.isLeader : false,
      jokerCount: signedIn
        ? (originalBundle?.predictions ?? []).filter(row => row.prediction_kind === 'group_score' && row.joker_applied).length
        : guestSummary?.groupJokers ?? 0,
      jokerCap: EURO_SCORING_CONFIG.joker.GROUP_STAGE_CAP,
      dataAvailable: signedIn ? !sectionErrors.original : !sectionErrors.guest,
    }),
    lifecycle: Object.freeze({
      phase: phase.key,
      phaseLabel: phase.label,
      phaseTone: phase.tone,
      predictionLockAt: lifecycle.predictionLockAt,
      predictionLockCountdown: countdownLabel(lifecycle.predictionLockAt, now),
      tournamentStartAt: lifecycle.tournamentStartAt,
      tournamentStartCountdown: countdownLabel(lifecycle.tournamentStartAt, now),
      source: lifecycle.source,
      provisional: lifecycle.provisional,
    }),
    koReadiness: ko,
    koPredictor: Object.freeze({
      available: ko.available,
      complete: signedIn ? completedKoRows(koBundle) : 0,
      total: reference.knockoutMatches.length,
      points: signedIn ? pointsValue(results, 'koPredictor') : null,
      rank: signedIn ? koStory.rank : null,
      pointsBehindLeader: signedIn ? koStory.pointsBehindLeader : null,
      pointsToNextScore: signedIn ? koStory.pointsToNextScore : null,
      isLeader: signedIn ? koStory.isLeader : false,
      jokerCount: signedIn ? (koBundle?.predictions ?? []).filter(row => row.joker_applied).length : 0,
      jokerCap: EURO_SCORING_CONFIG.joker.KO_PREDICTOR_CAP,
      dataAvailable: signedIn ? !sectionErrors.koPredictor : true,
    }),
    leagues: Object.freeze({
      count: signedIn ? (leagues?.length ?? 0) : 0,
      members: signedIn ? (leagues ?? []).reduce((total, league) => total + Number(league.memberCount ?? 0), 0) : 0,
    }),
    live: Object.freeze({
      liveMatches: Number(live?.summary?.liveMatches ?? 0),
      confirmedMatches: Number(live?.summary?.confirmedMatches ?? 0),
      totalMatches: reference.groupMatches.length + reference.knockoutMatches.length,
      nextMatch: activeOrNextMatch,
      matchHub,
      dataAvailable: liveDataAvailable,
    }),
    sectionErrors: Object.freeze({ ...sectionErrors }),
    hasPartialFailure: Object.keys(sectionErrors).length > 0,
  })
}
