import { z } from 'zod'
import { parseExternal } from '../contracts/externalValidation.js'

const runtimeCheckSchema = z.object({
  status: z.enum(['ok', 'error']),
  detail: z.string().min(1),
}).passthrough()

export const runtimeHealthSchema = z.object({
  service: z.literal('euro28-predictor'),
  status: z.enum(['ok', 'degraded']),
  checked_at: z.string().datetime({ offset: true }),
  release: z.string().nullable().optional(),
  environment: z.string().min(1),
  checks: z.object({
    application: runtimeCheckSchema,
    database: runtimeCheckSchema,
  }).passthrough(),
}).passthrough()

export async function loadRuntimeHealth(fetcher = globalThis.fetch) {
  if (typeof fetcher !== 'function') throw new Error('Runtime health fetch is unavailable.')
  const response = await fetcher('/.netlify/functions/health', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
  const body = await response.json().catch(() => null)
  const validated = parseExternal(runtimeHealthSchema, body, 'Runtime health response')
  if (!response.ok || validated.status !== 'ok') {
    const error = new Error('The deployed application health check is degraded.')
    error.health = validated
    throw error
  }
  return Object.freeze(validated)
}
