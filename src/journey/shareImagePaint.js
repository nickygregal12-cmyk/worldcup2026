/**
 * The low-level canvas primitives the share card is drawn with. No layout, no product knowledge —
 * just "put a fitted string here", "put a circular flag there".
 */
import { JOKER_MARK_PATHS, JOKER_MARK_VIEWBOX } from '../design-system/jokerMarkPaths.js'
import { SHARE_FONT, SHARE_PALETTE } from './shareImagePalette.js'

export function font(weight, size, family = SHARE_FONT.body) {
  return `${weight} ${size}px ${family}`
}

export function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}

export function drawFlag(ctx, flags, team, centreX, centreY, diameter) {
  const image = team?.isoCode ? flags.get(team.isoCode) : null
  ctx.save()
  ctx.beginPath()
  ctx.arc(centreX, centreY, diameter / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  if (image) {
    ctx.drawImage(image, centreX - diameter / 2, centreY - diameter / 2, diameter, diameter)
  } else {
    ctx.fillStyle = SHARE_PALETTE.borderSubtle
    ctx.fillRect(centreX - diameter / 2, centreY - diameter / 2, diameter, diameter)
  }
  ctx.restore()
  // Unresolved slots never reach the image (share is gated on a complete bracket), so this ring
  // is identity, not a placeholder: it keeps a white-heavy flag off a dark card edge.
  ctx.strokeStyle = SHARE_PALETTE.borderStrong
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(centreX, centreY, diameter / 2, 0, Math.PI * 2)
  ctx.stroke()
}

/**
 * Shrink to fit, then elide. The model already hands long UEFA names their broadcast short form,
 * so this is a backstop rather than the mechanism — but it is the thing that guarantees a name
 * can never bleed out of a lane, whatever the pool turns out to hold.
 */
export function fitText(ctx, text, maxWidth, { weight, size, minSize, family = SHARE_FONT.body }) {
  let current = size
  while (current > minSize) {
    ctx.font = font(weight, current, family)
    if (ctx.measureText(text).width <= maxWidth) return text
    current -= 1
  }
  ctx.font = font(weight, minSize, family)
  if (ctx.measureText(text).width <= maxWidth) return text
  let clipped = text
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1)
  }
  return `${clipped}…`
}

export function drawKicker(ctx, text, x, y, colour = SHARE_PALETTE.skyBright) {
  ctx.font = font(800, 20)
  ctx.letterSpacing = '0.14em'
  ctx.fillStyle = colour
  ctx.textAlign = 'left'
  ctx.fillText(text.toUpperCase(), x, y)
  ctx.letterSpacing = '0px'
}

/**
 * The joker mark, painted from the same shape data the SVG primitive uses (jokerMarkPaths.js).
 * Gold is joker-exclusive (owner ruling §5), so this is the one place on the card it appears —
 * and only here, because bracket jokers do not exist: a joker can only ever have been played on a
 * group match, which is what the optional score band shows.
 */
export function drawJokerMark(ctx, x, y, size) {
  const { card, hat, bells } = JOKER_MARK_PATHS
  const scale = size / JOKER_MARK_VIEWBOX

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.strokeStyle = SHARE_PALETTE.joker
  ctx.fillStyle = SHARE_PALETTE.joker
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const centre = JOKER_MARK_VIEWBOX / 2
  ctx.save()
  ctx.translate(centre, centre)
  ctx.rotate((card.rotation * Math.PI) / 180)
  ctx.translate(-centre, -centre)
  ctx.beginPath()
  ctx.roundRect(card.x, card.y, card.width, card.height, card.radius)
  ctx.stroke()
  ctx.restore()

  ctx.stroke(new Path2D(hat))
  for (const bell of bells) {
    ctx.beginPath()
    ctx.arc(bell.cx, bell.cy, bell.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

