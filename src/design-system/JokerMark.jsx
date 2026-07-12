import styles from './JokerMark.module.css'

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
 */
export default function JokerMark({ size = 22, strokeWidth = 1.8, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
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
      <rect x="5.5" y="3" width="13" height="18" rx="2" transform="rotate(6 12 12)" />
      <path d="M9.2 14.5c.3-2.2.5-3.4 1-4.6.3.9.8 1.5 1.6 1.8.2-1.1.6-2 1.2-2.9.5.9.9 1.8 1 2.9.8-.3 1.3-.9 1.7-1.7.4 1.2.5 2.4.7 4.5" />
      <circle cx="9" cy="9.3" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12.9" cy="8" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="16.4" cy="9.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
