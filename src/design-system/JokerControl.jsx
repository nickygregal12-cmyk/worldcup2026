import Icon from './Icon.jsx'
import styles from './JokerControl.module.css'

// The joker pill and the five-dot joker meter. Gold is joker-exclusive (§5).
//
// A joker doubles THAT MATCH'S score points only. The multiplier is passed in
// from central scoring config — never hardcoded here, and never rendered as a
// point value in prose.

function normaliseCount(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback
}

export function JokerPill({
  active = false,
  disabled = false,
  multiplier = 2,
  statusLabel = null,
  matchLabel = 'this match',
  className = '',
  onClick,
}) {
  const multiplierLabel = `${multiplier}×`
  const stateLabel = statusLabel ?? (active ? 'Joker applied' : disabled ? 'Joker unavailable' : 'Add joker')
  const classes = [styles.pill, active ? styles.active : '', className].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      aria-pressed={active}
      aria-label={`${stateLabel} for ${matchLabel}`}
      data-joker-pill="true"
      onClick={onClick}
    >
      <Icon name="star" size={14} className={styles.icon} />
      <span>Joker</span>
      {active && <strong className={styles.multiplier}>{multiplierLabel}</strong>}
    </button>
  )
}

export function JokerMeter({ value = 0, max = 5, multiplier = 2, label = 'Jokers selected', className = '' }) {
  const safeMax = Math.max(0, normaliseCount(max, 5))
  const safeValue = Math.min(safeMax, normaliseCount(value, 0))
  const dots = Array.from({ length: safeMax }, (_, index) => index < safeValue)

  return (
    <div
      className={`${styles.meter} ${className}`.trim()}
      aria-label={`${safeValue} of ${safeMax} ${label}`}
      data-joker-meter="true"
    >
      <Icon name="star" size={14} className={styles.star} />
      <span className={styles.label}>JOKER METER</span>
      <span className={styles.dots} aria-hidden="true">
        {dots.map((filled, index) => (
          <span
            key={index}
            className={filled ? `${styles.dot} ${styles.filled}` : styles.dot}
            data-joker-dot={filled ? 'filled' : 'empty'}
          />
        ))}
      </span>
      <strong>{safeValue}/{safeMax}</strong>
      <small>{multiplier}× points</small>
    </div>
  )
}

export default JokerPill
