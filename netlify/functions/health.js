/* global process */
import { z } from 'zod'
import { withFunctionObservability } from './_observability.js'

const tournamentRowsSchema = z.array(z.object({
  id: z.string().min(1),
  code: z.literal('euro-2028'),
  status: z.string().min(1),
}).passthrough()).min(1)

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
    body: JSON.stringify(payload),
  }
}

async function checkDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return { status: 'error', detail: 'Supabase health configuration is missing.' }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/tournaments?select=id,code,status&code=eq.euro-2028&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: controller.signal,
    })
    if (!response.ok) return { status: 'error', detail: `Database returned HTTP ${response.status}.` }
    const parsed = tournamentRowsSchema.safeParse(await response.json())
    if (!parsed.success) return { status: 'error', detail: 'Database health response failed validation.' }
    return { status: 'ok', detail: `Tournament ${parsed.data[0].status}.` }
  } catch (error) {
    return { status: 'error', detail: error?.name === 'AbortError' ? 'Database health check timed out.' : 'Database health check failed.' }
  } finally {
    clearTimeout(timeout)
  }
}

async function healthHandler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' })
  const database = await checkDatabase()
  const healthy = database.status === 'ok'
  return json(healthy ? 200 : 503, {
    service: 'euro28-predictor',
    status: healthy ? 'ok' : 'degraded',
    checked_at: new Date().toISOString(),
    release: process.env.SENTRY_RELEASE || process.env.COMMIT_REF || null,
    environment: process.env.CONTEXT || 'development',
    checks: {
      application: { status: 'ok', detail: 'Netlify function runtime is responding.' },
      database,
    },
  })
}

export const handler = withFunctionObservability('health', healthHandler)
