// netlify/functions/get-odds.js
// Proxies The Odds API to keep API key secure

exports.handler = async (event, context) => {
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Odds API key not configured' }),
    }
  }

  try {
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${apiKey}&regions=uk&markets=h2h&oddsFormat=decimal&bookmakers=bet365,williamhill,ladbrokes`,
    )

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Odds API error', status: response.status }),
      }
    }

    const data = await response.json()

    // Transform to simple home/draw/away fractional odds format
    const transformed = data.map(game => {
      const bookmaker = game.bookmakers?.[0]
      const h2h = bookmaker?.markets?.find(m => m.key === 'h2h')

      if (!h2h) return null

      const home = h2h.outcomes.find(o => o.name === game.home_team)?.price
      const away = h2h.outcomes.find(o => o.name === game.away_team)?.price
      const draw = h2h.outcomes.find(o => o.name === 'Draw')?.price

      // Convert decimal to fractional
      const toFractional = (decimal) => {
        if (!decimal) return 'N/A'
        const numerator = Math.round((decimal - 1) * 100)
        const denominator = 100
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b)
        const g = gcd(numerator, denominator)
        return `${numerator/g}/${denominator/g}`
      }

      return {
        home_team: game.home_team,
        away_team: game.away_team,
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(transformed),
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    }
  }
}