import { describe, expect, it } from 'vitest'
import {
  normaliseDisplayName,
  normaliseEmail,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '../authValidation.js'

describe('Euro authentication validation', () => {
  it('normalises display-name spacing without changing meaningful punctuation', () => {
    expect(normaliseDisplayName("  Nicky   O'Neil-Smith  ")).toBe("Nicky O'Neil-Smith")
  })

  it('accepts a valid display name', () => {
    expect(validateDisplayName('Nicky Gregal')).toEqual({
      valid: true,
      value: 'Nicky Gregal',
      error: null,
    })
  })

  it('rejects short and unsupported display names', () => {
    expect(validateDisplayName('ab').valid).toBe(false)
    expect(validateDisplayName('Bad<Name').valid).toBe(false)
  })

  it('normalises email addresses to lower case', () => {
    expect(normaliseEmail('  TEST@Example.COM ')).toBe('test@example.com')
  })

  it('validates basic email shape', () => {
    expect(validateEmail('nick@example.com').valid).toBe(true)
    expect(validateEmail('not-an-email').valid).toBe(false)
  })

  it('requires passwords of at least eight characters', () => {
    expect(validatePassword('12345678').valid).toBe(true)
    expect(validatePassword('1234567').valid).toBe(false)
  })

  it('requires matching password confirmation', () => {
    expect(validatePasswordConfirmation('abcdefgh', 'abcdefgh').valid).toBe(true)
    expect(validatePasswordConfirmation('abcdefgh', 'abcdefgi').valid).toBe(false)
  })
})
