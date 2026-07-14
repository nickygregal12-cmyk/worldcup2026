// Design meta-audit — token contrast as ACTUALLY USED, in both themes.
//
// Root cause this guards against (found live on Home): the existing WCAG
// token audit proves the 58 REGISTERED light/dark token pairs pass — the
// palette in the abstract. It never checks which token a CSS rule actually
// pairs with which background. Two usage errors sailed through it:
//   1. A surface token used as a text colour (`color: var(--surface-inverse-soft)`)
//      — dark navy text painted on the hero's dark navy gradient.
//   2. Light-surface text tokens (`--text-secondary`) inside the hero, whose
//      background is polarity-inverted (dark in light theme, light in dark
//      theme) — so the pairing fails in BOTH themes.
//
// Three rules, applied to every current and future stylesheet automatically:
//   A. Category guard — `color:` may never use a `--surface-*` token.
//      Surface tokens invert with the theme relative to text needs; using
//      one as a foreground is a category error even when today's values
//      happen to pass.
//   B. Inverse-context contrast — any selector scoped to a class whose block
//      paints an inverse/brand background (directly or via BEM `block__element`
//      naming) must pass WCAG contrast against that background's WORST
//      gradient endpoint, in BOTH themes.
//   C. Same-block pairs — any block declaring both a token background and a
//      token colour must pass WCAG contrast in BOTH themes.
//   D. Kit coverage — the ui-* kit's stateful surfaces must still BE such pairs.
//
// Rule C's fourth escape (found 2026-07-14 on .ui-button--primary): it only
// recognised a background as checkable if its token began --surface/--brand/
// --accent/--hero. The entire --dp-* generation — the tokens every live
// component actually fills with — was invisible to it, so `background:
// var(--dp-action); color: var(--dp-text-on-accent)` (white at 4.10:1, under
// §5's 4.5 floor) sailed through a green suite. Only the non-gating visual
// probe caught it. The prefix list now includes --dp-, which is what makes the
// computed fill+text combos of the real kit gate the build.
//
// Rule D exists because Rule C is silent by construction when a block STOPS
// being a token pair: hardcode a hex fill, or drop the colour declaration, and
// coverage vanishes with the suite still green. So the kit's stateful surfaces
// are named, and each one must actually reach checkPair. Deleting or renaming a
// surface is fine — updating this list is the deliberate act that records it.
//
// Known static limit (by design, recorded honestly): descendants composed in
// JSX whose class names carry no selector or BEM relationship to the painted
// ancestor (e.g. a generic `.home-stat` card placed inside the hero) cannot
// be bound statically. The runtime browser contrast walk (Playwright layer)
// is the completing guard for that class; this audit is the fast, zero-infra
// first line that catches the majority at commit time.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { walkFiles } from './lib/frontendArchitectureAudit.mjs'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const MIN_CONTRAST = 4.5

// Exceptions need file, selector, token and a reason (e.g. proven large-text
// 3.0:1 usage). Empty is the healthy state.
const ALLOWED_PAIRINGS = Object.freeze([
  // { file: 'src/example.module.css', selector: '.big-display', token: '--text-secondary', reason: 'clamp >= 24px bold, 3:1 verified' },
])
const isAllowedPairing = (file, selector, token) =>
  ALLOWED_PAIRINGS.some(entry => entry.file === file && entry.selector === selector && entry.token === token)

// Rule D — the ui-* kit's stateful surfaces: every selector that paints a fill
// and sits text on it. Each MUST be checked by Rule C on every run; if one stops
// being a token fill + token text pair, coverage is lost silently and this fails.
const KIT_FILE = 'src/styles/app.css'
const REQUIRED_STATEFUL_SURFACES = Object.freeze([
  '.ui-button--primary',
  '.ui-button--secondary',
  '.ui-button--danger',
  '.ui-badge--safe',
  '.ui-badge--info',
  '.ui-badge--warning',
  '.ui-badge--danger',
  '.ui-status--info',
  '.ui-status--warning',
  '.ui-status--danger',
  '.ui-icon-button.is-active',
])
const coveredSurfaces = new Set()

// ── Token values per theme ──────────────────────────────────────────────────
function parseThemeBlocks(source) {
  const themes = { light: {}, dark: {} }
  for (const match of source.matchAll(/(:root(?:\[data-theme='dark'\])?)\s*\{([^}]*)\}/g)) {
    const target = match[1].includes('dark') ? themes.dark : themes.light
    for (const declaration of match[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      target[declaration[1]] = declaration[2].trim()
    }
  }
  return themes
}
const tokenSource = read('src/design/tokens.css')
const themes = parseThemeBlocks(tokenSource)

function resolveHex(token, theme) {
  const raw = themes[theme][token] ?? themes.light[token]
  if (!raw) return null
  const nested = raw.match(/var\((--[\w-]+)\)/)
  if (nested) return resolveHex(nested[1], theme)
  const hex = raw.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/)
  return hex ? hex[0] : null
}

