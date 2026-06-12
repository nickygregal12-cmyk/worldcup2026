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
    const standings = data.standings || []

    // Debug: show structure of first standing entry
    if (standings.length > 0) {
      const first = standings[0]
      return { statusCode: 200, body: JSON.stringify({
        message: 'Standings synced',
        updated: 0,
        debug: {
          standingsLength: standings.length,
          firstType: first.type,
          firstStage: first.stage,
          firstGroup: first.group,
          tableLength: first.table?.length,
          firstEntry: first.table?.[0] ? {
            teamName: first.table[0].team?.name,
            position: first.table[0].position,
            points: first.table[0].points,
            played: first.table[0].playedGames,
          } : null
        }
      })}
    }

    // Get all teams from DB for ID lookup
    const { data: teams } = await supabase.from('teams').select('id, name')
    const teamMap = {}
    teams?.forEach(t => { teamMap[t.name.toLowerCase()] = t.id })

    // Get all groups from DB for ID lookup
    const { data: groups } = await supabase.from('groups').select('id, name')
    const groupMap = {}
    groups?.forEach(g => { groupMap[g.name.toLowerCase()] = g.id })

    let updated = 0

    for (const group of standings) {
      if (group.type !== 'TOTAL') continue
      const rawGroupName = group.stage || group.group || 'Unknown'
      // API returns e.g. "GROUP_A" — normalise to "A"
      const groupLetter = rawGroupName.replace('GROUP_', '').replace('Group ', '').trim()
      const groupId = groupMap[`group ${groupLetter}`.toLowerCase()] || groupMap[groupLetter.toLowerCase()] || null

      for (const entry of group.table) {
        const teamName = normalise(entry.team?.name || '')
        const teamId = teamMap[teamName.toLowerCase()] || null

        if (!groupId || !teamId) continue

        await supabase.from('group_standings').upsert({
          group_id: groupId,
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
        }, { onConflict: 'group_id,team_id' })

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
