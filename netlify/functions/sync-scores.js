import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export const handler = async (event, context) => {
  const { data: settings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'live_api_enabled')
    .single()

  if (settings?.value !== 'true') {
    return { statusCode: 200, body: JSON.stringify({ message: 'Live API disabled' }) }
  }

  try {
    const response = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': process.env.VITE_FOOTBALL_DATA_KEY } }
    )

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const matches = data.matches || []
    let updated = 0
    let pointsCalculated = 0

    for (const match of matches) {
      if (!['FINISHED', 'IN_PLAY', 'PAUSED'].includes(match.status)) continue

      const homeScore = match.score?.fullTime?.home ?? match.score?.halfTime?.home
      const awayScore = match.score?.fullTime?.away ?? match.score?.halfTime?.away
      if (homeScore === null || homeScore === undefined) continue

      const { data: ourMatch } = await supabase
        .from('matches')
        .select('id, status, home_score, away_score, use_manual_override')
        .eq('external_match_id', match.id.toString())
        .maybeSingle()

      if (!ourMatch || ourMatch.use_manual_override) continue
      if (ourMatch.status === 'completed' && ourMatch.home_score === homeScore && ourMatch.away_score === awayScore) continue

      const newStatus = match.status === 'FINISHED' ? 'completed' : 'live'

      await supabase.from('matches').update({
        home_score: homeScore,
        away_score: awayScore,
        status: newStatus,
        external_match_id: match.id.toString(),
        api_synced_at: new Date().toISOString(),
      }).eq('id', ourMatch.id)

      updated++

      if (match.status === 'FINISHED' && ourMatch.status !== 'completed') {
        await supabase.rpc('calculate_prediction_points', { p_match_id: ourMatch.id })
        pointsCalculated++

        const { data: preds } = await supabase
          .from('predictions')
          .select('user_id')
          .eq('match_id', ourMatch.id)

        for (const pred of preds || []) {
          await supabase.rpc('recalculate_user_total_points', { p_user_id: pred.user_id })
        }
      }
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Sync complete', updated, pointsCalculated }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}