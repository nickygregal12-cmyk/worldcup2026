import { useCallback, useEffect, useState } from 'react'
import AdminAuditTimeline from './AdminAuditTimeline.jsx'
import AdminControlRoomSections from './AdminControlRoomSections.jsx'
import AdminFixtureOperations from './AdminFixtureOperations.jsx'
import AdminMatchOperations from './AdminMatchOperations.jsx'
import AdminReadiness from './AdminReadiness.jsx'
import AdminScoringRecovery from './AdminScoringRecovery.jsx'
import AdminTeamProfiles from './AdminTeamProfiles.jsx'
import AdminTournamentPicks from './AdminTournamentPicks.jsx'
import styles from './AdminControlRoom.module.css'
import { AdminSummary } from './AdminControlRoomStatus.jsx'
import { RuntimeHealthPanel } from '../observability/index.js'
import { AdminTimePhaseSection, useTournamentTimeControl } from '../timePhase/index.js'
import { loadAdminOperations } from './adminOperationsService.js'
import { humaniseAdminValue } from './adminPresentation.js'

function AccessState({ title, description, error = false, onRetry = null }) {
  return (
    <section className={`foundation-panel foundation-admin${error ? ' foundation-panel--error' : ''}`} aria-labelledby="stage13fk2-admin-heading">
      <span className="foundation-kicker">Tournament control room</span>
      <h2 id="stage13fk2-admin-heading">{title}</h2>
      <p>{description}</p>
      {onRetry && <button type="button" className="ui-button ui-button--secondary" onClick={onRetry}>Try again</button>}
    </section>
  )
}

