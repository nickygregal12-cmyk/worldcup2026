// Team name mappings from the-odds-api.com format to our DB format
// Fix 3: Türkiye unicode, Fix 1: Bosnia variants, Fix 2: USA variants, Fix 5: full audit
const API_TO_DB = {
  'Czech Republic': 'Czechia',
  'Turkey': 'Türkiye',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'United States of America': 'United States',
  "Côte d'Ivoire": 'Ivory Coast',
  'Curaçao': 'Curacao',
  'Cape Verde Islands': 'Cape Verde',
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'DR Congo': 'DR Congo',
  'Macedonia': 'North Macedonia',
  'Iran': 'Iran',
  'IR Iran': 'Iran',
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

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const apiKey = process.env.VITE_ODDS_API_KEY
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

      // Normalise team names to match our DB
      const homeDb = normaliseTeam(game.home_team)
      const awayDb = normaliseTeam(game.away_team)

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

    return { statusCode: 200, headers, body: JSON.stringify(transformed) }
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}