/**
 * The share image's palette.
 *
 * The image is painted onto a canvas, and a canvas cannot read CSS custom properties — so the
 * DP token values have to exist here as literals. That is a drift risk, and the answer to it is
 * shareImagePalette.test.js, which parses `src/design/tokens.css` and fails if any value below
 * stops matching its token. Change a token, and the test tells you this file is stale.
 *
 * Why only the dark values: the image is NOT themed (owner ruling, this stage). A shared card
 * lands in someone else's WhatsApp, not in the sender's app, so it carries one fixed identity —
 * the dark broadcast look — regardless of which theme the player happens to be using. That also
 * means one visual contract to verify instead of two, and it holds up on both light and dark
 * chat backgrounds, which a light card does not.
 */
export const SHARE_IMAGE_THEME = 'dark'

/** Each entry is the DP token this literal must equal. The test enforces the mapping. */
export const SHARE_PALETTE_TOKEN_SOURCE = Object.freeze({
  page: '--dp-surface-page',
  raised: '--dp-surface-raised',
  chrome: '--dp-surface-chrome',
  textStrong: '--dp-text-strong',
  textBody: '--dp-text-body',
  textMuted: '--dp-text-muted',
  borderSubtle: '--dp-border-subtle',
  borderStrong: '--dp-border-strong',
  accent: '--dp-action',
  skyBright: '--sky-bright',
  joker: '--dp-joker',
  jokerSoft: '--dp-joker-soft',
  locked: '--dp-locked',
})

export const SHARE_PALETTE = Object.freeze({
  page: '#06111F',
  raised: '#0E1F33',
  chrome: '#0F2A4F',
  textStrong: '#FFFFFF',
  textBody: '#E2EBF5',
  textMuted: '#93A4B8',
  borderSubtle: '#1C2C40',
  borderStrong: '#546D8C',
  accent: '#38BDF8',
  skyBright: '#5FC7F5',
  joker: '#EFC55C',
  jokerSoft: '#352810',
  locked: '#A2B1C2',
})

/**
 * Type is not tokenised as a scale the canvas can use — `--text-2xl` is a rem string, and a
 * canvas wants px. The families, though, are the real tokens, and the weights are the only ones
 * @fontsource actually loads (main.jsx). `font-synthesis: none` is set globally, so asking for a
 * weight that was never loaded gets you the nearest loaded one rather than a faked bold — which
 * is why these must stay inside the loaded set: Public Sans 400/600/700/800, Big Shoulders 700/800/900.
 */
export const SHARE_FONT = Object.freeze({
  display: '"Big Shoulders Display", "Public Sans", sans-serif',
  body: '"Public Sans", sans-serif',
})

/** The faces the canvas must have before it paints a single glyph. See ensureShareFonts(). */
export const SHARE_FONT_FACES = Object.freeze([
  '900 96px "Big Shoulders Display"',
  '800 48px "Big Shoulders Display"',
  '700 32px "Big Shoulders Display"',
  '800 28px "Public Sans"',
  '700 24px "Public Sans"',
  '600 22px "Public Sans"',
  '400 22px "Public Sans"',
])
