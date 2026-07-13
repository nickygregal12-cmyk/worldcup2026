/**
 * The converging wall chart: the tie cards and the elbows between them.
 */
import { SHARE_COLUMN_LABELS, buildShareBracketTree } from './shareBracketTopology.js'
import { SHARE_PALETTE } from './shareImagePalette.js'
import { FLAG_SIZE, TEAM_ROW_HEIGHT, feedsRightward, teamNameWidth, tieBox } from './shareImageLayout.js'
import { drawFlag, fitText, font, roundRect } from './shareImagePaint.js'

function drawTeamRow(ctx, flags, slot, x, y, width) {
  const centreY = y + TEAM_ROW_HEIGHT / 2
  if (slot.advancing) {
    ctx.fillStyle = SHARE_PALETTE.chrome
    roundRect(ctx, x + 3, y + 1, width - 6, TEAM_ROW_HEIGHT - 2, 6)
    ctx.fill()
    ctx.fillStyle = SHARE_PALETTE.accent
    roundRect(ctx, x + 3, y + 3, 3, TEAM_ROW_HEIGHT - 6, 2)
    ctx.fill()
  }

  drawFlag(ctx, flags, slot.team, x + 12 + FLAG_SIZE / 2, centreY, FLAG_SIZE)

  const textX = x + 12 + FLAG_SIZE + 8
  const label = slot.team?.shortLabel ?? slot.sourceCode
  ctx.textBaseline = 'middle'
  ctx.fillStyle = slot.advancing ? SHARE_PALETTE.textStrong : SHARE_PALETTE.textMuted
  const text = fitText(ctx, label, teamNameWidth(), {
    weight: slot.advancing ? 800 : 600, size: 16, minSize: 12,
  })
  ctx.fillText(text, textX, centreY + 1)
  ctx.textBaseline = 'alphabetic'
}

function drawTie(ctx, flags, tie, box) {
  ctx.fillStyle = SHARE_PALETTE.raised
  roundRect(ctx, box.x, box.y, box.width, box.height, 10)
  ctx.fill()
  ctx.strokeStyle = SHARE_PALETTE.borderSubtle
  ctx.lineWidth = 1
  ctx.stroke()

  const inset = (box.height - TEAM_ROW_HEIGHT * 2) / 2
  tie.slots.forEach((slot, index) => {
    drawTeamRow(ctx, flags, slot, box.x, box.y + inset + index * TEAM_ROW_HEIGHT, box.width)
  })
}

/**
 * The elbows, drawn from the tree's own edges — so a line can only ever join a tie to the tie it
 * actually feeds. See shareBracketTopology.js for why that is not the same as the live page's
 * lane order.
 */
function drawConnectors(ctx, tree, band) {
  ctx.strokeStyle = SHARE_PALETTE.borderStrong
  ctx.lineWidth = 2

  for (const edge of tree.edges) {
    const childPlacement = tree.placements.get(edge.from)
    const parentPlacement = tree.placements.get(edge.to)
    const child = tieBox(childPlacement, band)
    const parent = tieBox(parentPlacement, band)
    const rightward = feedsRightward(childPlacement.column)

    const childEdge = rightward ? child.x + child.width : child.x
    const parentEdge = rightward ? parent.x : parent.x + parent.width
    const midX = (childEdge + parentEdge) / 2

    ctx.beginPath()
    ctx.moveTo(childEdge, child.centreY)
    ctx.lineTo(midX, child.centreY)
    ctx.lineTo(midX, parent.centreY)
    ctx.lineTo(parentEdge, parent.centreY)
    ctx.stroke()
  }
}

function drawColumnLabels(ctx, band) {
  ctx.font = font(800, 18)
  ctx.letterSpacing = '0.12em'
  ctx.fillStyle = SHARE_PALETTE.textMuted
  ctx.textAlign = 'center'
  for (const { column, label } of SHARE_COLUMN_LABELS) {
    const box = tieBox({ column, row: 1 }, band)
    ctx.fillText(label.toUpperCase(), box.x + box.width / 2, box.centreY + 22)
  }
  ctx.letterSpacing = '0px'
  ctx.textAlign = 'left'
}

export function drawBracket(ctx, flags, model, band) {
  const tree = buildShareBracketTree(model.tiesByMatchNumber)
  drawColumnLabels(ctx, band)
  drawConnectors(ctx, tree, band)
  for (const [matchNumber, placement] of tree.placements) {
    drawTie(ctx, flags, model.tiesByMatchNumber[matchNumber], tieBox(placement, band))
  }
}

