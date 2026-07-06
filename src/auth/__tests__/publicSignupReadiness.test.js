import { describe, expect, it } from 'vitest'
import {
  buildPublicSignupReadiness,
  PUBLIC_SIGNUP_IMPLEMENTATION,
  PUBLIC_SIGNUP_OWNER_DECISIONS,
  PUBLIC_SIGNUP_READINESS,
} from '../publicSignupReadiness.js'

describe('public signup readiness', () => {
  it('keeps wider public registration closed while implementation gates remain open', () => {
    const readiness = buildPublicSignupReadiness()

    expect(readiness.isOpenForPublic).toBe(false)
    expect(readiness.badge).toBe('Not open yet')
    expect(readiness.title).toBe('Public registration still has safety checks')
  })

  it('lists the signup readiness gates with the recorded owner decisions', () => {
    const readiness = buildPublicSignupReadiness()
    const labels = readiness.items.map(item => item.label)

    expect(labels).toEqual([
      'Support contact',
      'Capacity and tiers',
      'Email confirmation',
      'Privacy region',
      'Name moderation',
      'Registration mode',
    ])

    expect(readiness.items.find(item => item.label === 'Support contact')?.detail).toContain('Contact admin')
    expect(readiness.items.find(item => item.label === 'Capacity and tiers')?.detail).toContain('250 users and 20 leagues')
    expect(readiness.items.find(item => item.label === 'Email confirmation')?.detail).toContain('will be required')
    expect(readiness.items.find(item => item.label === 'Name moderation')?.detail).toContain('sectarian')
    expect(readiness.items.find(item => item.label === 'Registration mode')?.detail).toContain('does not need to stay invite-only')
  })

  it('records the owner decisions without opening signups', () => {
    const decisions = buildPublicSignupReadiness().ownerDecisions

    expect(decisions).toBe(PUBLIC_SIGNUP_OWNER_DECISIONS)
    expect(decisions.supportContact.decision).toBe('Contact admin')
    expect(decisions.initialCapacity).toMatchObject({ userCap: 250, leagueCap: 20 })
    expect(decisions.hostingAndEmailTier.decision).toContain('low-cost/free')
    expect(decisions.emailConfirmation.requiredForPublicRegistration).toBe(true)
    expect(decisions.privacy.regionClaim).toContain('Do not publish a specific data-region claim')
    expect(decisions.moderation.approach).toContain('racist, discriminatory, anti-immigrant, sectarian, abusive and inflammatory')
    expect(decisions.inviteOnly).toMatchObject({
      stayInviteOnlyUntilModeration: false,
      publicOpeningStillBlocked: true,
    })
  })

  it('records the first implementation guard without opening signups', () => {
    const readiness = buildPublicSignupReadiness()

    expect(readiness.implementation).toBe(PUBLIC_SIGNUP_IMPLEMENTATION)
    expect(readiness.implementation.stage).toBe('STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1')
    expect(readiness.implementation.publicRegistrationOpened).toBe(false)
    expect(readiness.implementation.implementedGuards).toContain(
      'Display names are checked for abusive or discriminatory wording before an account can be created.',
    )
    expect(readiness.implementation.externalChecksStillRequired).toContain(
      'Email confirmation has been checked in the live account setup.',
    )
    expect(readiness.ownerDecisions.moderation.clientPreAuthGuardImplemented).toBe(true)
  })

  it('returns the frozen central readiness object used by the Rules Hub', () => {
    const readiness = buildPublicSignupReadiness()

    expect(readiness).toBe(PUBLIC_SIGNUP_READINESS)
    expect(Object.isFrozen(readiness)).toBe(true)
    expect(Object.isFrozen(readiness.items)).toBe(true)
    expect(Object.isFrozen(readiness.ownerDecisions)).toBe(true)
    expect(Object.isFrozen(readiness.implementation)).toBe(true)
    expect(readiness.items.every(item => Object.isFrozen(item))).toBe(true)
    expect(Object.values(readiness.ownerDecisions).every(decision => Object.isFrozen(decision))).toBe(true)
  })
})
