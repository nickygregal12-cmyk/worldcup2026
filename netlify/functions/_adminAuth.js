/* global process */
import { createClient } from '@supabase/supabase-js'

const json = (statusCode, payload) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

const getHeader = (headers = {}, name) => {
  const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase())
  return key ? headers[key] : undefined
}

export async function requireAdmin(event, { allowServerSecret = true } = {}) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return { ok: false, response: json(500, { error: 'Server authentication is not configured' }) }
  }

  const serverSecret = getHeader(event.headers, 'x-admin-secret')
  if (allowServerSecret && process.env.ADMIN_FUNCTION_SECRET && serverSecret === process.env.ADMIN_FUNCTION_SECRET) {
    return { ok: true, authType: 'server-secret', user: null }
  }

  const authorization = getHeader(event.headers, 'authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) return { ok: false, response: json(401, { error: 'Unauthorized' }) }

  const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await service.auth.getUser(token)
  const user = userData?.user
  if (userError || !user) return { ok: false, response: json(401, { error: 'Unauthorized' }) }

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('is_admin, admin_level')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile?.is_admin) {
    return { ok: false, response: json(403, { error: 'Admin access required' }) }
  }

  return { ok: true, authType: 'user-jwt', user, profile }
}

