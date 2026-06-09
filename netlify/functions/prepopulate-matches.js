import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

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
  // Auth check — reject requests without valid admin secret
  // pg_cron calls pass this header; direct calls from AdminPanel pass it too
  const secret = (event.headers || {})['x-admin-secret']
  if (!process.env.ADMIN_FUNCTION_SECRET || secret !== process.env.ADMIN_FUNCTION_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  try {
    // Fetch ALL matches from football-data.org regardless of status
    const response = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY } }
    )

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const apiMatches = data.matches || []

    let matched = 0
    let skipped = 0
    let notFound = []

    for (const apiMatch of apiMatches) {
      const homeDb = normalise(apiMatch.homeTeam?.name || '')
      const awayDb = normalise(apiMatch.awayTeam?.name || '')
      const matchDate = apiMatch.utcDate?.substring(0, 10)

      // Find our match by team names + date
      // Use ±1 day window to handle timezone differences between API and our DB
      const dayBefore = new Date(matchDate)
      dayBefore.setDate(dayBefore.getDate() - 1)
      const dayAfter = new Date(matchDate)
      dayAfter.setDate(dayAfter.getDate() + 1)

      const { data: candidates } = await supabase
        .from('matches')
        .select('id, external_match_id, home_team:home_team_id(name), away_team:away_team_id(name), kickoff_time')
        .gte('kickoff_time', `${dayBefore.toISOString().substring(0, 10)}T00:00:00Z`)
        .lte('kickoff_time', `${dayAfter.toISOString().substring(0, 10)}T23:59:59Z`)

      const ourMatch = candidates?.find(c => {
        const h = stripAccents(c.home_team?.name || '')
        const a = stripAccents(c.away_team?.name || '')
        const apiH = stripAccents(homeDb)
        const apiA = stripAccents(awayDb)
        return (h === apiH && a === apiA) || (h === apiA && a === apiH)
      })

      if (ourMatch) {
        if (ourMatch.external_match_id === apiMatch.id.toString()) {
          skipped++
        } else {
          await supabase.from('matches')
            .update({ external_match_id: apiMatch.id.toString() })
            .eq('id', ourMatch.id)
          matched++
        }
      } else {
        notFound.push(`${homeDb} vs ${awayDb} on ${matchDate}`)
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Pre-populate complete',
        total: apiMatches.length,
        matched,
        skipped,
        notFound: notFound.slice(0, 10), // first 10 only
      })
    }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}
