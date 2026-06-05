// snapshot-league-predictions.js
// Takes a snapshot of all member predictions for pre_tournament locked leagues
// Called automatically at 11 Jun 13:00 UK time, or manually from Admin Panel

const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  // Allow POST (manual trigger from admin) or scheduled
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Get all pre_tournament leagues that haven't been snapshotted yet
    const { data: leagues, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, lock_type, snapshot_taken_at')
      .eq('lock_type', 'pre_tournament')
      .is('snapshot_taken_at', null)

    if (leagueError) throw leagueError
    if (!leagues?.length) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No leagues to snapshot', count: 0 }) }
    }

    let totalSnapshotted = 0

    for (const league of leagues) {
      // Get all members of this league
      const { data: members } = await supabase
        .from('league_members')
        .select('user_id')
        .eq('league_id', league.id)

      if (!members?.length) continue

      const memberIds = members.map(m => m.user_id)

      // Get all predictions for these members
      const { data: predictions } = await supabase
        .from('predictions')
        .select('user_id, match_id, home_score, away_score, is_confident')
        .in('user_id', memberIds)

      if (!predictions?.length) continue

      // Also get offline player predictions for this league
      const { data: offlinePlayers } = await supabase
        .from('offline_players')
        .select('id')
        .eq('league_id', league.id)

      const offlineIds = offlinePlayers?.map(p => p.id) || []

      let offlinePredictions = []
      if (offlineIds.length) {
        const { data: offPreds } = await supabase
          .from('offline_predictions')
          .select('offline_player_id, match_id, home_score, away_score, is_confident')
          .in('offline_player_id', offlineIds)
        offlinePredictions = offPreds || []
      }

      // Build snapshot rows
      const snapshotRows = [
        ...predictions.map(p => ({
          league_id: league.id,
          user_id: p.user_id,
          match_id: p.match_id,
          home_score: p.home_score,
          away_score: p.away_score,
          is_confident: p.is_confident || false,
          committed_at: new Date().toISOString(),
        })),
        ...offlinePredictions.map(p => ({
          league_id: league.id,
          user_id: p.offline_player_id,
          match_id: p.match_id,
          home_score: p.home_score,
          away_score: p.away_score,
          is_confident: p.is_confident || false,
          committed_at: new Date().toISOString(),
        }))
      ]

      // Insert snapshot
      const { error: insertError } = await supabase
        .from('league_predictions')
        .upsert(snapshotRows, { onConflict: 'league_id,user_id,match_id' })

      if (insertError) {
        console.error(`Error snapshotting league ${league.name}:`, insertError)
        continue
      }

      // Mark league as snapshotted
      await supabase.from('leagues')
        .update({ snapshot_taken_at: new Date().toISOString() })
        .eq('id', league.id)

      totalSnapshotted += snapshotRows.length
      console.log(`Snapshotted ${snapshotRows.length} predictions for league "${league.name}"`)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Snapshot complete`,
        leagues: leagues.length,
        predictions: totalSnapshotted
      })
    }

  } catch (e) {
    console.error('Snapshot error:', e)
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) }
  }
}
