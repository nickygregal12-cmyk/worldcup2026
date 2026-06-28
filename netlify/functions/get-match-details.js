/* global process */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const SITE_URL = (process.env.SITE_URL || 'https://wc26predictor1.netlify.app').replace(/\/$/, '')

const corsHeaders = (origin) => {
  const allowed = !origin || origin === SITE_URL || origin.startsWith('http://localhost:')
  return {
    'Access-Control-Allow-Origin': allowed ? (origin || SITE_URL) : SITE_URL,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin',
  }
}

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  return Number.isFinite(Number(value)) ? Number(value) : null
}

const cleanPerson = (person) => person ? { id: person.id ?? null, name: person.name || null } : null
const cleanTeam = (team) => team ? {
  id: team.id ?? null,
  name: team.name || team.shortName || null,
  shortName: team.shortName || team.name || null,
  code: team.tla || null,
  statistics: team.statistics ? {
    possession: numberOrNull(team.statistics.ball_possession),
    shots: numberOrNull(team.statistics.shots),
    shotsOnGoal: numberOrNull(team.statistics.shots_on_goal),
    corners: numberOrNull(team.statistics.corner_kicks),
    fouls: numberOrNull(team.statistics.fouls),
    offsides: numberOrNull(team.statistics.offsides),
    saves: numberOrNull(team.statistics.saves),
    yellowCards: numberOrNull(team.statistics.yellow_cards),
    redCards: numberOrNull(team.statistics.red_cards),
  } : null,
} : null

export const handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || ''
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const matchId = event.queryStringParameters?.matchId
  const matchNumber = event.queryStringParameters?.matchNumber
  if (!matchId && !matchNumber) return { statusCode: 400, headers, body: JSON.stringify({ error: 'matchId or matchNumber is required' }) }

  try {
    let query = supabase.from('matches').select('id, match_number, external_match_id, status')
    query = matchId ? query.eq('id', matchId) : query.eq('match_number', Number(matchNumber))
    const { data: match, error } = await query.maybeSingle()
    if (error) throw error
    if (!match) return { statusCode: 404, headers, body: JSON.stringify({ available: false, reason: 'match_not_found' }) }
    if (!match.external_match_id) {
      return {
        statusCode: 200,
        headers: { ...headers, 'Cache-Control': 'public, max-age=300, s-maxage=300' },
        body: JSON.stringify({ available: false, reason: 'external_match_not_linked' }),
      }
    }
    if (!process.env.FOOTBALL_DATA_KEY) {
      return { statusCode: 503, headers, body: JSON.stringify({ available: false, reason: 'provider_not_configured' }) }
    }

    const response = await fetch(`https://api.football-data.org/v4/matches/${encodeURIComponent(match.external_match_id)}`, {
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_DATA_KEY,
        'X-Api-Version': 'v4',
        'X-Unfold-Lineups': 'true',
        'X-Unfold-Bookings': 'true',
        'X-Unfold-Subs': 'true',
      },
    })

    if (!response.ok) {
      const retryAfter = response.headers.get('retry-after')
      return {
        statusCode: response.status === 429 ? 429 : 502,
        headers: { ...headers, ...(retryAfter ? { 'Retry-After': retryAfter } : {}), 'Cache-Control': 'no-store' },
        body: JSON.stringify({ available: false, reason: 'provider_error', providerStatus: response.status }),
      }
    }

    const data = await response.json()
    const completed = ['FINISHED', 'AWARDED'].includes(data.status)
    const live = ['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(data.status)
    const cacheControl = completed
      ? 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
      : live
        ? 'public, max-age=20, s-maxage=30, stale-while-revalidate=30'
        : 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800'

    const payload = {
      available: true,
      providerMatchId: String(data.id),
      status: data.status || null,
      minute: numberOrNull(data.minute),
      injuryTime: numberOrNull(data.injuryTime),
      venue: data.venue || null,
      attendance: numberOrNull(data.attendance),
      lastUpdated: data.lastUpdated || null,
      halfTime: {
        home: numberOrNull(data.score?.halfTime?.home),
        away: numberOrNull(data.score?.halfTime?.away),
      },
      homeTeam: cleanTeam(data.homeTeam),
      awayTeam: cleanTeam(data.awayTeam),
      goals: (data.goals || []).slice(0, 20).map(goal => ({
        minute: numberOrNull(goal.minute),
        injuryTime: numberOrNull(goal.injuryTime),
        type: goal.type || null,
        teamId: goal.team?.id ?? null,
        teamName: goal.team?.name || null,
        scorer: cleanPerson(goal.scorer),
        assist: cleanPerson(goal.assist),
        score: { home: numberOrNull(goal.score?.home), away: numberOrNull(goal.score?.away) },
      })),
      bookings: (data.bookings || []).slice(0, 30).map(booking => ({
        minute: numberOrNull(booking.minute),
        teamId: booking.team?.id ?? null,
        player: cleanPerson(booking.player),
        card: booking.card || null,
      })),
      lineupsAvailable: Boolean(data.homeTeam?.lineup?.length || data.awayTeam?.lineup?.length),
    }

    return { statusCode: 200, headers: { ...headers, 'Cache-Control': cacheControl }, body: JSON.stringify(payload) }
  } catch (error) {
    console.error('get-match-details failed', error)
    return { statusCode: 500, headers: { ...headers, 'Cache-Control': 'no-store' }, body: JSON.stringify({ available: false, reason: 'internal_error' }) }
  }
}
