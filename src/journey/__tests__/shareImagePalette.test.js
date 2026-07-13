import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SHARE_PALETTE, SHARE_PALETTE_TOKEN_SOURCE, SHARE_FONT_FACES } from '../shareImagePalette.js'

/**
 * The share image is painted on a canvas, and a canvas cannot read a CSS custom property. So the
 * DP token values live as literals in shareImagePalette.js — and this is the ratchet that stops
 * them rotting. Retune a dark token and the image silently keeps the old colour; this test is what
 * makes that loud instead.
 */
const TOKENS_CSS = readFileSync(fileURLToPath(new URL('../../design/tokens.css', import.meta.url)), 'utf8')

/**
 * tokens.css declares `:root` more than once — the DP block is a later one — so every matching
 * block is merged rather than just the first found. Later declarations win, as they would in CSS.
 */
function tokensForTheme({ dark }) {
  const declarations = {}
  for (const [, selector, body] of TOKENS_CSS.matchAll(/(:root(?:\[data-theme='dark'\])?)\s*\{([^}]*)\}/g)) {
    const isDarkBlock = selector.includes('data-theme')
    if (isDarkBlock !== dark) continue
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      declarations[name] = value.trim()
    }
  }
  if (Object.keys(declarations).length === 0) throw new Error('tokens.css declared no custom properties — the parser is stale')
  return declarations
}

describe('share image palette', () => {
  const light = tokensForTheme({ dark: false })
  const dark = tokensForTheme({ dark: true })

  it('matches the dark DP token it claims to mirror, for every colour it paints', () => {
    for (const [key, token] of Object.entries(SHARE_PALETTE_TOKEN_SOURCE)) {
      // The sky family is declared once in :root and is the same in both themes (owner ruling §5).
      const expected = dark[token] ?? light[token]
      expect(expected, `${token} is no longer declared in tokens.css`).toBeDefined()
      expect(SHARE_PALETTE[key].toUpperCase(), `SHARE_PALETTE.${key} has drifted from ${token}`)
        .toBe(expected.toUpperCase())
    }
  })

  it('names a colour for every token source, and no orphans', () => {
    expect(Object.keys(SHARE_PALETTE).sort()).toEqual(Object.keys(SHARE_PALETTE_TOKEN_SOURCE).sort())
  })

  it('only asks for font weights that are actually loaded', () => {
    // font-synthesis is none, so an unloaded weight is a silent substitution, not a bold.
    const loaded = { '"Big Shoulders Display"': [700, 800, 900], '"Public Sans"': [400, 600, 700, 800] }
    for (const face of SHARE_FONT_FACES) {
      const [, weight, family] = /^(\d+) \d+px (.+)$/.exec(face)
      expect(loaded[family], `${family} is not a self-hosted family`).toBeDefined()
      expect(loaded[family]).toContain(Number(weight))
    }
  })
})
