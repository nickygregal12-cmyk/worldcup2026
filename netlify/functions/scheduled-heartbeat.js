/* global process */
import { z } from 'zod'
import { captureFunctionException, withFunctionObservability } from './_observability.js'

const healthSchema = z.object({
  service: z.literal('euro28-predictor'),
  status: z.enum(['ok', 'degraded']),
  checked_at: z.string().min(1),
  checks: z.record(z.string(), z.object({ status: z.enum(['ok', 'error']), detail: z.string() })),
}).passthrough()

async function heartbeatHandler() {
  const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/$/, '')
  if (!siteUrl) throw new Error('The deployed site URL is unavailable to the heartbeat.')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(`${siteUrl}/.netlify/functions/health`, {
      headers: { 'User-Agent': 'euro28-scheduled-heartbeat/1.0' },
      signal: controller.signal,
    })
    const body = await response.json().catch(() => null)
    const parsed = healthSchema.safeParse(body)
    if (!response.ok || !parsed.success || parsed.data.status !== 'ok') {
      const error = new Error(`Euro heartbeat failed with HTTP ${response.status}.`)
      await captureFunctionException(error, 'scheduled-heartbeat', {
        health: { responseStatus: response.status, responseBodyValid: parsed.success },
      })
      return { statusCode: 503, body: JSON.stringify({ status: 'degraded' }) }
    }
    console.log('Euro scheduled heartbeat passed', parsed.data.checked_at, parsed.data.release || 'unversioned')
    return { statusCode: 200, body: JSON.stringify({ status: 'ok', checked_at: parsed.data.checked_at }) }
  } catch (error) {
    await captureFunctionException(error, 'scheduled-heartbeat', {
      health: { timedOut: error?.name === 'AbortError' },
    })
    return { statusCode: 503, body: JSON.stringify({ status: 'degraded' }) }
  } finally {
    clearTimeout(timeout)
  }
}

export const handler = withFunctionObservability('scheduled-heartbeat', heartbeatHandler)
