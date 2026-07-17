import { useState } from 'react'
import Icon from './Icon.jsx'
import { needsHighScoreConfirm, parseScore, rememberConfirmed, stepScore } from './scoreInputModel.js'
import styles from './ScoreInput.module.css'

export default function ScoreInput({
  value,
  label,
  disabled = false,
  readOnly = false,
  grace = false,
  state = 'idle',
  min = 0,
  max = 99,
  compact = false,
  onChange,
}) {
  // Values the user has already confirmed as intentional high scores, so we
  // never re-ask for the same one (item 63: shown once per confirmed value).
  const [confirmed, setConfirmed] = useState(() => new Set())
  const [pendingHigh, setPendingHigh] = useState(null)

  const classes = [
    styles.scoreInput,
    disabled || readOnly ? styles.readonly : '',
    grace ? styles.grace : '',
    compact ? styles.compact : '',
    styles[state] ?? '',
  ].filter(Boolean).join(' ')

  if (disabled || readOnly) {
    return (
      <div className={classes} data-score-input="readonly" data-grace={grace || undefined} aria-label={`${label}: ${value ?? 'not predicted'}, read only`}>
        <strong>{value ?? '–'}</strong>
        <Icon name={grace ? 'unlock' : 'lock'} size={15} />
      </div>
    )
  }

  // Steppers commit immediately and mark high values confirmed, so a later typed
  // entry of the same number never triggers the confirm.
  const step = delta => {
    const next = stepScore(value, delta, min, max)
    setConfirmed(previous => rememberConfirmed(previous, next))
    setPendingHigh(null)
    onChange(next)
  }

  const onType = event => {
    const next = parseScore(event.target.value, min, max)
    if (next != null && needsHighScoreConfirm(next, confirmed)) {
      setPendingHigh(next)
      return // hold the value until confirmed; do not commit yet
    }
    setPendingHigh(null)
    onChange(next)
  }

  const confirmHigh = () => {
    setConfirmed(previous => rememberConfirmed(previous, pendingHigh))
    onChange(pendingHigh)
    setPendingHigh(null)
  }

  const cancelHigh = () => setPendingHigh(null)

  const displayValue = pendingHigh != null ? pendingHigh : (value ?? '')

  return (
    <div className={classes} data-score-input="editable" data-state={state}>
      <div className={styles.stepper}>
        {compact && <button type="button" className={styles.step} aria-label={`Decrease ${label}`} disabled={(value ?? 0) <= min} onClick={() => step(-1)}>▼</button>}
        {!compact && <button type="button" className={styles.step} aria-label={`Increase ${label}`} disabled={(value ?? 0) >= max} onClick={() => step(1)}>▲</button>}
        <input
          className={styles.number}
          type="number"
          min={min}
          max={max}
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={label}
          value={displayValue}
          onChange={onType}
        />
        {compact && <button type="button" className={styles.step} aria-label={`Increase ${label}`} disabled={(value ?? 0) >= max} onClick={() => step(1)}>▲</button>}
        {!compact && <button type="button" className={styles.step} aria-label={`Decrease ${label}`} disabled={(value ?? 0) <= min} onClick={() => step(-1)}>▼</button>}
      </div>
      {pendingHigh != null && (
        <div className={styles.confirm} role="group" aria-label={`Confirm ${pendingHigh} goals`}>
          <span className={styles.confirmText}>{pendingHigh} goals — is that right?</span>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.confirmYes} onClick={confirmHigh}>Yes</button>
            <button type="button" className={styles.confirmNo} onClick={cancelHigh}>Edit</button>
          </div>
        </div>
      )}
    </div>
  )
}