export default function AdminOperations({ client, reference }) {
  const [state, setState] = useState({ status: 'loading', signedIn: false, data: null, error: null })
  const [action, setAction] = useState({ status: 'idle', message: '' })
  const timeState = useTournamentTimeControl({ client, tournamentId: reference.tournamentId })

  const load = useCallback(async () => {
    try {
      const sessionResponse = await client.auth.getSession()
      if (sessionResponse.error) throw sessionResponse.error
      if (!sessionResponse.data?.session?.user) {
        setState({ status: 'ready', signedIn: false, data: null, error: null })
        return
      }
      const data = await loadAdminOperations(client, reference.tournamentId)
      setState({ status: 'ready', signedIn: true, data, error: null })
    } catch (error) {
      setState({ status: 'error', signedIn: false, data: null, error: error instanceof Error ? error.message : String(error) })
    }
  }, [client, reference.tournamentId])

  useEffect(() => {
    void Promise.resolve().then(load)
    const subscription = client.auth.onAuthStateChange(() => load())
    return () => subscription.data.subscription.unsubscribe()
  }, [client, load])

  const runAction = async (work, successMessage) => {
    setAction({ status: 'working', message: 'Applying the audited operation…' })
    try {
      await work()
      setAction({ status: 'success', message: successMessage })
      await load()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const stale = error?.code === '40001'
      setAction({
        status: 'error',
        message: stale
          ? message.includes('Fixture')
            ? 'The fixture changed after this screen loaded. Refresh and review the latest fixture revision before trying again.'
            : 'The result changed after this screen loaded. Refresh and review the latest result revision before trying again.'
          : message,
      })
    }
  }

  if (state.status === 'loading') return <AccessState title="Checking administrator access…" description="Verifying the protected Euro staging role." />
  if (state.status === 'error') return <AccessState error title="Admin operations could not load" description={state.error} onRetry={load} />
  if (!state.signedIn) return <AccessState title="Secure admin controls" description="Sign in with an account that has been granted Euro tournament administrator access." />
  if (!state.data?.access.isAdmin) return <AccessState title="No administrator access" description="Your account is signed in but has not been granted tournament administration rights. Access cannot be self-assigned from the browser." />

  const data = state.data
  const matches = data.matches ?? []
  const features = data.controlRoom?.features ?? []

  return (
    <section className={`foundation-panel foundation-admin ${styles.page}`} aria-labelledby="stage13fk2-admin-heading">
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className="foundation-kicker">Tournament control room</span>
          <h2 id="stage13fk2-admin-heading">Euro 2028 operations</h2>
          <p>One authorised workspace for readiness, fixture scheduling, official results, scoring recovery, safeguards, content and audit evidence.</p>
          <div className={styles.heroMeta}>
            <span className={styles.metaChip}>Role: {humaniseAdminValue(data.access.adminRole)}</span>
            <span className={styles.metaChip}>Protected Euro staging</span>
            <span className={styles.metaChip}>Migration 018 active</span>
          </div>
        </div>
        <button type="button" className="foundation-secondary-button" onClick={load}>Refresh control room</button>
      </header>

      <nav className={styles.navigation} aria-label="Admin control-room sections">
        <a href="#admin-overview">Overview</a>
        <a href="#admin-readiness">Readiness</a>
        <a href="#admin-safeguards">Safeguards</a>
        <a href="#admin-time-phase">Time &amp; Phase</a>
        <a href="#admin-team-content">Team content</a>
        <a href="#admin-fixture-operations">Fixtures</a>
        <a href="#admin-match-operations">Results</a>
        <a href="#admin-scoring-activity">Scoring</a>
        <a href="#admin-tournament-picks">Tournament Picks</a>
        <a href="#admin-audit">Audit</a>
      </nav>

      <section className={styles.section} id="admin-overview" aria-labelledby="admin-overview-heading">
        <div className={styles.sectionHeader}><div><h3 id="admin-overview-heading">Operational overview</h3><p>Check current tournament state and runtime health before changing shared data.</p></div></div>
        <AdminSummary matches={matches} role={data.access.adminRole} />
        <RuntimeHealthPanel />
      </section>

      {action.message && <p className={styles.actionMessage} data-state={action.status} role="status" aria-live="polite">{action.message}</p>}

      <section className={styles.section} id="admin-readiness" aria-labelledby="admin-readiness-heading">
        <div className={styles.sectionHeader}><div><h3 id="admin-readiness-heading">Operational readiness</h3><p>One read-only view of schedule, participant, result, scoring, profile and safeguard readiness.</p></div></div>
        <AdminReadiness controlRoom={data.controlRoom} />
      </section>

      <section className={styles.section} id="admin-safeguards" aria-labelledby="admin-safeguards-heading">
        <div className={styles.sectionHeader}><div><h3 id="admin-safeguards-heading">Tournament safeguards</h3><p>Global lock, feature controls, grace windows and canonical allocation review.</p></div></div>
        <p className={styles.safetyNote}>Irreversible and high-impact actions remain server-authorised, note-gated and audited.</p>
        <AdminControlRoomSections client={client} tournamentId={reference.tournamentId} data={data} matches={matches} runAction={runAction} />
      </section>

      <AdminTimePhaseSection client={client} tournamentId={reference.tournamentId} adminRole={data.access.adminRole} timeState={timeState} onChanged={timeState.refresh} sectionClass={styles.section} headerClass={styles.sectionHeader} />

      <section className={styles.section} id="admin-team-content" aria-labelledby="admin-team-content-heading">
        <div className={styles.sectionHeader}><div><h3 id="admin-team-content-heading">Team content</h3><p>Review and maintain the curated tournament profile content available to users.</p></div></div>
        <AdminTeamProfiles client={client} tournamentId={reference.tournamentId} profiles={data.teamProfiles ?? []} adminRole={data.access.adminRole} runAction={runAction} />
      </section>

      <section className={`${styles.section} ${styles.matchArea}`} id="admin-fixture-operations" aria-labelledby="admin-fixture-operations-heading">
        <div className={styles.sectionHeader}><div><h3 id="admin-fixture-operations-heading">Fixture schedule operations</h3><p>Review every fixture. Owners can update only date, venue, venue-local kick-off and schedule status.</p></div></div>
        <AdminFixtureOperations client={client} tournamentId={reference.tournamentId} matches={matches} venues={data.venues ?? []} adminRole={data.access.adminRole} actionStatus={action.status} runAction={runAction} />
      </section>

      <section className={`${styles.section} ${styles.matchArea}`} id="admin-match-operations" aria-labelledby="admin-match-operations-heading">
        <div className={styles.sectionHeader}><div><h3 id="admin-match-operations-heading">Result operations</h3><p>Record canonical results, update match state and run explicit single-match recovery.</p></div></div>
        <AdminMatchOperations client={client} tournamentId={reference.tournamentId} matches={matches} features={features} actionStatus={action.status} runAction={runAction} />
      </section>

      <section className={styles.section} id="admin-scoring-activity" aria-labelledby="admin-scoring-activity-heading">
        <div className={styles.sectionHeader}><div><h3 id="admin-scoring-activity-heading">Scoring and recovery</h3><p>Review replacement-based scoring runs and, for owners only, reconcile the whole tournament.</p></div></div>
        <AdminScoringRecovery client={client} tournamentId={reference.tournamentId} adminRole={data.access.adminRole} features={features} runs={data.scoringRuns} actionStatus={action.status} runAction={runAction} />
      </section>

      <section className={styles.section} id="admin-tournament-picks" aria-labelledby="admin-tournament-picks-heading">
        <div className={styles.sectionHeader}><div><h3 id="admin-tournament-picks-heading">Tournament Picks</h3><p>The approved contract is ready here; executable outcome entry remains a Stage 17A dependency.</p></div></div>
        <AdminTournamentPicks readiness={data.controlRoom.tournamentPicks} />
      </section>

      <section className={styles.section} id="admin-audit" aria-labelledby="admin-audit-heading">
        <div className={styles.sectionHeader}><div><h3 id="admin-audit-heading">Administrator audit</h3><p>Filter and inspect up to 200 append-only operation events without changing or deleting evidence.</p></div></div>
        <AdminAuditTimeline events={data.operationEvents} />
      </section>
    </section>
  )
}
