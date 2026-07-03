import { useState } from 'react'
import { ENVIRONMENT } from '../config/environment.js'
import { TIME_PHASE_PRESETS } from './timePhaseModel.js'
import { resetTournamentTimeControl, setTournamentTimeControl } from './timePhaseService.js'
import styles from './TimePhase.module.css'

function localValue(iso) {
  const date = new Date(iso)
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return shifted.toISOString().slice(0, 16)
}

export default function AdminTimePhasePanel({ client, tournamentId, adminRole, timeState, onChanged }) {
  const [phaseKey, setPhaseKey] = useState('pre_lock')
  const [customAt, setCustomAt] = useState(localValue(TIME_PHASE_PRESETS[0].at))
  const [note, setNote] = useState('')
  const [action, setAction] = useState({ status: 'idle', message: '' })
  const owner = adminRole === 'owner'
  const environmentAllowed = ENVIRONMENT.appEnv === 'staging' && ENVIRONMENT.enableTimeTravel

  const choose = key => {
    const next = TIME_PHASE_PRESETS.find(item => item.key === key)
    setPhaseKey(key)
    if (next) setCustomAt(localValue(next.at))
  }

  const run = async operation => {
    setAction({ status: 'working', message: 'Applying staging time control…' })
    try {
      await operation()
      setNote('')
      await onChanged()
      setAction({ status: 'success', message: 'Staging time control updated.' })
    } catch (error) {
      setAction({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }

  return (
    <article className={`foundation-results-card foundation-results-card--wide ${styles.panel}`}>
      <span className="foundation-kicker">Staging only · owner controlled</span>
      <h3>Time &amp; Phase simulator</h3>
      <p>Changes the application clock used for testing. It never changes fixture, result, lock or scoring records.</p>
      {!environmentAllowed && <p className={styles.blocked}>Disabled: this build must use VITE_APP_ENV=staging and VITE_ENABLE_TIME_TRAVEL=true.</p>}
      {!owner && <p className={styles.blocked}>Only a tournament owner can change simulated time.</p>}
      <div className={styles.current}>
        <strong>{timeState.control.isEnabled ? 'Simulation active' : 'Real time active'}</strong>
        <span>{timeState.control.isEnabled ? `${timeState.control.simulatedAt} · ${timeState.control.phaseKey}` : 'No override is applied.'}</span>
        <small>Revision {timeState.control.revision}</small>
      </div>
      <div className={styles.formGrid}>
        <label><span>Scenario</span><select value={phaseKey} onChange={event => choose(event.target.value)}>{TIME_PHASE_PRESETS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
        <label><span>Simulated date and time</span><input type="datetime-local" value={customAt} onChange={event => { setCustomAt(event.target.value); setPhaseKey('custom') }} /></label>
      </div>
      <label className="foundation-admin-note"><span>Audit note</span><textarea value={note} maxLength="500" onChange={event => setNote(event.target.value)} placeholder="Explain the test scenario or why real time is being restored." /></label>
      <div className={styles.actions}>
        <button type="button" disabled={!owner || !environmentAllowed || note.trim().length < 5 || action.status === 'working'} onClick={() => run(() => setTournamentTimeControl(client, tournamentId, timeState.control, { simulatedAt: new Date(customAt).toISOString(), phaseKey, note }))}>Apply simulated time</button>
        <button type="button" className="foundation-secondary-button" disabled={!owner || !environmentAllowed || !timeState.control.isEnabled || note.trim().length < 5 || action.status === 'working'} onClick={() => run(() => resetTournamentTimeControl(client, tournamentId, timeState.control, note))}>Return to real time</button>
      </div>
      {action.message && <p className={styles.message} data-state={action.status} role="status">{action.message}</p>}
    </article>
  )
}
