import React from 'react'

const ensureClassicJsxRuntime = () => Boolean(React)

import Icon from './Icon.jsx'

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
  ensureClassicJsxRuntime()
  const multiplierLabel = `${multiplier}×`
  const stateLabel = statusLabel ?? (active ? 'Joker applied' : disabled ? 'Joker unavailable' : 'Add joker')
  const classes = [
    'joker-control',
    'joker-control--pill',
    active ? 'is-active' : '',
    className,
  ].filter(Boolean).join(' ')

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
      <Icon name="star" size={14} className="joker-control__icon" />
      <span>Joker</span>
      {active && <strong className="joker-control__multiplier">{multiplierLabel}</strong>}
    </button>
  )
}

export function JokerMeter({ value = 0, max = 5, multiplier = 2, label = 'Jokers selected', className = '' }) {
  ensureClassicJsxRuntime()
  const safeMax = Math.max(0, normaliseCount(max, 5))
  const safeValue = Math.min(safeMax, normaliseCount(value, 0))
  const dots = Array.from({ length: safeMax }, (_, index) => index < safeValue)

  return (
    <div
      className={`groups-joker-meter groups-joker-meter--dots ${className}`.trim()}
      aria-label={`${safeValue} of ${safeMax} ${label}`}
      data-joker-meter="true"
    >
      <Icon name="star" size={14} className="groups-joker-meter__star" />
      <span className="groups-joker-meter__label">JOKER METER</span>
      <span className="groups-joker-meter__dots" aria-hidden="true">
        {dots.map((filled, index) => <span key={index} className={filled ? 'groups-joker-dot is-active' : 'groups-joker-dot'} />)}
      </span>
      <strong>{safeValue}/{safeMax}</strong>
      <small>{multiplier}× points</small>
    </div>
  )
}

export default JokerPill
