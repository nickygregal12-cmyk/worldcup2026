/* global process */
import { createClient } from '@supabase/supabase-js'

const response = (statusCode, payload) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

const getHeader = (headers = {}, name) => {
  const key = Object.keys(headers).find(header => header.toLowerCase() === name.toLowerCase())
  return key ? headers[key] : undefined
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' })

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return response(500, { error: 'Server authentication is not configured' })
  }

  const authorization = getHeader(event.headers, 'authorization') || ''
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!accessToken) return response(401, { error: 'Sign in before claiming predictions' })

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return response(400, { error: 'Invalid request body' })
  }

  const claimToken = typeof body.token === 'string' ? body.token.trim() : ''
  if (!claimToken) return response(400, { error: 'Claim token is required' })

  const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await service.auth.getUser(accessToken)
  const user = userData?.user
  if (userError || !user) return response(401, { error: 'Your session has expired. Sign in again.' })

  const { data, error } = await service.rpc('claim_offline_player', {
    p_claim_token: claimToken,
    p_user_id: user.id,
  })

  if (error) {
    const safeMessage = /invalid|expired|already been used/i.test(error.message || '')
      ? error.message
      : 'The predictions could not be transferred.'
    return response(400, { error: safeMessage })
  }

  return response(200, { message: 'Predictions claimed', claim: data })
}
