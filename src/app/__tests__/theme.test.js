import { describe, expect, it, vi } from 'vitest'
import { nextThemeChoice, readThemeChoice, resolveTheme, THEME_CHOICE, THEME_STORAGE_KEY } from '../theme.js'

describe('Euro appearance preferences', () => {
  it('uses a valid saved preference and rejects unknown values', () => {
    const validStorage = { getItem: vi.fn(key => key === THEME_STORAGE_KEY ? 'dark' : null) }
    const invalidStorage = { getItem: vi.fn(() => 'purple') }

    expect(readThemeChoice(validStorage)).toBe(THEME_CHOICE.DARK)
    expect(readThemeChoice(invalidStorage)).toBe(THEME_CHOICE.SYSTEM)
  })

  it('falls back to the system preference when storage is blocked', () => {
    const blockedStorage = { getItem: vi.fn(() => { throw new Error('blocked') }) }

    expect(readThemeChoice(blockedStorage)).toBe(THEME_CHOICE.SYSTEM)
    expect(resolveTheme(THEME_CHOICE.SYSTEM, true)).toBe(THEME_CHOICE.DARK)
    expect(resolveTheme(THEME_CHOICE.SYSTEM, false)).toBe(THEME_CHOICE.LIGHT)
  })

  it('toggles from the theme the user is actually seeing', () => {
    expect(nextThemeChoice(THEME_CHOICE.DARK)).toBe(THEME_CHOICE.LIGHT)
    expect(nextThemeChoice(THEME_CHOICE.LIGHT)).toBe(THEME_CHOICE.DARK)
  })
})
