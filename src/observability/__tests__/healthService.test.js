import { describe, expect, it, vi } from 'vitest'
import { ExternalBoundaryError } from '../../contracts/externalValidation.js'
import { loadRuntimeHealth } from '../healthService.js'

const healthy = {
  service: 'euro28-predictor',
  status: 'ok',
  checked_at: '2026-07-02T20:00:00.000Z',
  release: 'release-1',
  environment: 'staging',
  checks: {
    application: { status: 'ok', detail: 'Runtime responding.' },
    database: { status: 'ok', detail: 'Tournament planning.' },
  },
}

describe('runtime health service', () => {
  it('validates a healthy deployment response', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => healthy })
    await expect(loadRuntimeHealth(fetcher)).resolves.toMatchObject({ status: 'ok', release: 'release-1' })
    expect(fetcher).toHaveBeenCalledWith('/.netlify/functions/health', expect.objectContaining({ method: 'GET' }))
  })

  it('preserves a validated degraded response on the thrown error', async () => {
    const degraded = { ...healthy, status: 'degraded', checks: { ...healthy.checks, database: { status: 'error', detail: 'Timed out.' } } }
    const fetcher = vi.fn().mockResolvedValue({ ok: false, json: async () => degraded })
    await expect(loadRuntimeHealth(fetcher)).rejects.toMatchObject({ health: degraded })
  })

  it('rejects malformed external responses before rendering them', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) })
    await expect(loadRuntimeHealth(fetcher)).rejects.toBeInstanceOf(ExternalBoundaryError)
  })
})
