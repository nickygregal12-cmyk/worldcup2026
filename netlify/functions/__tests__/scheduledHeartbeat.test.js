/* global process */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handler } from '../scheduled-heartbeat.js'

const previous = {}

describe.sequential('Euro scheduled heartbeat', () => {
  beforeEach(() => {
    for (const key of ['URL', 'DEPLOY_PRIME_URL', 'SENTRY_DSN']) previous[key] = process.env[key]
    process.env.URL = 'https://euro.example.test'
    delete process.env.SENTRY_DSN
  })

  afterEach(() => {
    vi.restoreAllMocks()
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('accepts a healthy validated endpoint response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        service: 'euro28-predictor', status: 'ok', checked_at: '2026-07-02T20:00:00.000Z', release: 'r1',
        checks: { application: { status: 'ok', detail: 'Ready.' }, database: { status: 'ok', detail: 'Ready.' } },
      }),
    }))
    const response = await handler()
    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body).status).toBe('ok')
  })


  it('returns degraded when the health request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network unavailable')))
    const response = await handler()
    expect(response.statusCode).toBe(503)
    expect(JSON.parse(response.body).status).toBe('degraded')
  })

  it('returns degraded for an invalid health response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'ok' }) }))
    const response = await handler()
    expect(response.statusCode).toBe(503)
  })
})
