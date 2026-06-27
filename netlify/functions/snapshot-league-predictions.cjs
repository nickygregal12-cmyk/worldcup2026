// snapshot-league-predictions.js
// Takes a snapshot of all member predictions for pre_tournament locked leagues.
// Called automatically by Supabase pg_cron, or manually from Admin Panel.

const { createClient } = require('@supabase/supabase-js')

const nowIso = () => new Date().toISOString()

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const requireEnv = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error('Missing Supabase URL env var: set VITE_SUPABASE_URL or SUPABASE_URL in Netlify')
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_KEY env var in Netlify')

  return { supabaseUrl, serviceKey }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const { supabaseUrl, serviceKey } = requireEnv()
    const supabase = createClient(supabaseUrl, serviceKey)

    let requestedLeagueId = null
    if (event.httpMethod === 'POST' && event.body) {
      try {
        const body = JSON.parse(event.body)
        requestedLeagueId = body.league_id || body.leagueId || null
      } catch (_) {
        requestedLeagueId = null
      }
    }

    let leagueQuery = supabase
      .from('leagues')
      .select('id, name, lock_type, snapshot_taken_at')
      .eq('lock_type', 'pre_tournament')
      .is('snapshot_taken_at', null)

    if (requestedLeagueId) leagueQuery = leagueQuery.eq('id', requestedLeagueId)

    const { data: leagues, error: leagueError } = await leagueQuery
    if (leagueError) throw new Error(`Failed to load leagues: ${leagueError.message}`)

    if (!leagues?.length) {
      return json(requestedLeagueId ? 404 : 200, {
        message: requestedLeagueId ? 'League is not pending a pre-tournament snapshot' : 'No leagues to snapshot',
        count: 0,
      })
    }

    const totals = {
      leagues: 0,
      matchPredictions: 0,
      knockoutPicks: 0,
      awardPredictions: 0,
      tournamentPredictions: 0,
      offlinePredictions: 0,
    }

    const leagueResults = []

    for (const league of leagues) {
      const committedAt = nowIso()
      const result = {
        league_id: league.id,
        league_name: league.name,
        matchPredictions: 0,
        offlinePredictions: 0,
        knockoutPicks: 0,
        awardPredictions: 0,
        tournamentPredictions: 0,
      }

      const { data: members, error: membersError } = await supabase
        .from('league_members')
        .select('user_id')
        .eq('league_id', league.id)

      if (membersError) throw new Error(`Failed to load members for ${league.name}: ${membersError.message}`)
      if (!members?.length) {
        leagueResults.push({ ...result, skipped: 'No league members' })
        continue
      }

      const memberIds = members.map(m => m.user_id).filter(Boolean)

      // 1) Group/match score predictions
      const { data: predictions, error: predictionsError } = await supabase
        .from('predictions')
        .select('user_id, match_id, home_score, away_score, is_confident')
        .in('user_id', memberIds)

      if (predictionsError) throw new Error(`Failed to load match predictions for ${league.name}: ${predictionsError.message}`)

      const matchRows = (predictions || []).map(p => ({
        league_id: league.id,
        user_id: p.user_id,
        match_id: p.match_id,
        home_score: p.home_score,
        away_score: p.away_score,
        is_confident: p.is_confident || false,
        committed_at: committedAt,
      }))

      // 2) Offline player match predictions
      const { data: offlinePlayers, error: offlinePlayersError } = await supabase
        .from('offline_players')
        .select('id')
        .eq('league_id', league.id)

      if (offlinePlayersError) throw new Error(`Failed to load offline players for ${league.name}: ${offlinePlayersError.message}`)

      const offlineIds = offlinePlayers?.map(p => p.id).filter(Boolean) || []
      let offlineRows = []

      if (offlineIds.length) {
        const { data: offPreds, error: offPredsError } = await supabase
          .from('offline_predictions')
          .select('offline_player_id, match_id, home_score, away_score, is_confident')
          .in('offline_player_id', offlineIds)

        if (offPredsError) throw new Error(`Failed to load offline predictions for ${league.name}: ${offPredsError.message}`)

        offlineRows = (offPreds || []).map(p => ({
          league_id: league.id,
          user_id: p.offline_player_id,
          match_id: p.match_id,
          home_score: p.home_score,
          away_score: p.away_score,
          is_confident: p.is_confident || false,
          committed_at: committedAt,
        }))
      }

      const allMatchRows = [...matchRows, ...offlineRows]
      if (allMatchRows.length) {
        const { error: insertMatchError } = await supabase
          .from('league_predictions')
          .upsert(allMatchRows, { onConflict: 'league_id,user_id,match_id' })

        if (insertMatchError) throw new Error(`Failed to snapshot match predictions for ${league.name}: ${insertMatchError.message}`)
      }

      result.matchPredictions = matchRows.length
      result.offlinePredictions = offlineRows.length
      totals.matchPredictions += matchRows.length
      totals.offlinePredictions += offlineRows.length

      // 3) Knockout picks
      const { data: knockoutPicks, error: koError } = await supabase
        .from('knockout_picks')
        .select('id, user_id, stage, team_id, is_joker, match_number, home_team_id, away_team_id, winner_team_id, result_type')
        .in('user_id', memberIds)

      if (koError) throw new Error(`Failed to load knockout picks for ${league.name}: ${koError.message}`)

      const koRows = (knockoutPicks || []).map(p => ({
        league_id: league.id,
        user_id: p.user_id,
        source_pick_id: p.id,
        stage: p.stage,
        team_id: p.team_id,
        is_joker: p.is_joker || false,
        match_number: p.match_number,
        home_team_id: p.home_team_id,
        away_team_id: p.away_team_id,
        winner_team_id: p.winner_team_id,
        result_type: p.result_type,
        committed_at: committedAt,
      })).filter(p => p.match_number !== null && p.match_number !== undefined)

      if (koRows.length) {
        const { error: insertKoError } = await supabase
          .from('league_knockout_picks')
          .upsert(koRows, { onConflict: 'league_id,user_id,match_number' })

        if (insertKoError) throw new Error(`Failed to snapshot knockout picks for ${league.name}: ${insertKoError.message}`)
      }

      result.knockoutPicks = koRows.length
      totals.knockoutPicks += koRows.length

      // 4) Award predictions
      const { data: awardPredictions, error: awardError } = await supabase
        .from('award_predictions')
        .select('id, user_id, award_type, bracket_type, predicted_player_name, predicted_team_id, points_awarded, is_correct, is_locked, submitted_at')
        .in('user_id', memberIds)

      if (awardError) throw new Error(`Failed to load award predictions for ${league.name}: ${awardError.message}`)

      const awardRows = (awardPredictions || []).map(p => ({
        league_id: league.id,
        user_id: p.user_id,
        source_prediction_id: p.id,
        award_type: p.award_type,
        bracket_type: p.bracket_type || 'main',
        predicted_player_name: p.predicted_player_name,
        predicted_team_id: p.predicted_team_id,
        points_awarded: p.points_awarded || 0,
        is_correct: p.is_correct,
        is_locked: true,
        submitted_at: p.submitted_at,
        committed_at: committedAt,
      })).filter(p => p.award_type)

      if (awardRows.length) {
        const { error: insertAwardError } = await supabase
          .from('league_award_predictions')
          .upsert(awardRows, { onConflict: 'league_id,user_id,award_type,bracket_type' })

        if (insertAwardError) throw new Error(`Failed to snapshot award predictions for ${league.name}: ${insertAwardError.message}`)
      }

      result.awardPredictions = awardRows.length
      totals.awardPredictions += awardRows.length

      // 5) Tournament/goal predictions
      const { data: tournamentPredictions, error: tournamentError } = await supabase
        .from('tournament_predictions')
        .select('id, user_id, prediction_type, int_value, team_id, is_locked, created_at, updated_at')
        .in('user_id', memberIds)
        .eq('prediction_type', 'total_goals')

      if (tournamentError) throw new Error(`Failed to load tournament predictions for ${league.name}: ${tournamentError.message}`)

      const tournamentRows = (tournamentPredictions || []).map(p => ({
        league_id: league.id,
        user_id: p.user_id,
        source_prediction_id: p.id,
        prediction_type: p.prediction_type,
        int_value: p.int_value,
        team_id: p.team_id,
        is_locked: true,
        source_created_at: p.created_at,
        source_updated_at: p.updated_at,
        committed_at: committedAt,
      })).filter(p => p.prediction_type)

      if (tournamentRows.length) {
        const { error: insertTournamentError } = await supabase
          .from('league_tournament_predictions')
          .upsert(tournamentRows, { onConflict: 'league_id,user_id,prediction_type,team_id' })

        if (insertTournamentError) throw new Error(`Failed to snapshot tournament predictions for ${league.name}: ${insertTournamentError.message}`)
      }

      result.tournamentPredictions = tournamentRows.length
      totals.tournamentPredictions += tournamentRows.length

      const { error: updateLeagueError } = await supabase
        .from('leagues')
        .update({ snapshot_taken_at: committedAt })
        .eq('id', league.id)

      if (updateLeagueError) throw new Error(`Failed to mark ${league.name} as snapshotted: ${updateLeagueError.message}`)

      totals.leagues += 1
      leagueResults.push(result)
      console.log(`Snapshot complete for ${league.name}:`, result)
    }

    return json(200, {
      message: 'Snapshot complete',
      leagues: totals.leagues,
      predictions: totals.matchPredictions + totals.offlinePredictions,
      matchPredictions: totals.matchPredictions,
      offlinePredictions: totals.offlinePredictions,
      knockoutPicks: totals.knockoutPicks,
      awardPredictions: totals.awardPredictions,
      tournamentPredictions: totals.tournamentPredictions,
      results: leagueResults,
    })
  } catch (e) {
    console.error('Snapshot error:', e)
    return json(500, { error: e.message || 'Snapshot failed' })
  }
}
