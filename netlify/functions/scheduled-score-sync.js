/* global process */

export const handler = async () => {
  const siteUrl = (process.env.URL || process.env.SITE_URL || 'https://wc26predictor1.netlify.app').replace(/\/$/, '')
  const secret = process.env.ADMIN_FUNCTION_SECRET

  if (!secret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ADMIN_FUNCTION_SECRET is not configured' }),
    }
  }

  try {
    const response = await fetch(`${siteUrl}/.netlify/functions/sync-scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': secret,
      },
    })

    const body = await response.text()

    if (!response.ok) {
      console.error('Scheduled score sync failed', response.status, body)
      return {
        statusCode: response.status,
        body,
      }
    }

    console.log('Scheduled score sync complete', body)
    return {
      statusCode: 200,
      body,
    }
  } catch (error) {
    console.error('Scheduled score sync failed', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
}