// ── WCAG contrast maths ─────────────────────────────────────────────────────
function luminance(hex) {
  let value = hex.replace('#', '')
  if (value.length === 3) value = value.split('').map(ch => ch + ch).join('')
  const [r, g, b] = [0, 2, 4].map(index => {
    const channel = parseInt(value.slice(index, index + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(foregroundHex, backgroundHex) {
  const [light, dark] = [luminance(foregroundHex), luminance(backgroundHex)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

// ── Stylesheet parsing ──────────────────────────────────────────────────────
const cssFiles = walkFiles(root, 'src').filter(file =>
  file.endsWith('.css') && file !== 'src/design/tokens.css' && !file.includes('feature-compat'))

function parseBlocks(source) {
  const blocks = []
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim().split('\n').pop().trim()
    if (selector.startsWith('@')) continue
    const declarations = {}
    for (const declaration of match[2].matchAll(/([\w-]+)\s*:\s*([^;]+);?/g)) {
      declarations[declaration[1].trim()] = declaration[2].trim()
    }
    blocks.push({ selector, declarations })
  }
  return blocks
}

const firstToken = value => value?.match(/var\(\s*(--[\w-]+)/)?.[1] ?? null

// Decorative translucent layers — color-mix(... , transparent) — are glow
// overlays, not the surface text sits on. Strip them before collecting
// background tokens so contrast is judged against the real base layer.
const stripTranslucentLayers = value => (value ?? '').replace(/color-mix\((?:[^()]|\([^()]*\))*transparent(?:[^()]|\([^()]*\))*\)/g, ' ')
const allTokens = value => [...stripTranslucentLayers(value).matchAll(/var\(\s*(--[\w-]+)/g)].map(match => match[1])
const INVERSE_BG_TOKENS = new Set(['--surface-inverse', '--brand-strong', '--brand-emphasis'])

function checkPair(file, selector, colorToken, backgroundTokens, contextNote) {
  if (file === KIT_FILE) coveredSurfaces.add(selector)
  if (isAllowedPairing(file, selector, colorToken)) return
  for (const theme of ['light', 'dark']) {
    const foreground = resolveHex(colorToken, theme)
    if (!foreground) continue
    const ratios = backgroundTokens
      .map(token => resolveHex(token, theme))
      .filter(Boolean)
      .map(background => contrast(foreground, background))
    if (ratios.length === 0) continue
    const worst = Math.min(...ratios)
    if (worst < MIN_CONTRAST) {
      fail(`${file} "${selector}": ${colorToken} on ${backgroundTokens.join('+')} ${contextNote} = ${worst.toFixed(2)}:1 in ${theme} theme (needs ${MIN_CONTRAST}:1). Use an on-context text token or register an ALLOWED_PAIRINGS exception with evidence.`)
    }
  }
}

let checkedPairs = 0
for (const file of cssFiles) {
  const blocks = parseBlocks(read(file))

  // Inverse contexts declared in this file: class -> gradient/background tokens.
  const contexts = []
  for (const block of blocks) {
    const backgroundValue = `${block.declarations.background ?? ''} ${block.declarations['background-color'] ?? ''}`
    const backgroundTokens = allTokens(backgroundValue).filter(token => INVERSE_BG_TOKENS.has(token) || token.startsWith('--surface-inverse'))
    if (backgroundTokens.length === 0) continue
    for (const classMatch of block.selector.matchAll(/\.([\w-]+)/g)) {
      contexts.push({ className: classMatch[1], backgroundTokens: allTokens(backgroundValue) })
    }
  }

  const inContext = selector => contexts.find(context =>
    selector.includes(`.${context.className}`)
    || new RegExp(`\\.${context.className}(?:__|--)`).test(selector))

  for (const block of blocks) {
    const colorToken = firstToken(block.declarations.color)
    if (!colorToken) continue

    // Rule A — surface tokens are never foregrounds.
    if (colorToken.startsWith('--surface-') && !isAllowedPairing(file, block.selector, colorToken)) {
      fail(`${file} "${block.selector}": uses surface token ${colorToken} as a text colour. Surface tokens invert with the theme relative to text — use a --text-* / on-context token instead.`)
      continue
    }

    // Rule C — same-block background + colour pairing.
    const ownBackground = allTokens(`${block.declarations.background ?? ''} ${block.declarations['background-color'] ?? ''}`)
      .filter(token => token.startsWith('--surface') || token.startsWith('--brand') || token.startsWith('--accent')
        || token.startsWith('--hero') || token.startsWith('--dp-'))
    if (ownBackground.length > 0) {
      checkedPairs += 1
      checkPair(file, block.selector, colorToken, ownBackground, '(same block)')
      continue
    }

    // Rule B — selector scoped to an inverse-background context.
    const context = inContext(block.selector)
    if (context) {
      checkedPairs += 1
      checkPair(file, block.selector, colorToken, context.backgroundTokens, `(inside .${context.className} context)`)
    }
  }
}

// Rule D — every named kit surface must have been reached by Rule C above.
for (const selector of REQUIRED_STATEFUL_SURFACES) {
  if (coveredSurfaces.has(selector)) continue
  fail(`${KIT_FILE} "${selector}": stateful kit surface is no longer a checked token fill + token text pair, so its contrast is now unguarded. Restore the token pairing, or remove it from REQUIRED_STATEFUL_SURFACES if the surface was deliberately deleted or renamed.`)
}

if (errors.length > 0) {
  console.error(`Token contrast-usage audit failed with ${errors.length} issue(s):\n`)
  for (const message of errors) console.error(`  - ${message}`)
  console.error('\nThe registered token palette can be perfect while a usage pairing is unreadable. Pair text tokens with the background they actually sit on, in both themes.')
  process.exit(1)
}

console.log(`Token contrast-usage audit passed. Checked ${checkedPairs} real token pairings across ${cssFiles.length} stylesheets in both themes — no unreadable pairings, no surface-tokens-as-text. All ${REQUIRED_STATEFUL_SURFACES.length} ui-* stateful kit surfaces (buttons, badges, status chips) are covered fill-against-text at the ${MIN_CONTRAST}:1 floor.`)
