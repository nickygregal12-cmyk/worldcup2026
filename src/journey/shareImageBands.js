/**
 * The horizontal bands of the card: the masthead, the champion hero, the stats, the optional
 * group-score strip, and the join footer that carries the card's provenance.
 */
import { SHARE_FONT, SHARE_PALETTE } from './shareImagePalette.js'
import { SHARE_IMAGE_WIDTH, SHARE_LAYOUT_MARGIN } from './shareImageLayout.js'
import { SHARE_COPY, joinHostFromOrigin } from './shareImageCopy.js'
import { drawFlag, drawJokerMark, drawKicker, fitText, font, roundRect } from './shareImagePaint.js'

export function drawHeader(ctx, band) {
  ctx.fillStyle = SHARE_PALETTE.chrome
  ctx.fillRect(0, band.y, SHARE_IMAGE_WIDTH, band.height)

  const markSize = 60
  const markX = SHARE_LAYOUT_MARGIN
  const markY = band.y + (band.height - markSize) / 2
  ctx.fillStyle = SHARE_PALETTE.accent
  roundRect(ctx, markX, markY, markSize, markSize, 16)
  ctx.fill()
  ctx.fillStyle = SHARE_PALETTE.page
  ctx.font = font(900, 34, SHARE_FONT.display)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('28', markX + markSize / 2, markY + markSize / 2 + 2)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const textX = markX + markSize + 20
  ctx.font = font(800, 38, SHARE_FONT.display)
  ctx.fillStyle = SHARE_PALETTE.textStrong
  ctx.fillText(SHARE_COPY.brand, textX, band.y + 82)
  ctx.font = font(600, 22)
  ctx.fillStyle = SHARE_PALETTE.textMuted
  ctx.fillText(SHARE_COPY.headerSubtitle, textX, band.y + 116)

  ctx.fillStyle = SHARE_PALETTE.accent
  ctx.fillRect(0, band.y + band.height - 4, SHARE_IMAGE_WIDTH, 4)
}

export function drawChampion(ctx, flags, model, band) {
  const centreX = SHARE_IMAGE_WIDTH / 2
  ctx.textAlign = 'center'

  ctx.font = font(800, 20)
  ctx.letterSpacing = '0.16em'
  ctx.fillStyle = SHARE_PALETTE.skyBright
  ctx.fillText(SHARE_COPY.championKicker.toUpperCase(), centreX, band.y + 52)
  ctx.letterSpacing = '0px'

  const diameter = 132
  const flagY = band.y + 76 + diameter / 2
  drawFlag(ctx, flags, model.champion, centreX, flagY, diameter)

  const name = model.champion?.label ?? ''
  const nameText = fitText(ctx, name, SHARE_IMAGE_WIDTH - SHARE_LAYOUT_MARGIN * 2, {
    weight: 900, size: 88, minSize: 48, family: SHARE_FONT.display,
  })
  ctx.fillStyle = SHARE_PALETTE.textStrong
  ctx.fillText(nameText, centreX, flagY + diameter / 2 + 76)
  ctx.textAlign = 'left'
}

function drawStatTile(ctx, { x, y, width, height, kicker, value, note }) {
  ctx.fillStyle = SHARE_PALETTE.raised
  roundRect(ctx, x, y, width, height, 16)
  ctx.fill()
  ctx.strokeStyle = SHARE_PALETTE.borderSubtle
  ctx.lineWidth = 1
  ctx.stroke()

  drawKicker(ctx, kicker, x + 24, y + 42)
  // Fitted, not just drawn: the group-goals value is a small number, but the Top Scorer tile holds
  // a player's name, and a long one would run straight out of the tile.
  const text = fitText(ctx, String(value), width - 48, {
    weight: 900, size: 52, minSize: 30, family: SHARE_FONT.display,
  })
  ctx.fillStyle = SHARE_PALETTE.textStrong
  ctx.fillText(text, x + 24, y + 100)
  if (note) {
    ctx.font = font(600, 18)
    ctx.fillStyle = SHARE_PALETTE.textMuted
    ctx.fillText(note, x + 24, y + 128)
  }
}

/**
 * Group goals, and Top Scorer beside it when there is one to draw.
 *
 * There is not, yet: Top Scorer has no player pool, no persistence and no entry surface — Stage
 * 17A owns all three (CLAUDE.md §4). Rather than ship an empty "not picked" tile, which advertises
 * a hole, the band centres the one real stat and lights the second the moment `topScorer` is
 * non-null. The layout does not move when it does.
 */
