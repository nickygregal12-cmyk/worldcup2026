import { buildCanonicalResultFeed } from '../results/resultModel.js'

function freezeRows(rows = []) {
  return Object.freeze(rows.map(row => Object.freeze(row)))
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function bool(value) {
  return Boolean(value)
}

export function normaliseTeamProfilePayload(raw = {}, fallbackTeam = null) {
  const team = raw.team ?? {}
  const curated = raw.curated ?? {}
  const predictions = raw.predictions ?? {}
  const aggregates = predictions.aggregates ?? null
  const viewer = predictions.viewer_prediction ?? null

  return Object.freeze({
    team: Object.freeze({
      tournamentTeamId: team.tournament_team_id ?? fallbackTeam?.tournamentTeamId ?? fallbackTeam?.teamId ?? null,
      actualTeamId: team.team_id ?? fallbackTeam?.actualTeamId ?? null,
      name: team.name ?? fallbackTeam?.label ?? 'Team',
      shortName: team.short_name ?? team.name ?? fallbackTeam?.label ?? 'Team',
      isoCode: team.iso_code ?? fallbackTeam?.isoCode ?? null,
      slotCode: team.slot_code ?? fallbackTeam?.slotCode ?? null,
      groupCode: team.group_code ?? null,
      qualificationStatus: team.qualification_status ?? null,
      isHost: bool(team.is_host),
      isProvisional: bool(team.is_provisional ?? fallbackTeam?.isProvisional),
    }),
    curated: Object.freeze({
      status: curated.status === 'ready' ? 'ready' : 'empty',
      ranking: numberOrNull(curated.ranking),
      qualifyingRoute: curated.qualifying_route ?? null,
      bestEuroFinish: curated.best_euro_finish ?? null,
      editorialNote: curated.editorial_note ?? null,
      profileRevision: Number(curated.profile_revision ?? 0),
      updatedAt: curated.updated_at ?? null,
    }),
    predictions: Object.freeze({
      aggregatesVisible: bool(predictions.aggregates_visible),
      visibilityReason: predictions.visibility_reason ?? null,
      eligiblePredictionCount: numberOrNull(predictions.eligible_prediction_count),
      aggregates: aggregates ? Object.freeze({
        groupWinnerPercentage: numberOrNull(aggregates.group_winner_percentage),
        roundOf16Percentage: numberOrNull(aggregates.round_of_16_percentage),
        quarterFinalPercentage: numberOrNull(aggregates.quarter_final_percentage),
        semiFinalPercentage: numberOrNull(aggregates.semi_final_percentage),
        finalPercentage: numberOrNull(aggregates.final_percentage),
        championPercentage: numberOrNull(aggregates.champion_percentage),
      }) : null,
      viewerPrediction: viewer ? Object.freeze({
        hasOriginalPredictionSet: bool(viewer.has_original_prediction_set),
        bracketPickCount: Number(viewer.bracket_pick_count ?? 0),
        predictedGroupWinner: bool(viewer.predicted_group_winner),
        predictedRoundOf16: bool(viewer.predicted_round_of_16),
        predictedQuarterFinal: bool(viewer.predicted_quarter_final),
        predictedSemiFinal: bool(viewer.predicted_semi_final),
        predictedFinal: bool(viewer.predicted_final),
        predictedChampion: bool(viewer.predicted_champion),
      }) : null,
    }),
  })
}

function outcomeForTeam(row, teamId) {
  if (!row?.score || !row.homeTeamId || !row.awayTeamId) return null
  const [home, away] = row.score.split('–').map(Number)
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null
  if (home === away) return 'D'
  const teamWon = row.homeTeamId === teamId ? home > away : away > home
  return teamWon ? 'W' : 'L'
}

export function buildTeamTournamentSummary({ reference, liveSnapshot, tournamentTeamId }) {
  if (!reference?.tournamentId || !tournamentTeamId) {
    return Object.freeze({ status: 'empty', group: null, results: Object.freeze([]), nextFixture: null })
  }

  const group = reference.groups.find(candidate => candidate.teams.some(team => team.teamId === tournamentTeamId)) ?? null
  const table = group ? liveSnapshot?.groups?.[group.code] ?? null : null
  const row = table?.rows?.find(candidate => candidate.teamId === tournamentTeamId) ?? null
  const feed = buildCanonicalResultFeed({ reference, liveSnapshot })
  const teamRows = feed.rows.filter(match => match.homeTeamId === tournamentTeamId || match.awayTeamId === tournamentTeamId)
  const results = teamRows
    .filter(match => ['live', 'completed'].includes(match.state))
    .map(match => ({ ...match, outcome: match.state === 'completed' ? outcomeForTeam(match, tournamentTeamId) : null }))
  const nextFixture = teamRows.find(match => match.state === 'upcoming') ?? null

  return Object.freeze({
    status: liveSnapshot ? 'ready' : 'empty',
    group: group ? Object.freeze({
      code: group.code,
      position: row?.rank ?? null,
      played: row?.played ?? 0,
      wins: row?.wins ?? 0,
      draws: row?.draws ?? 0,
      losses: row?.losses ?? 0,
      goalsFor: row?.goalsFor ?? 0,
      goalsAgainst: row?.goalsAgainst ?? 0,
      goalDifference: row?.goalDifference ?? 0,
      points: row?.points ?? 0,
      positionProvisional: Boolean(row?.previewFallbackUsed),
    }) : null,
    results: freezeRows(results),
    nextFixture: nextFixture ? Object.freeze(nextFixture) : null,
  })
}

export function mergeTeamProfileSections({ contentResult, tournamentResult, fallbackTeam }) {
  const contentReady = contentResult.status === 'fulfilled'
  const tournamentReady = tournamentResult.status === 'fulfilled'
  const profile = contentReady
    ? normaliseTeamProfilePayload(contentResult.value, fallbackTeam)
    : normaliseTeamProfilePayload({}, fallbackTeam)
  const tournament = tournamentReady
    ? tournamentResult.value
    : Object.freeze({ status: 'error', group: null, results: Object.freeze([]), nextFixture: null })

  const errors = []
  if (!contentReady) errors.push(contentResult.reason instanceof Error ? contentResult.reason.message : String(contentResult.reason))
  if (!tournamentReady) errors.push(tournamentResult.reason instanceof Error ? tournamentResult.reason.message : String(tournamentResult.reason))

  return Object.freeze({
    status: errors.length === 0 ? 'ready' : (contentReady || tournamentReady ? 'partial' : 'error'),
    profile,
    tournament,
    errors: Object.freeze(errors),
  })
}


export function buildTeamProfileLifecycle({ lifecycle, predictions } = {}) {
  const locked = Boolean(lifecycle?.locked)
  const aggregatesVisible = Boolean(predictions?.aggregatesVisible)

  if (!locked && !aggregatesVisible) {
    return Object.freeze({
      state: 'original_aggregates_private_until_lock',
      label: 'Original Predictor privacy',
      copy: 'Community prediction percentages unlock after the Original Predictor closes. Team profiles use Original Predictor bracket picks only; KO Predictor data stays separate.',
    })
  }

  if (aggregatesVisible) {
    return Object.freeze({
      state: 'original_aggregates_released',
      label: 'Original Predictor aggregates',
      copy: 'Community percentages use complete Original Predictor brackets only. This view only uses Original Predictor team picks, so KO Predictor points stay out of it.',
    })
  }

  return Object.freeze({
    state: 'original_aggregates_server_protected',
    label: 'Prediction privacy',
    copy: 'Community prediction percentages remain hidden until the authorised read model releases them. This view only uses Original Predictor team picks, so KO Predictor points stay out of it.',
  })
}

export const TEAM_PROFILE_MILESTONES = Object.freeze([
  ['groupWinnerPercentage', 'Win group'],
  ['roundOf16Percentage', 'Reach Round of 16'],
  ['quarterFinalPercentage', 'Reach quarter-finals'],
  ['semiFinalPercentage', 'Reach semi-finals'],
  ['finalPercentage', 'Reach final'],
  ['championPercentage', 'Win EURO 2028'],
])
