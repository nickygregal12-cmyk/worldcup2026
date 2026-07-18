import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import Icon from './Icon.jsx'
import styles from './PredictionStateBadge.module.css'

// Save wording must always answer one question: where does this pick actually live?
//   'saved' -> on the account, follows you to any device you sign in on.
//   'local' -> this browser only. Correct behaviour for a guest, but say so plainly.
//   anything else -> not saved yet. Never imply a save that has not happened.
// 'complete' means every field is filled in. It is NOT a save state, so it must not say
// "Complete" on its own — that read as "saved" and was the reported confusion.
const STATE = Object.freeze({
  empty: { label: 'Open', tone: 'neutral', icon: 'clock' },
  complete: { label: 'Filled in', tone: 'safe', icon: 'check' },
  local: { label: 'Saved on this device only', tone: 'warning', icon: 'save' },
  dirty: { label: 'Not saved yet', tone: 'warning', icon: 'clock' },
  saving: { label: 'Saving…', tone: 'info', icon: 'loader' },
  saved: { label: 'Saved to your account', tone: 'safe', icon: 'check' },
  submitted: { label: 'Submitted for review', tone: 'info', icon: 'check' },
  locked: { label: 'Locked', tone: 'neutral', icon: 'lock' },
  grace: { label: 'Grace active', tone: 'warning', icon: 'unlock' },
  conflict: { label: 'Not saved — reload required', tone: 'danger', icon: 'alert' },
  error: { label: 'Not saved — save failed', tone: 'danger', icon: 'alert' },
})

export default function PredictionStateBadge({ state = 'empty', label = null, className = '' }) {
  const config = STATE[state] ?? STATE.empty
  const classes = [styles.badge, styles[config.tone] ?? '', className].filter(Boolean).join(' ')
  return (
    <span className={classes} data-prediction-state={state} data-prediction-tone={config.tone}>
      <Icon name={config.icon} size={14} className={state === 'saving' ? 'ui-icon--spin' : ''} />
      <span>{label ?? config.label}</span>
    </span>
  )
}
