import React from 'react' // eslint-disable-line no-unused-vars
import Icon from './Icon.jsx'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function parseScore(value, min, max) {
  if (value === '') return null
  const numeric = Number(value)
  return Number.isInteger(numeric) ? clamp(numeric, min, max) : null
}

export default function ScoreInput({
  value,
  label,
  disabled = false,
  readOnly = false,
  grace = false,
  state = 'idle',
  min = 0,
  max = 99,
  onChange,
}) {
  const classes = [
    'score-input',
    disabled || readOnly ? 'score-input--readonly' : '',
    grace ? 'score-input--grace' : '',
    `score-input--${state}`,
  ].filter(Boolean).join(' ')

  if (disabled || readOnly) {
    return (
      <div className={classes} aria-label={`${label}: ${value ?? 'not predicted'}, read only`}>
        <strong>{value ?? '–'}</strong>
        <Icon name={grace ? 'unlock' : 'lock'} size={15} />
      </div>
    )
  }

  const step = delta => onChange(clamp((value ?? 0) + delta, min, max))

  return (
    <div className={classes} data-state={state}>
      <button type="button" className="score-input__step score-input__step--minus" aria-label={`Decrease ${label}`} disabled={(value ?? 0) <= min} onClick={() => step(-1)}>−</button>
      <input
        type="number"
        min={min}
        max={max}
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        value={value ?? ''}
        onChange={event => onChange(parseScore(event.target.value, min, max))}
      />
      <button type="button" className="score-input__step score-input__step--plus" aria-label={`Increase ${label}`} disabled={(value ?? 0) >= max} onClick={() => step(1)}>+</button>
    </div>
  )
}
