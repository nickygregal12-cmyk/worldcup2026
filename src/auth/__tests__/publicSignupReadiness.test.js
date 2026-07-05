import { describe, expect, it } from 'vitest'
import { buildPublicSignupReadiness, PUBLIC_SIGNUP_READINESS } from '../publicSignupReadiness.js'

describe('public signup readiness', () => {
  it('keeps wider public registration closed while gates remain open', () => {
    const readiness = buildPublicSignupReadiness()

    expect(readiness.isOpenForPublic).toBe(false)
    expect(readiness.badge).toBe('Not open yet')
    expect(readiness.title).toBe('Public registration still has owner gates')
  })

  it('lists the unresolved signup gates without inventing owner choices', () => {
    const readiness = buildPublicSignupReadiness()
    const labels = readiness.items.map(item => item.label)

    expect(labels).toEqual([
      'Support contact',
      'Capacity and tiers',
      'Email confirmation',
      'Privacy region',
      'Name moderation',
    ])

    expect(readiness.items.some(item => item.detail.includes('support@example'))).toBe(false)
    expect(readiness.items.some(item => item.detail.includes('1000'))).toBe(false)
    expect(readiness.items.some(item => item.detail.includes('Europe West'))).toBe(false)
  })

  it('returns the frozen central readiness object used by the Rules Hub', () => {
    const readiness = buildPublicSignupReadiness()

    expect(readiness).toBe(PUBLIC_SIGNUP_READINESS)
    expect(Object.isFrozen(readiness)).toBe(true)
    expect(Object.isFrozen(readiness.items)).toBe(true)
    expect(readiness.items.every(item => Object.isFrozen(item))).toBe(true)
  })
})
