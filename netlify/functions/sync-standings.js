import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const API_TO_DB = {
  'Czech Republic': 'Czechia',
  'Turkey': 'Türkiye',
  'USA': 'United States',
  'United States of America': 'United States',
  "Côte d'Ivoire": 'Ivory Coast',
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'DR Congo': 'DR Congo',
  'Cape Verde Islands': 'Cape Verde',
}

const normalise = (name) => API_TO_DB[name] || name

export const handler = async (event, context) => {
  // Auth check — reject requests without valid admin secret
  // pg_cron calls pass this header; direct calls from AdminPanel pass it too
  const secret = (event.headers || {})['x-admin-secret']
  if (!process.env.ADMIN_FUNCTION_SECRET || secret !== process.env.ADMIN_FUNCTION_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const response = await fetch(
      'https://api.football-data.org/v4/competitions/WC/standings?season=2026',
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } }
    )

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const allStandings = data.standings || []

    // WC standings returns one flat table of all 48 teams (not per-group)
    // with type=TOTAL, type=HOME, type=AWAY — use TOTAL only
    const totalStanding = allStandings.find(s => s.type === 'TOTAL')
    if (!totalStanding) {
      return { statusCode: 200, body: JSON.stringify({ message: 'Standings synced', updated: 0, note: 'No TOTAL standing found' }) }
    }

    // Get teams and their group assignments from DB
    const { data: teams } = await supabase.from('teams').select('id, name')
    const teamMap = {}
    teams?.forEach(t => { teamMap[t.name.toLowerCase()] = t.id })

    // group_teams links team_id → group_id
    const { data: groupTeams } = await supabase.from('group_teams').select('team_id, group_id')
    const teamGroupMap = {}
    groupTeams?.forEach(gt => { teamGroupMap[gt.team_id] = gt.group_id })

    let updated = 0
    let skipped = 0

    for (const entry of totalStanding.table || []) {
      const teamName = normalise(entry.team?.name || '')
      const teamId = teamMap[teamName.toLowerCase()] || null
      if (!teamId) { skipped++; continue }

      const groupId = teamGroupMap[teamId] || null
      if (!groupId) { skipped++; continue }

      const { error } = await supabase.from('group_standings').upsert({
        group_id: groupId,
        team_id: teamId,
        position: entry.position,
        played: entry.playedGames ?? 0,
        won: entry.won ?? 0,
        drawn: entry.draw ?? 0,
        lost: entry.lost ?? 0,
        goals_for: entry.goalsFor ?? 0,
        goals_against: entry.goalsAgainst ?? 0,
        goal_difference: entry.goalDifference ?? 0,
        points: entry.points ?? 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'group_id,team_id' })

      if (!error) updated++
      else skipped++
    }

    await supabase.from('app_settings')
      .update({ value: new Date().toISOString() })
      .eq('key', 'standings_last_sync')

    return { statusCode: 200, body: JSON.stringify({ message: 'Standings synced', updated, skipped }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}
