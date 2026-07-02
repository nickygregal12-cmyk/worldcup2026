import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ExternalBoundaryError, parseExternal } from '../externalValidation.js'

describe('external response validation', () => {
  it('returns validated external data', () => {
    expect(parseExternal(z.object({ status: z.literal('ok') }), { status: 'ok' }, 'Health response')).toEqual({ status: 'ok' })
  })

  it('throws a named boundary error without dumping the full payload', () => {
    expect(() => parseExternal(z.object({ total: z.number() }), { total: 'wrong', secret: 'hidden' }, 'Points response'))
      .toThrow(ExternalBoundaryError)
    try {
      parseExternal(z.object({ total: z.number() }), { total: 'wrong', secret: 'hidden' }, 'Points response')
    } catch (error) {
      expect(error.message).toContain('Points response failed validation')
      expect(error.message).not.toContain('hidden')
      expect(error.issues[0].path).toEqual(['total'])
    }
  })
})
