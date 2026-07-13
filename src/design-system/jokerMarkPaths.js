/**
 * The joker mark's geometry, as data.
 *
 * `JokerMark.jsx` renders it as an SVG for the DOM; the share-image painter needs the same mark on
 * a canvas, where there is no SVG. Rather than trace the card and the hat a second time in canvas
 * calls — two drawings of one mark, guaranteed to drift the first time either is nudged — the
 * shapes live here once and both consumers read them.
 *
 * lucide's geometry: a 24×24 box, currentColor stroke, round caps and joins. The bells are filled
 * rather than stroked because at 16px an outlined 0.6-radius circle disappears.
 */
export const JOKER_MARK_VIEWBOX = 24

/** The card, knocked 6° out of true. Rendered as a rounded rect under a rotation about the centre. */
export const JOKER_MARK_CARD = Object.freeze({
  x: 5.5, y: 3, width: 13, height: 18, radius: 2, rotation: 6,
})

/** The three-peaked hat, drawn on the card's face. An SVG path, valid for Path2D. */
export const JOKER_MARK_HAT =
  'M9.2 14.5c.3-2.2.5-3.4 1-4.6.3.9.8 1.5 1.6 1.8.2-1.1.6-2 1.2-2.9.5.9.9 1.8 1 2.9.8-.3 1.3-.9 1.7-1.7.4 1.2.5 2.4.7 4.5'

export const JOKER_MARK_BELLS = Object.freeze([
  Object.freeze({ cx: 9, cy: 9.3, r: 0.6 }),
  Object.freeze({ cx: 12.9, cy: 8, r: 0.6 }),
  Object.freeze({ cx: 16.4, cy: 9.5, r: 0.6 }),
])

/** Kept so the canvas painter and the SVG cannot disagree about what the mark is made of. */
export const JOKER_MARK_PATHS = Object.freeze({
  card: JOKER_MARK_CARD,
  hat: JOKER_MARK_HAT,
  bells: JOKER_MARK_BELLS,
})
