// netlify/functions/sync-scores.js
// Scheduled function — runs every 5 minutes during tournament
// Set up in Netlify: Functions > sync-scores > Schedule: */5 * * * *

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // needs service key for admin writes
)

const FOOTBALL_DATA_KEY = process.env.VITE_FOOTBALL_DATA_KEY
const WC2026_ID = 'WC' // football-data.org competition code

exports.handler = async (event, context) => {
  // Check if live API is enabled in app settings
  const { data: settings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'live_api_enabled')
    .single()

  if (settings?.value !== 'true') {
    return { statusCode: 200, body: JSON.stringify({ message: 'Live API disabled' }) }
  }

  try {
    // Fetch all World Cup matches from football-data.org
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/WC/matches?season=2026`,
      {
        headers: {
          'X-Auth-Token': FOOTBALL_DATA_KEY,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Football-data API error: ${response.status}`)
    }

    const data = await response.json()
    const matches = data.matches || []

    let updated = 0
    let pointsCalculated = 0

    for (const match of matches) {
      // Only process finished or in-play matches
      if (!['FINISHED', 'IN_PLAY', 'PAUSED'].includes(match.status)) continue

      const homeScore = match.score?.fullTime?.home ?? match.score?.halfTime?.home
      const awayScore = match.score?.fullTime?.away ?? match.score?.halfTime?.away

      if (homeScore === null || homeScore === undefined) continue

      // Find our match by match number or external ID
      const { data: ourMatch } = await supabase
        .from('matches')
        .select('id, status, home_score, away_score, use_manual_override, match_number')
        .eq('external_match_id', match.id.toString())
        .single()

      // Also try matching by match number if no external ID
      let matchRecord = ourMatch
      if (!matchRecord) {
        const { data: byNumber } = await supabase
          .from('matches')
          .select('id, status, home_score, away_score, use_manual_override, match_number')
          .eq('match_number', match.matchday)
          .single()
        matchRecord = byNumber
      }

      if (!matchRecord) continue

      // Skip if admin has manually overridden this match
      if (matchRecord.use_manual_override) continue

      // Skip if already finished with same score
      if (matchRecord.status === 'completed' &&
          matchRecord.home_score === homeScore &&
          matchRecord.away_score === awayScore) continue

      const newStatus = match.status === 'FINISHED' ? 'completed' :
                        match.status === 'IN_PLAY' ? 'live' : 'live'

      const winnerId = match.status === 'FINISHED' && homeScore !== awayScore
        ? (homeScore > awayScore ? null : null) // we'll look up team IDs
        : null

      // Update match
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: newStatus,
          external_match_id: match.id.toString(),
          api_synced_at: new Date().toISOString(),
        })
        .eq('id', matchRecord.id)

      if (updateError) {
        console.error('Error updating match:', matchRecord.id, updateError)
        continue
      }

      updated++

      // Calculate points for completed matches
      if (match.status === 'FINISHED' && matchRecord.status !== 'completed') {
        const { error: pointsError } = await supabase.rpc(
          'calculate_prediction_points',
          { p_match_id: matchRecord.id }
        )

        if (!pointsError) {
          pointsCalculated++

          // Recalculate all affected users' totals
          const { data: affectedPreds } = await supabase
            .from('predictions')
            .select('user_id')
            .eq('match_id', matchRecord.id)

          if (affectedPreds) {
            for (const pred of affectedPreds) {
              await supabase.rpc('recalculate_user_total_points', {
                p_user_id: pred.user_id
              })
            }
          }
        }
      }
    }

    // Log sync to admin audit
    await supabase.from('admin_audit_log').insert({
      admin_id: null,
      action: 'auto_sync_scores',
      old_value: null,
      new_value: { updated, pointsCalculated, timestamp: new Date().toISOString() }
    }).catch(() => {}) // don't fail if log fails

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Sync complete',
        matchesUpdated: updated,
        pointsCalculated,
      })
    }
  } catch (error) {
    console.error('Sync error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}