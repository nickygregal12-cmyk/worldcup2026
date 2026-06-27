// Team name mappings from the-odds-api.com format to our DB format
const API_TO_DB = {
  // Bosnia
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia-Herzegovina',
  'Bosnia': 'Bosnia-Herzegovina',

  // USA
  'United States of America': 'United States',
  'USA': 'United States',
  'US': 'United States',

  // Others
  'Czech Republic': 'Czechia',
  'Turkey': 'Türkiye',
  "Côte d'Ivoire": 'Ivory Coast',
  "Cote d'Ivoire": 'Ivory Coast',
  'Curaçao': 'Curacao',
  'Curacao': 'Curacao',
  'Cape Verde Islands': 'Cape Verde',
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'South Korea': 'South Korea',
  'DR Congo': 'DR Congo',
  'Congo DR': 'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'Macedonia': 'North Macedonia',
  'North Macedonia': 'North Macedonia',
  'IR Iran': 'Iran',
  'Iran': 'Iran',
}

// Fix 4: normalise() for fuzzy matching — strips accents, lowercases
const normaliseStr = (name) => {
  if (!name) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

// Pre-build normalised lookup so we catch any variant not in the exact map
const NORMALISED_API_TO_DB = {}
for (const [api, db] of Object.entries(API_TO_DB)) {
  NORMALISED_API_TO_DB[normaliseStr(api)] = db
}

// Fix 4: try exact match first, then normalised fuzzy match
const normaliseTeam = (name) => {
  if (API_TO_DB[name]) return API_TO_DB[name]
  const norm = normaliseStr(name)
  if (NORMALISED_API_TO_DB[norm]) return NORMALISED_API_TO_DB[norm]
  return name
}

const CACHE_TTL_MS = 5 * 60 * 1000
let cache = { expiresAt: 0, body: null }

const getAllowedOrigin = (event) => {
  const requestOrigin = event.headers?.origin || event.headers?.Origin || ''
  const configured = [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.SITE_URL]
    .filter(Boolean)
    .map(value => value.replace(/\/$/, ''))
  if (!requestOrigin) return configured[0] || ''
  return configured.includes(requestOrigin.replace(/\/$/, '')) ? requestOrigin : ''
}

export const handler = async (event) => {
  const allowedOrigin = getAllowedOrigin(event)
  const headers = {
    ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  if ((event.headers?.origin || event.headers?.Origin) && !allowedOrigin) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Origin not allowed' }) }
  }

  if (cache.body && Date.now() < cache.expiresAt) {
    return { statusCode: 200, headers: { ...headers, 'X-Cache': 'HIT' }, body: cache.body }
  }

  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Odds API key not configured' }) }
  }

  try {
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${apiKey}&regions=uk&markets=h2h&oddsFormat=decimal&bookmakers=bet365,williamhill,ladbrokes`
    )

    if (!response.ok) {
      return { statusCode: response.status, headers, body: JSON.stringify({ error: 'Odds API error' }) }
    }

    const data = await response.json()

    const toFractional = (decimal) => {
      if (!decimal) return 'N/A'
      const numerator = Math.round((decimal - 1) * 100)
      const denominator = 100
      const gcd = (a, b) => b === 0 ? a : gcd(b, a % b)
      const g = gcd(Math.abs(numerator), denominator)
      return `${numerator/g}/${denominator/g}`
    }

    const transformed = data.map(game => {
      const bookmaker = game.bookmakers?.[0]
      const h2h = bookmaker?.markets?.find(m => m.key === 'h2h')
      if (!h2h) return null

      const home = h2h.outcomes.find(o => o.name === game.home_team)?.price
      const away = h2h.outcomes.find(o => o.name === game.away_team)?.price
      const draw = h2h.outcomes.find(o => o.name === 'Draw')?.price

      const homeDb = normaliseTeam(game.home_team)
      const awayDb = normaliseTeam(game.away_team)

      // Debug: log any unmapped names so we can catch them
      if (homeDb === game.home_team && !API_TO_DB[game.home_team]) {
        console.log(`[odds] unmapped: "${game.home_team}"`)
      }
      if (awayDb === game.away_team && !API_TO_DB[game.away_team]) {
        console.log(`[odds] unmapped: "${game.away_team}"`)
      }

      return {
        home_team: homeDb,
        away_team: awayDb,
        home_team_api: game.home_team,
        away_team_api: game.away_team,
        commence_time: game.commence_time,
        odds: {
          home: toFractional(home),
          draw: toFractional(draw),
          away: toFractional(away),
          home_decimal: home,
          draw_decimal: draw,
          away_decimal: away,
        }
      }
    }).filter(Boolean)

    const body = JSON.stringify(transformed)
    cache = { body, expiresAt: Date.now() + CACHE_TTL_MS }
    return { statusCode: 200, headers: { ...headers, 'X-Cache': 'MISS' }, body }
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Odds service temporarily unavailable' }) }
  }
}