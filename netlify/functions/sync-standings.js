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

    // The WC standings endpoint returns groups in data.standings[]
    // For tournaments each entry has type="TOTAL" and group="GROUP_A" etc.
    // Some tiers return it differently — handle all cases.
    const allStandings = data.standings || []

    // Get all teams and groups from DB
    const { data: teams } = await supabase.from('teams').select('id, name')
    const teamMap = {}
    teams?.forEach(t => { teamMap[t.name.toLowerCase()] = t.id })

    const { data: groups } = await supabase.from('groups').select('id, name')
    const groupMap = {}
    groups?.forEach(g => { groupMap[g.name.toLowerCase()] = g.id })

    let updated = 0
    let skipped = 0

    for (const standing of allStandings) {
      // Accept any type (TOTAL, HOME, AWAY) but prefer TOTAL
      // For WC, group field is like "GROUP_A" or just "A"
      const rawGroup = standing.group || standing.stage || ''
      const groupLetter = rawGroup
        .replace(/^GROUP_/i, '')
        .replace(/^Group\s+/i, '')
        .trim()

      // Look up group ID — try "a", "group a", etc.
      const groupId = groupMap[groupLetter.toLowerCase()] ||
                      groupMap[`group ${groupLetter}`.toLowerCase()] ||
                      null

      if (!groupId) { skipped++; continue }

      const table = standing.table || []
      for (const entry of table) {
        const teamName = normalise(entry.team?.name || '')
        const teamId = teamMap[teamName.toLowerCase()] || null

        if (!teamId) { skipped++; continue }

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
    }

    await supabase.from('app_settings')
      .update({ value: new Date().toISOString() })
      .eq('key', 'standings_last_sync')

    return { statusCode: 200, body: JSON.stringify({
      message: 'Standings synced',
      updated,
      skipped,
      standingsGroups: allStandings.length,
    }) }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}
