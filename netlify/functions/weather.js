export async function handler(event) {
  const apiKey = process.env.WEATHER_API_KEY || process.env.VITE_WEATHER_API_KEY

  if (!apiKey) {
    return json({ available: false, error: 'Missing WEATHER_API_KEY' }, 200)
  }

  const params = event.queryStringParameters || {}
  const city = params.city
  const kickoff = params.kickoff

  if (!city) {
    return json({ available: false, error: 'Missing city' }, 400)
  }

  try {
    const date = kickoff ? new Date(kickoff) : new Date()
    const now = new Date()
    const daysAhead = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
    const useForecast = daysAhead >= 0 && daysAhead <= 14
    const endpoint = useForecast ? 'forecast.json' : 'current.json'
    const url = new URL(`https://api.weatherapi.com/v1/${endpoint}`)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('q', city)
    url.searchParams.set('aqi', 'no')
    if (useForecast) {
      url.searchParams.set('dt', date.toISOString().slice(0, 10))
      url.searchParams.set('days', '1')
    }

    const res = await fetch(url.toString())
    if (!res.ok) {
      return json({ available: false, error: 'Weather unavailable' }, 200)
    }

    const data = await res.json()
    const current = data.current || data.forecast?.forecastday?.[0]?.day
    const condition = current?.condition?.text || null
    const temp = current?.temp_c ?? current?.avgtemp_c ?? null

    return json({
      available: temp !== null || !!condition,
      city,
      temp_c: temp,
      condition,
      icon: conditionEmoji(condition),
    }, 200)
  } catch (error) {
    return json({ available: false, error: 'Weather unavailable' }, 200)
  }
}

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=1800',
    },
    body: JSON.stringify(body),
  }
}

function conditionEmoji(condition = '') {
  const c = condition.toLowerCase()
  if (c.includes('thunder')) return '⛈️'
  if (c.includes('snow') || c.includes('sleet')) return '🌨️'
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️'
  if (c.includes('fog') || c.includes('mist')) return '🌫️'
  if (c.includes('cloud') || c.includes('overcast')) return '☁️'
  if (c.includes('sun') || c.includes('clear')) return '☀️'
  return '🌤️'
}
