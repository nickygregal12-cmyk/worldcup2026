/**
 * Paints the share card onto a 1080×1920 canvas and hands back a PNG blob.
 *
 * Canvas, not html2canvas. The one html2canvas caller in this repo is quarantined WC26 code, and
 * rasterising a hidden DOM tree brings its whole failure surface — unsupported CSS, font races, a
 * layout that has to be maintained twice. A painter is deterministic: it produces the same pixels
 * on every device, at a size that has nothing to do with the viewport, which is exactly what "a
 * composed share layout, not a screenshot" means.
 *
 * Two things it must get right or the image is quietly wrong:
 *
 *  1. Fonts. A canvas does not wait for webfonts. Paint before Big Shoulders is loaded and every
 *     heading silently falls back to the system sans — and `font-synthesis: none` means the miss is
 *     not even loud. ensureShareFonts() blocks until the exact faces are resolved.
 *  2. Flags. They are bundled same-origin assets (Vite `?url`), so drawing them does NOT taint the
 *     canvas and toBlob() keeps working. A CDN flag would break export entirely.
 */
import { flagAssetForTeamIso } from '../design-system/teamFlagRegistry.js'
import { SHARE_FONT_FACES, SHARE_PALETTE } from './shareImagePalette.js'
import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH, buildShareBands } from './shareImageLayout.js'
import { drawBracket } from './shareImageBracket.js'
import { drawChampion, drawFooter, drawGroupScores, drawHeader, drawStats } from './shareImageBands.js'

export async function ensureShareFonts() {
  if (typeof document === 'undefined' || !document.fonts) return
  await Promise.all(SHARE_FONT_FACES.map(face => document.fonts.load(face).catch(() => null)))
  await document.fonts.ready
}

function loadImage(src) {
  return new Promise(resolve => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

/** Every flag the card needs, fetched once. A miss resolves to null and draws as a neutral disc. */
async function loadFlags(model) {
  const codes = new Set()
  const remember = team => { if (team?.isoCode) codes.add(team.isoCode) }
  remember(model.champion)
  Object.values(model.tiesByMatchNumber).forEach(tie => tie.slots.forEach(slot => remember(slot.team)))
  model.groupScores.forEach(score => { remember(score.home); remember(score.away) })

  const entries = await Promise.all([...codes].map(async code => {
    const asset = flagAssetForTeamIso(code)
    return [code, asset ? await loadImage(asset) : null]
  }))
  return new Map(entries)
}

export function createShareCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = SHARE_IMAGE_WIDTH
  canvas.height = SHARE_IMAGE_HEIGHT
  return canvas
}

/**
 * Paint. `includeGroupScores` is the owner's optional band — the caller decides, and the layout
 * reclaims the space if it is off.
 */
export async function paintShareImage(canvas, model, { includeGroupScores = true, origin = '' } = {}) {
  const ctx = canvas.getContext('2d')
  const bands = buildShareBands({ includeGroupScores: includeGroupScores && model.groupScores.length > 0 })
  const flags = await loadFlags(model)

  ctx.fillStyle = SHARE_PALETTE.page
  ctx.fillRect(0, 0, SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT)

  drawHeader(ctx, bands.header)
  drawChampion(ctx, flags, model, bands.champion)
  drawBracket(ctx, flags, model, bands.bracket)
  drawStats(ctx, model, bands.stats)
  drawGroupScores(ctx, flags, model, bands.groupScores)
  drawFooter(ctx, bands.footer, origin)
  return canvas
}

export async function renderBracketShareImage(model, options = {}) {
  await ensureShareFonts()
  const canvas = createShareCanvas()
  await paintShareImage(canvas, model, {
    origin: typeof window === 'undefined' ? '' : window.location.origin,
    ...options,
  })
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('The image could not be created.'))),
      'image/png',
    )
  })
}
