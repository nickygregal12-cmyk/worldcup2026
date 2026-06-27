/* global process */

const LOCATION_OVERRIDES = {
  'new york': '40.8135,-74.0745',
  'new york/nj': '40.8135,-74.0745',
  'new jersey': '40.8135,-74.0745',
  'east rutherford': '40.8135,-74.0745',
  'metlife stadium': '40.8135,-74.0745',
}

export async function handler(event) {
  const apiKey = process.env.WEATHER_API_KEY || process.env.VITE_WEATHER_API_KEY
  if (!apiKey) return json({ available: false, error: 'Missing WEATHER_API_KEY' })

  const params = event.queryStringParameters || {}
  const city = String(params.city || '').trim()
  const stadium = String(params.stadium || '').trim()
  const kickoff = params.kickoff
  if (!city && !stadium) return json({ available: false, error: 'Missing location' }, 400)

  try {
    const date = kickoff ? new Date(kickoff) : new Date()
    const now = new Date()
    const daysAhead = Math.ceil((date - now) / 86400000)
    const useForecast = daysAhead >= -1 && daysAhead <= 14
    const endpoint = useForecast ? 'forecast.json' : 'current.json'
    const lookupKey = [stadium, city].map(value => value.toLowerCase()).find(value => LOCATION_OVERRIDES[value])
    const query = lookupKey ? LOCATION_OVERRIDES[lookupKey] : city || stadium

    const url = new URL(`https://api.weatherapi.com/v1/${endpoint}`)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('q', query)
    url.searchParams.set('aqi', 'no')
    if (useForecast) {
      url.searchParams.set('dt', date.toISOString().slice(0, 10))
      url.searchParams.set('days', '1')
    }

    const response = await fetch(url.toString())
    if (!response.ok) return json({ available: false, error: 'Weather unavailable' })
    const data = await response.json()

    let source = data.current || null
    if (useForecast) {
      const hours = data.forecast?.forecastday?.[0]?.hour || []
      if (hours.length) {
        source = hours.reduce((closest, hour) => {
          const hourTime = new Date(hour.time_epoch * 1000)
          const distance = Math.abs(hourTime - date)
          return !closest || distance < closest.distance ? { ...hour, distance } : closest
        }, null)
      } else {
        source = data.forecast?.forecastday?.[0]?.day || source
      }
    }

    const condition = source?.condition?.text || null
    const temp = source?.temp_c ?? source?.avgtemp_c ?? null
    return json({
      available: temp !== null || Boolean(condition),
      city,
      resolved_location: data.location?.name || city,
      temp_c: temp,
      condition,
      icon: conditionEmoji(condition),
    })
  } catch {
    return json({ available: false, error: 'Weather unavailable' })
  }
}

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=900',
    },
    body: JSON.stringify(body),
  }
}

function conditionEmoji(condition = '') {
  const value = condition.toLowerCase()
  if (value.includes('thunder')) return '⛈️'
  if (value.includes('snow') || value.includes('sleet')) return '🌨️'
  if (value.includes('rain') || value.includes('drizzle')) return '🌧️'
  if (value.includes('fog') || value.includes('mist')) return '🌫️'
  if (value.includes('cloud') || value.includes('overcast')) return '☁️'
  if (value.includes('sun') || value.includes('clear')) return '☀️'
  return '🌤️'
}
