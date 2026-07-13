/**
 * Where everything sits on the 1080×1920 canvas. Pure arithmetic — no canvas, no DOM — so the
 * geometry that actually decides whether "Republic of Ireland" fits in a lane is unit-testable.
 *
 * Why portrait 1080×1920 and no landscape variant:
 *
 *  - The stated flow is "click share, it goes to WhatsApp". That is a phone, held upright, and
 *    1080×1920 is the one size every story/status surface (WhatsApp Status, Instagram) takes
 *    without re-cropping. As a plain chat attachment it also opens full-screen on a tap.
 *  - 1200×630 is an Open Graph size — it exists to be unfurled from a LINK by a server. This app
 *    is static Netlify + Supabase with no server renderer, and the deliverable is a file the
 *    player sends, not a link someone else's crawler fetches. Building it would be speculative.
 *  - The content simply does not fit in 630px of height. A seven-lane converging chart needs
 *    ~850px on its own; a champion hero, a stats band and a "how to join" footer need ~700 more.
 *    Landscape would mean dropping the join footer, which is the entire growth loop.
 *
 * So: one format, done properly.
 */
export const SHARE_IMAGE_WIDTH = 1080
export const SHARE_IMAGE_HEIGHT = 1920

const MARGIN = 32
const COLUMN_GAP = 8
const COLUMNS = 7
/** The eight R16-pitch units the chart is measured in. Rows 2..8 of the topology sit on it. */
const ROW_UNITS = 8

export const TIE_HEIGHT = 76
export const TEAM_ROW_HEIGHT = 34
export const FLAG_SIZE = 22

/**
 * Vertical bands. The group-scores band is optional by owner ruling — "leave them out if they
 * hurt the layout" — so its height is redistributed when it is dropped rather than left as a
 * hole: the chart and the hero take the space back and the card breathes instead of sagging.
 */
export function buildShareBands({ includeGroupScores }) {
  const groupScoresHeight = includeGroupScores ? 176 : 0
  const reclaimed = includeGroupScores ? 0 : 176

  const header = { y: 0, height: 168 }
  const champion = { y: header.height, height: 328 + Math.round(reclaimed * 0.25) }
  const bracket = { y: champion.y + champion.height, height: 848 + Math.round(reclaimed * 0.55) }
  const stats = { y: bracket.y + bracket.height, height: 168 }
  const groupScores = { y: stats.y + stats.height, height: groupScoresHeight }
  const footer = { y: groupScores.y + groupScores.height, height: 0 }
  footer.height = SHARE_IMAGE_HEIGHT - footer.y

  return Object.freeze({ header, champion, bracket, stats, groupScores, footer })
}

export function columnWidth() {
  const usable = SHARE_IMAGE_WIDTH - MARGIN * 2
  return Math.floor((usable - COLUMN_GAP * (COLUMNS - 1)) / COLUMNS)
}

export function columnX(column) {
  return MARGIN + (column - 1) * (columnWidth() + COLUMN_GAP)
}

/**
 * The space a team's name gets inside a tie card, once the flag and the padding have taken
 * theirs. This is the number that decides whether the long UEFA names survive, so it is exported
 * and asserted against directly.
 */
export function teamNameWidth() {
  const padding = 8
  return columnWidth() - padding * 2 - FLAG_SIZE - 8
}

/**
 * Convert a {column,row} placement from bracketWallTopology.js into a pixel box in the bracket band.
 *
 * Rows are the interesting half. The topology puts the four R16 ties of a half on rows 2/4/6/8, each
 * quarter-final on the mean of the pair that feeds it (3 and 7), and both semis AND the final on row
 * 5, the centre line. Centring row r on `(r - 0.5) * pitch` over eight units reproduces the
 * converging chart for free, and it stays true if the pitch changes.
 */
export function tieBox(placement, bracketBand) {
  const pitch = bracketBand.height / ROW_UNITS
  const centreY = bracketBand.y + (placement.row - 0.5) * pitch
  return Object.freeze({
    x: columnX(placement.column),
    y: Math.round(centreY - TIE_HEIGHT / 2),
    width: columnWidth(),
    height: TIE_HEIGHT,
    centreY: Math.round(centreY),
  })
}

/** Left lanes feed rightwards, right lanes feed leftwards. Column 4 (the final) is fed by both. */
export function feedsRightward(column) {
  return column < 4
}

export const SHARE_LAYOUT_MARGIN = MARGIN
