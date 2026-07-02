import React from 'react' // eslint-disable-line no-unused-vars
import Icon from './Icon.jsx'

const STATE = Object.freeze({
  empty: { label: 'Needs prediction', tone: 'neutral', icon: 'clock' },
  complete: { label: 'Complete', tone: 'safe', icon: 'check' },
  local: { label: 'Saved on this device', tone: 'safe', icon: 'save' },
  dirty: { label: 'Changes waiting', tone: 'warning', icon: 'clock' },
  saving: { label: 'Saving…', tone: 'info', icon: 'loader' },
  saved: { label: 'Saved', tone: 'safe', icon: 'check' },
  submitted: { label: 'Submitted for review', tone: 'info', icon: 'check' },
  locked: { label: 'Locked', tone: 'neutral', icon: 'lock' },
  grace: { label: 'Grace active', tone: 'warning', icon: 'unlock' },
  conflict: { label: 'Reload required', tone: 'danger', icon: 'alert' },
  error: { label: 'Save failed', tone: 'danger', icon: 'alert' },
})

export default function PredictionStateBadge({ state = 'empty', label = null, className = '' }) {
  const config = STATE[state] ?? STATE.empty
  return (
    <span className={`prediction-state prediction-state--${config.tone} ${className}`.trim()} data-prediction-state={state}>
      <Icon name={config.icon} size={14} className={state === 'saving' ? 'ui-icon--spin' : ''} />
      <span>{label ?? config.label}</span>
    </span>
  )
}
