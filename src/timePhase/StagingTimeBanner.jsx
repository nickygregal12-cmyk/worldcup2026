import styles from './TimePhase.module.css'

export default function StagingTimeBanner({ state }) {
  if (state.status !== 'ready' || !state.control.isEnabled) return null
  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <strong>Simulated staging time is active</strong>
      <span>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(state.control.simulatedAt))} · {state.control.phaseKey?.replaceAll('_', ' ')}</span>
    </div>
  )
}
