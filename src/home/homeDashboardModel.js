import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'

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

function leaderboardRank(results, competitionKey, userId) {
  if (!userId) return null
  const row = results?.leaderboards?.[competitionKey]?.find(entry => entry.userId === userId)
  return row?.rank ?? null
}

function pointsValue(results, competitionKey) {
  const key = competitionKey === 'koPredictor' ? 'koPredictor' : 'original'
  return Number(results?.myPoints?.[key]?.total_points ?? 0)
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
}) {
  const userId = session?.user?.id ?? null
  const signedIn = Boolean(userId)
  const original = signedIn
    ? completedOriginalRows(originalBundle)
    : {
        groups: guestSummary?.groupComplete ?? 0,
        bracket: guestSummary?.bracketComplete ?? 0,
      }
  const availableKoMatches = reference.knockoutMatches.filter(match => match.participantsResolved).length
  const live = results?.live ?? null

  return Object.freeze({
    signedIn,
    displayName: profile?.display_name ?? session?.user?.email?.split('@')[0] ?? null,
    tournament: Object.freeze({
      name: tournament.name,
      startsOn: tournament.starts_on,
      endsOn: tournament.ends_on,
      predictionLockAt: tournament.prediction_lock_at,
      predictionLockedAt: tournament.prediction_locked_at,
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
      rank: signedIn ? leaderboardRank(results, 'original', userId) : null,
      jokerCount: signedIn
        ? (originalBundle?.predictions ?? []).filter(row => row.prediction_kind === 'group_score' && row.joker_applied).length
        : guestSummary?.groupJokers ?? 0,
      jokerCap: EURO_SCORING_CONFIG.joker.GROUP_STAGE_CAP,
      dataAvailable: signedIn ? !sectionErrors.original : !sectionErrors.guest,
    }),
    koPredictor: Object.freeze({
      available: availableKoMatches,
      complete: signedIn ? completedKoRows(koBundle) : 0,
      total: reference.knockoutMatches.length,
      points: signedIn ? pointsValue(results, 'koPredictor') : null,
      rank: signedIn ? leaderboardRank(results, 'koPredictor', userId) : null,
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
      nextMatch: nextMatch(reference, live),
      dataAvailable: !sectionErrors.results,
    }),
    sectionErrors: Object.freeze({ ...sectionErrors }),
    hasPartialFailure: Object.keys(sectionErrors).length > 0,
  })
}
