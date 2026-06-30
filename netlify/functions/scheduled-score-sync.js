/* global process */

export const handler = async () => {
  const siteUrl = (process.env.URL || process.env.SITE_URL || 'https://wc26predictor1.netlify.app').replace(/\/$/, '')
  const secret = process.env.ADMIN_FUNCTION_SECRET

  if (!secret) {
    console.error('Scheduled score sync skipped: ADMIN_FUNCTION_SECRET is not configured')
    return {
      statusCode: 200,
      body: JSON.stringify({ skipped: true, reason: 'ADMIN_FUNCTION_SECRET is not configured' }),
    }
  }

  try {
    const response = await fetch(`${siteUrl}/.netlify/functions/sync-scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': secret,
      },
      body: JSON.stringify({ source: 'scheduled' }),
    })

    const body = await response.text()
    console.log('Scheduled score sync result', response.status, body)

    // Always return 200 to Netlify. The shared sync function records provider
    // failures and cooldowns, so an immediate platform retry would only create
    // another unnecessary provider request.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body,
    }
  } catch (error) {
    console.error('Scheduled score sync transport failure', error)
    return {
      statusCode: 200,
      body: JSON.stringify({ skipped: true, reason: error.message }),
    }
  }
}
