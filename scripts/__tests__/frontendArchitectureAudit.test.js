import { describe, expect, it } from 'vitest'
import {
  auditContrast,
  contrastRatio,
  countLines,
  extractImports,
  parseThemeTokens,
} from '../lib/frontendArchitectureAudit.mjs'

describe('frontend architecture audit helpers', () => {
  it('counts lines without treating a trailing newline as a blank source line', () => {
    expect(countLines('one\ntwo\n')).toBe(2)
    expect(countLines('one\ntwo')).toBe(2)
    expect(countLines('')).toBe(0)
  })

  it('extracts static imports and re-exports', () => {
    expect(extractImports("import x from './one.js'\nexport { y } from './two.js'"))
      .toEqual(['./one.js', './two.js'])
  })

  it('merges repeated light roots and dark overrides', () => {
    const themes = parseThemeTokens(`
      :root { --text: #000000; --surface: #ffffff; }
      :root[data-theme='dark'] { --text: #ffffff; --surface: #000000; }
      :root { --alias: var(--text); }
    `)
    expect(themes.light.alias).toBe('var(--text)')
    expect(themes.dark.text).toBe('#ffffff')
    expect(themes.dark.alias).toBe('var(--text)')
  })

  it('calculates WCAG contrast ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })

  it('fails unregistered contrast debt and ratchets registered exceptions', () => {
    const tokenSource = `
      :root { --text: #777777; --surface: #ffffff; }
      :root[data-theme='dark'] { --text: #ffffff; --surface: #000000; }
    `
    const withoutException = auditContrast({
      tokenSource,
      pairs: [['text', 'surface', 4.5, 'test text']],
      exceptions: {},
    })
    expect(withoutException.failures).toHaveLength(1)

    const withException = auditContrast({
      tokenSource,
      pairs: [['text', 'surface', 4.5, 'test text']],
      exceptions: { 'light:text:surface': 4.47 },
    })
    expect(withException.failures).toEqual([])
    expect(withException.acceptedExceptions).toHaveLength(1)
  })
})