export function drawStats(ctx, model, band) {
  const usable = SHARE_IMAGE_WIDTH - SHARE_LAYOUT_MARGIN * 2
  const height = band.height - 24
  const y = band.y + 4
  const tiles = [{
    kicker: SHARE_COPY.groupGoalsKicker,
    value: model.groupGoals.total,
    note: SHARE_COPY.groupGoalsNote,
  }]
  if (model.topScorer) {
    tiles.push({ kicker: SHARE_COPY.topScorerKicker, value: model.topScorer.label, note: null })
  }

  const gap = 16
  const width = tiles.length === 1 ? usable : (usable - gap) / 2
  tiles.forEach((tile, index) => {
    drawStatTile(ctx, { ...tile, x: SHARE_LAYOUT_MARGIN + index * (width + gap), y, width, height })
  })
}

export function drawGroupScores(ctx, flags, model, band) {
  if (band.height === 0 || model.groupScores.length === 0) return
  drawKicker(ctx, SHARE_COPY.groupScoresKicker, SHARE_LAYOUT_MARGIN, band.y + 30)

  const usable = SHARE_IMAGE_WIDTH - SHARE_LAYOUT_MARGIN * 2
  const gap = 16
  const width = (usable - gap * 2) / 3
  const height = 104
  const y = band.y + 48

  model.groupScores.slice(0, 3).forEach((score, index) => {
    const x = SHARE_LAYOUT_MARGIN + index * (width + gap)
    ctx.fillStyle = SHARE_PALETTE.raised
    roundRect(ctx, x, y, width, height, 14)
    ctx.fill()
    ctx.strokeStyle = SHARE_PALETTE.borderSubtle
    ctx.lineWidth = 1
    ctx.stroke()

    const centreY = y + height / 2
    drawFlag(ctx, flags, score.home, x + 34, centreY, 34)
    drawFlag(ctx, flags, score.away, x + width - 34, centreY, 34)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = font(900, 34, SHARE_FONT.display)
    ctx.fillStyle = SHARE_PALETTE.textStrong
    ctx.fillText(`${score.homeScore}–${score.awayScore}`, x + width / 2, centreY - 4)
    ctx.font = font(700, 15)
    if (score.jokerApplied) {
      const label = SHARE_COPY.jokerLabel
      const markSize = 16
      const gap = 5
      const textWidth = ctx.measureText(label).width
      const startX = x + width / 2 - (markSize + gap + textWidth) / 2
      drawJokerMark(ctx, startX, centreY + 18, markSize)
      ctx.textAlign = 'left'
      ctx.fillStyle = SHARE_PALETTE.joker
      ctx.fillText(label, startX + markSize + gap, centreY + 26)
    } else {
      ctx.fillStyle = SHARE_PALETTE.textMuted
      ctx.fillText(`Group ${score.groupCode}`, x + width / 2, centreY + 26)
    }
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  })
}

export function drawFooter(ctx, band, origin) {
  ctx.fillStyle = SHARE_PALETTE.chrome
  ctx.fillRect(0, band.y, SHARE_IMAGE_WIDTH, band.height)
  ctx.fillStyle = SHARE_PALETTE.accent
  ctx.fillRect(0, band.y, SHARE_IMAGE_WIDTH, 4)

  const host = joinHostFromOrigin(origin)
  ctx.textAlign = 'center'
  const centreX = SHARE_IMAGE_WIDTH / 2

  // Centre the block rather than pin it to the top: on a local origin there is no host worth
  // printing, and a footer built around a line that is not there reads as a mistake.
  const lines = host ? 3 : 2
  const blockHeight = lines === 3 ? 120 : 74
  let y = band.y + (band.height - blockHeight) / 2 + 30

  ctx.font = font(800, 34, SHARE_FONT.display)
  ctx.fillStyle = SHARE_PALETTE.textStrong
  ctx.fillText(SHARE_COPY.joinTitle, centreX, y)

  y += 38
  ctx.font = font(600, 22)
  ctx.fillStyle = SHARE_PALETTE.textMuted
  ctx.fillText(SHARE_COPY.joinBody, centreX, y)

  if (host) {
    y += 46
    ctx.font = font(800, 26)
    ctx.fillStyle = SHARE_PALETTE.skyBright
    ctx.fillText(host, centreX, y)
  }
  ctx.textAlign = 'left'
}

