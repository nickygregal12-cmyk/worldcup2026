/* global process */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handler } from '../health.js'

const previous = {}

describe.sequential('Euro health function', () => {
  beforeEach(() => {
    for (const key of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'CONTEXT', 'COMMIT_REF', 'SENTRY_DSN']) previous[key] = process.env[key]
    process.env.SUPABASE_URL = 'https://euro.example.test'
    process.env.SUPABASE_ANON_KEY = 'public-anon-key'
    process.env.CONTEXT = 'staging'
    process.env.COMMIT_REF = 'release-1'
    delete process.env.SENTRY_DSN
  })

  afterEach(() => {
    vi.restoreAllMocks()
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('returns a validated healthy read-only status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 't1', code: 'euro-2028', status: 'planning' }],
    }))
    const response = await handler({ httpMethod: 'GET' })
    const body = JSON.parse(response.body)
    expect(response.statusCode).toBe(200)
    expect(body).toMatchObject({ service: 'euro28-predictor', status: 'ok', release: 'release-1' })
    expect(body.checks.database.status).toBe('ok')
    expect(response.body).not.toContain('public-anon-key')
  })

  it('reports degraded when the database payload is malformed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }))
    const response = await handler({ httpMethod: 'GET' })
    expect(response.statusCode).toBe(503)
    expect(JSON.parse(response.body).checks.database.status).toBe('error')
  })

  it('rejects non-GET requests without a database call', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const response = await handler({ httpMethod: 'POST' })
    expect(response.statusCode).toBe(405)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
