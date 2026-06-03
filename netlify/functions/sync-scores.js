import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// football-data.org name → our DB name
const API_TO_DB = {
  'Czech Republic': 'Czechia',
  'Turkey': 'Türkiye',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'USA': 'United States',
  'United States of America': 'United States',
  "Côte d'Ivoire": 'Ivory Coast',
  'Curaçao': 'Curacao',
  'Curacao': 'Curacao',
  'Cape Verde Islands': 'Cape Verde',
  'Cape Verde': 'Cape Verde',
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'South Korea': 'South Korea',
  'DR Congo': 'DR Congo',
  'Congo DR': 'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'Congo, DR': 'DR Congo',
  'North Macedonia': 'North Macedonia',
  'Macedonia': 'North Macedonia',
}

const normalise = (name) => API_TO_DB[name] || name

const stripAccents = (str) => str
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]/g, '')
  .trim()

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
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } }
    )

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const matches = data.matches || []
    let updated = 0
    let pointsCalculated = 0
    const errors = []

    for (const match of matches) {
      if (!['FINISHED', 'IN_PLAY', 'PAUSED'].includes(match.status)) continue

      const homeScore = match.score?.fullTime?.home ?? match.score?.halfTime?.home
      const awayScore = match.score?.fullTime?.away ?? match.score?.halfTime?.away
      if (homeScore === null || homeScore === undefined) continue

      // Try matching by external_match_id first (most reliable)
      let { data: ourMatch } = await supabase
        .from('matches')
        .select('id, status, home_score, away_score, use_manual_override')
        .eq('external_match_id', match.id.toString())
        .maybeSingle()

      // Fallback: match by normalised team names + date
      if (!ourMatch) {
        const homeDb = normalise(match.homeTeam?.name || '')
        const awayDb = normalise(match.awayTeam?.name || '')
        const matchDate = match.utcDate?.substring(0, 10)

        const { data: candidates } = await supabase
          .from('matches')
          .select('id, status, home_score, away_score, use_manual_override, home_team:home_team_id(name), away_team:away_team_id(name), kickoff_time')
          .gte('kickoff_time', `${matchDate}T00:00:00Z`)
          .lte('kickoff_time', `${matchDate}T23:59:59Z`)

        ourMatch = candidates?.find(c => {
          const h = stripAccents(c.home_team?.name || '')
          const a = stripAccents(c.away_team?.name || '')
          const apiH = stripAccents(homeDb)
          const apiA = stripAccents(awayDb)
          return (h === apiH && a === apiA) || (h === apiA && a === apiH)
        }) || null

        // If found by name, store the external_match_id for future syncs
        if (ourMatch) {
          await supabase.from('matches')
            .update({ external_match_id: match.id.toString() })
            .eq('id', ourMatch.id)
        }
      }

      if (!ourMatch || ourMatch.use_manual_override) continue
      if (ourMatch.status === 'completed' && ourMatch.home_score === homeScore && ourMatch.away_score === awayScore) continue

      const newStatus = match.status === 'FINISHED' ? 'completed' : 'live'

      const { error } = await supabase.from('matches').update({
        home_score: homeScore,
        away_score: awayScore,
        status: newStatus,
        external_match_id: match.id.toString(),
        api_synced_at: new Date().toISOString(),
      }).eq('id', ourMatch.id)

      if (error) { errors.push(error.message); continue }
      updated++

      if (match.status === 'FINISHED' && ourMatch.status !== 'completed') {
        // Use appropriate scoring function based on stage
        const isKnockout = ['r32','r16','qf','sf','3rd','final'].includes(ourMatch.stage)
        if (isKnockout) {
          await supabase.rpc('calculate_knockout_points', { p_match_id: ourMatch.id })
        } else {
          await supabase.rpc('calculate_prediction_points', { p_match_id: ourMatch.id })
        }
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

    // Update last sync time
    await supabase.from('app_settings')
      .upsert({ key: 'last_sync_at', value: new Date().toISOString() }, { onConflict: 'key' })

    return { statusCode: 200, body: JSON.stringify({ message: 'Sync complete', updated, pointsCalculated, errors }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}