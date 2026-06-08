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
        .select('id, status, home_score, away_score, use_manual_override, stage, home_team_id, away_team_id')
        .eq('external_match_id', match.id.toString())
        .maybeSingle()

      // Fallback: match by normalised team names + date
      if (!ourMatch) {
        const homeDb = normalise(match.homeTeam?.name || '')
        const awayDb = normalise(match.awayTeam?.name || '')
        const matchDate = match.utcDate?.substring(0, 10)

        const { data: candidates } = await supabase
          .from('matches')
          .select('id, status, home_score, away_score, use_manual_override, stage, home_team:home_team_id(name), away_team:away_team_id(name), kickoff_time')
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

      // Snapshot ranks when a match first goes live
      // This gives us a baseline to show rank movement during the match
      if (newStatus === 'live' && ourMatch.status === 'scheduled') {
        await supabase.rpc('snapshot_user_ranks').catch(() => {})
      }

      // Derive winner_team_id and outcome_type for knockout scoring
      // football-data.org: score.winner = HOME_TEAM | AWAY_TEAM | DRAW
      // score.duration = REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
      let winnerTeamId = null
      let outcomeType = '90mins'
      const isKnockoutStage = ['r32','r16','qf','sf','3rd','final'].includes(ourMatch.stage)

      if (match.status === 'FINISHED' && isKnockoutStage) {
        const winner = match.score?.winner
        const duration = match.score?.duration

        // Map duration to our outcome_type
        if (duration === 'EXTRA_TIME') outcomeType = 'et'
        else if (duration === 'PENALTY_SHOOTOUT') outcomeType = 'penalties'
        else outcomeType = '90mins'

        // Resolve winner team ID
        if (winner === 'HOME_TEAM') {
          winnerTeamId = ourMatch.home_team_id
        } else if (winner === 'AWAY_TEAM') {
          winnerTeamId = ourMatch.away_team_id
        }
        // DRAW at 90mins shouldn't happen in knockout — winner will be set after ET/PENS
      }

      const updateFields = {
        home_score: homeScore,
        away_score: awayScore,
        status: newStatus,
        external_match_id: match.id.toString(),
        api_synced_at: new Date().toISOString(),
      }

      // Only write knockout-specific fields for knockout stages
      if (isKnockoutStage && match.status === 'FINISHED') {
        if (winnerTeamId) updateFields.winner_team_id = winnerTeamId
        updateFields.outcome_type = outcomeType
      }

      const { error } = await supabase.from('matches').update(updateFields).eq('id', ourMatch.id)

      if (error) { errors.push(error.message); continue }
      updated++

      if (match.status === 'FINISHED' && ourMatch.status !== 'completed') {
        // Use appropriate scoring function based on stage
        const isKnockout = ['r32','r16','qf','sf','3rd','final'].includes(ourMatch.stage)
        if (isKnockout) {
          // Score main knockout bracket picks (team advancement)
          await supabase.rpc('calculate_knockout_points', { p_match_id: ourMatch.id })
          // Score KO Predictor picks (score/ET/PENS predictions) — separate game
          await supabase.rpc('calculate_ko_prediction_points', { p_match_id: ourMatch.id }).catch(() => {})
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

    // Sync top scorers
    try {
      const scorersRes = await fetch(
        'https://api.football-data.org/v4/competitions/WC/scorers?season=2026&limit=10',
        { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } }
      )
      if (scorersRes.ok) {
        const scorersData = await scorersRes.json()
        const scorers = scorersData.scorers || []
        // Delete existing and re-insert fresh
        await supabase.from('tournament_scorers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (scorers.length > 0) {
          await supabase.from('tournament_scorers').insert(
            scorers.map(s => ({
              player_name: s.player?.name || '',
              player_id: s.player?.id || null,
              team_name: normalise(s.team?.name || ''),
              goals: s.goals || 0,
              assists: s.assists || 0,
              penalties: s.penalties || 0,
              updated_at: new Date().toISOString(),
            }))
          )
        }
      }
    } catch(e) { errors.push(`Scorers sync failed: ${e.message}`) }

    // Update last sync time
    await supabase.from('app_settings')
      .upsert({ key: 'last_sync_at', value: new Date().toISOString() }, { onConflict: 'key' })

    return { statusCode: 200, body: JSON.stringify({ message: 'Sync complete', updated, pointsCalculated, errors }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}