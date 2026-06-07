export async function handler(event) {
  const apiKey = process.env.WEATHER_API_KEY || process.env.VITE_WEATHER_API_KEY

  // DEBUG — remove after confirming key is correct
  console.log('WEATHER_API_KEY prefix:', process.env.WEATHER_API_KEY?.slice(0, 6) || 'NOT SET')
  console.log('VITE_WEATHER_API_KEY prefix:', process.env.VITE_WEATHER_API_KEY?.slice(0, 6) || 'NOT SET')
  console.log('Using key prefix:', apiKey?.slice(0, 6) || 'NONE')

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

    // WeatherAPI free tier: forecast.json with `days` param supports up to 14 days from today.
    // The `dt` param (specific date) is paid-only — must use `days` instead.
    if (daysAhead > 14) {
      return json({ available: false, error: 'Too far ahead for forecast' }, 200)
    }

    // For past/current matches use current.json; for future use forecast.json
    const useForecast = daysAhead >= 1
    const endpoint = useForecast ? 'forecast.json' : 'current.json'

    const url = new URL(`https://api.weatherapi.com/v1/${endpoint}`)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('q', city)
    url.searchParams.set('aqi', 'no')
    if (useForecast) {
      // days=N from today — free tier compatible. Add 1 to be safe with same-day rounding.
      url.searchParams.set('days', String(Math.max(daysAhead + 1, 2)))
    }

    const res = await fetch(url.toString())
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return json({ available: false, error: `API error ${res.status}: ${errText.slice(0, 100)}` }, 200)
    }

    const data = await res.json()

    let temp_c = null
    let condition = null
    let humidity = null
    let wind_kph = null
    let feelslike_c = null

    if (useForecast && data.forecast?.forecastday?.length) {
      // Pick the forecastday matching the kickoff date
      const kickoffDateStr = date.toISOString().slice(0, 10)
      const forecastDay = data.forecast.forecastday.find(d => d.date === kickoffDateStr)
        || data.forecast.forecastday[data.forecast.forecastday.length - 1]

      // Find the hour closest to kickoff time for accuracy
      const kickoffHour = date.getUTCHours()
      const hours = forecastDay.hour || []
      let bestHour = null
      let bestDiff = Infinity
      hours.forEach(h => {
        const hTime = new Date(h.time)
        const diff = Math.abs(hTime.getUTCHours() - kickoffHour)
        if (diff < bestDiff) { bestDiff = diff; bestHour = h }
      })

      if (bestHour) {
        temp_c      = bestHour.temp_c
        condition   = bestHour.condition?.text || null
        humidity    = bestHour.humidity ?? null
        wind_kph    = bestHour.wind_kph ?? null
        feelslike_c = bestHour.feelslike_c ?? null
      } else {
        const day = forecastDay.day
        temp_c    = day.avgtemp_c ?? null
        condition = day.condition?.text || null
        humidity  = day.avghumidity ?? null
        wind_kph  = day.maxwind_kph ?? null
      }
    } else if (data.current) {
      temp_c      = data.current.temp_c ?? null
      condition   = data.current.condition?.text || null
      humidity    = data.current.humidity ?? null
      wind_kph    = data.current.wind_kph ?? null
      feelslike_c = data.current.feelslike_c ?? null
    }

    const available = temp_c !== null || !!condition

    return json({
      available,
      city,
      temp_c,
      condition,
      humidity,
      wind_kph,
      feelslike_c,
      icon: conditionEmoji(condition),
      alert: weatherAlert(temp_c, condition),
    }, 200)

  } catch (error) {
    return json({ available: false, error: String(error.message || error) }, 200)
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
  const c = (condition || '').toLowerCase()
  if (c.includes('thunder')) return '⛈️'
  if (c.includes('snow') || c.includes('sleet')) return '🌨️'
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️'
  if (c.includes('fog') || c.includes('mist')) return '🌫️'
  if (c.includes('cloud') || c.includes('overcast')) return '☁️'
  if (c.includes('sun') || c.includes('clear')) return '☀️'
  return '🌤️'
}

function weatherAlert(temp_c, condition = '') {
  const c = (condition || '').toLowerCase()
  if (temp_c !== null && temp_c >= 35) return 'Extreme heat'
  if (temp_c !== null && temp_c >= 30) return 'Very hot'
  if (c.includes('thunder')) return 'Thunderstorm'
  if (c.includes('heavy rain')) return 'Heavy rain'
  return null
}
