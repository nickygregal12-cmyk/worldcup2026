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
  try {
    const response = await fetch(
      'https://api.football-data.org/v4/competitions/WC/standings?season=2026',
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } }
    )

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const standings = data.standings || []

    // Get all teams from DB for ID lookup
    const { data: teams } = await supabase.from('teams').select('id, name')
    const teamMap = {}
    teams?.forEach(t => { teamMap[t.name.toLowerCase()] = t.id })

    let updated = 0

    for (const group of standings) {
      if (group.type !== 'TOTAL') continue
      const groupName = group.stage || group.group || 'Unknown'

      for (const entry of group.table) {
        const teamName = normalise(entry.team?.name || '')
        const teamId = teamMap[teamName.toLowerCase()] || null

        await supabase.from('group_standings').upsert({
          group_name: groupName,
          team_name: teamName,
          team_id: teamId,
          position: entry.position,
          played: entry.playedGames,
          won: entry.won,
          drawn: entry.draw,
          lost: entry.lost,
          goals_for: entry.goalsFor,
          goals_against: entry.goalsAgainst,
          goal_difference: entry.goalDifference,
          points: entry.points,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'group_name,team_name' })

        updated++
      }
    }

    await supabase.from('app_settings')
      .upsert({ key: 'standings_last_sync', value: new Date().toISOString() }, { onConflict: 'key' })

    return { statusCode: 200, body: JSON.stringify({ message: 'Standings synced', updated }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}
