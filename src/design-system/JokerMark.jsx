import styles from './JokerMark.module.css'
import { JOKER_MARK_BELLS, JOKER_MARK_CARD, JOKER_MARK_HAT, JOKER_MARK_VIEWBOX } from './jokerMarkPaths.js'

/**
 * The joker mark: a tilted playing card wearing a jester's hat.
 *
 * A generic star said nothing. It reads as "favourite" — it is the same star a
 * dozen other products use for a dozen other meanings — and it never once said
 * "this match is doubled". The joker is a playing card, so the mark is one: a card
 * knocked out of true, with the three-peaked hat and its bells drawn on the face.
 * It carries the meaning before the "2×" beside it is read.
 *
 * Hand-drawn because lucide has no joker, and shaped to lucide's own geometry —
 * 24×24 box, currentColor stroke, round caps and joins — so it sits in a row with
 * the library icons without looking like a guest. It lives in its own file rather
 * than inside Icon.jsx because Icon.jsx is a lucide adapter and the token audit
 * holds it to that: no raw SVG there. Icon maps `joker` to this.
 *
 * The bells are filled, not stroked: at the 16px the pill renders, a 0.6-radius
 * outlined circle disappears.
 *
 * The shapes themselves live in jokerMarkPaths.js, because the share image paints this same mark
 * onto a canvas, where there is no SVG — one description of the mark, two renderers.
 */
export default function JokerMark({ size = 22, strokeWidth = 1.8, className = '' }) {
  const { x, y, width, height, radius, rotation } = JOKER_MARK_CARD
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${JOKER_MARK_VIEWBOX} ${JOKER_MARK_VIEWBOX}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${styles.mark} ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
      data-joker-mark="true"
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={radius}
        transform={`rotate(${rotation} ${JOKER_MARK_VIEWBOX / 2} ${JOKER_MARK_VIEWBOX / 2})`}
      />
      <path d={JOKER_MARK_HAT} />
      {JOKER_MARK_BELLS.map(bell => (
        <circle key={`${bell.cx}-${bell.cy}`} cx={bell.cx} cy={bell.cy} r={bell.r} fill="currentColor" stroke="none" />
      ))}
    </svg>
  )
}
