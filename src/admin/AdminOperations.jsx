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
import { ADMIN_SECTION, ADMIN_SECTIONS, adminSectionDestination, adminSectionFromHash, hasInvalidAdminSection } from '../app/appRoutes.js'

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

export default function AdminOperations({ client, reference, hash = '#/admin' }) {
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
  const activeSection = adminSectionFromHash(hash)
  const activeDestination = adminSectionDestination(activeSection)
  const invalidSection = hasInvalidAdminSection(hash)

  const renderSection = () => {
    if (activeSection === ADMIN_SECTION.OVERVIEW) {
      return (
        <section className={styles.section} id="admin-overview" aria-labelledby="admin-overview-heading" data-admin-section="overview">
          <div className={styles.sectionHeader}><div><h3 id="admin-overview-heading">Operational overview</h3><p>Check current tournament state and runtime health before changing shared data.</p></div></div>
          <AdminSummary matches={matches} role={data.access.adminRole} />
          <RuntimeHealthPanel />
        </section>
      )
    }
    if (activeSection === ADMIN_SECTION.RESULTS) {
      return (
        <section className={`${styles.section} ${styles.matchArea}`} id="admin-results" aria-labelledby="admin-results-heading" data-admin-section="results">
          <div className={styles.sectionHeader}><div><h3 id="admin-results-heading">Result operations</h3><p>Record canonical results, update match state and run explicit single-match recovery.</p></div></div>
          <AdminMatchOperations client={client} tournamentId={reference.tournamentId} matches={matches} features={features} actionStatus={action.status} runAction={runAction} />
        </section>
      )
    }
    if (activeSection === ADMIN_SECTION.CORRECTIONS) {
      return (
        <section className={`${styles.section} ${styles.matchArea}`} id="admin-corrections" aria-labelledby="admin-corrections-heading" data-admin-section="corrections">
          <div className={styles.sectionHeader}><div><h3 id="admin-corrections-heading">Result correction controls</h3><p>Use the same revision-safe result tools for confirmed corrections, status fixes and per-match recovery.</p></div></div>
          <AdminMatchOperations client={client} tournamentId={reference.tournamentId} matches={matches} features={features} actionStatus={action.status} runAction={runAction} />
        </section>
      )
    }
    if (activeSection === ADMIN_SECTION.FIXTURES) {
      return (
        <section className={`${styles.section} ${styles.matchArea}`} id="admin-fixtures" aria-labelledby="admin-fixtures-heading" data-admin-section="fixtures">
          <div className={styles.sectionHeader}><div><h3 id="admin-fixtures-heading">Fixture schedule operations</h3><p>Review every fixture. Owners can update only date, venue, venue-local kick-off and schedule status.</p></div></div>
          <AdminFixtureOperations client={client} tournamentId={reference.tournamentId} matches={matches} venues={data.venues ?? []} adminRole={data.access.adminRole} actionStatus={action.status} runAction={runAction} />
        </section>
      )
    }
    if (activeSection === ADMIN_SECTION.PHASE_FEATURES) {
      return (
        <section className={styles.section} id="admin-phase-features" aria-labelledby="admin-phase-features-heading" data-admin-section="phase-features">
          <div className={styles.sectionHeader}><div><h3 id="admin-phase-features-heading">Phase and feature safeguards</h3><p>Operational readiness, schedule readiness, global lock state, feature controls and canonical allocation safeguards.</p></div></div>
          <AdminReadiness controlRoom={data.controlRoom} />
          <p className={styles.safetyNote}>Irreversible and high-impact actions remain server-authorised, note-gated and audited.</p>
          <AdminControlRoomSections client={client} tournamentId={reference.tournamentId} data={data} matches={matches} runAction={runAction} />
        </section>
      )
    }
    if (activeSection === ADMIN_SECTION.GRACE) {
      return (
        <section className={styles.section} id="admin-grace" aria-labelledby="admin-grace-heading" data-admin-section="grace">
          <div className={styles.sectionHeader}><div><h3 id="admin-grace-heading">Prediction grace controls</h3><p>Grant or revoke a one-user, one-competition, one-unstarted-match exception through the audited control room.</p></div></div>
          <AdminControlRoomSections client={client} tournamentId={reference.tournamentId} data={data} matches={matches} runAction={runAction} />
        </section>
      )
    }
    if (activeSection === ADMIN_SECTION.TIME) {
      return (
        <div data-admin-section="time">
          <AdminTimePhaseSection client={client} tournamentId={reference.tournamentId} adminRole={data.access.adminRole} timeState={timeState} onChanged={timeState.refresh} sectionClass={styles.section} headerClass={styles.sectionHeader} />
        </div>
      )
    }
    if (activeSection === ADMIN_SECTION.PROFILES) {
      return (
        <section className={styles.section} id="admin-profiles" aria-labelledby="admin-profiles-heading" data-admin-section="profiles">
          <div className={styles.sectionHeader}><div><h3 id="admin-profiles-heading">Team content</h3><p>Review and maintain the curated tournament profile content available to users.</p></div></div>
          <AdminTeamProfiles client={client} tournamentId={reference.tournamentId} profiles={data.teamProfiles ?? []} adminRole={data.access.adminRole} runAction={runAction} />
        </section>
      )
    }
    if (activeSection === ADMIN_SECTION.SCORING) {
      return (
        <section className={styles.section} id="admin-scoring" aria-labelledby="admin-scoring-heading" data-admin-section="scoring">
          <div className={styles.sectionHeader}><div><h3 id="admin-scoring-heading">Scoring and recovery</h3><p>Review replacement-based scoring runs and, for owners only, reconcile the whole tournament.</p></div></div>
          <AdminScoringRecovery client={client} tournamentId={reference.tournamentId} adminRole={data.access.adminRole} features={features} runs={data.scoringRuns} actionStatus={action.status} runAction={runAction} />
        </section>
      )
    }
    if (activeSection === ADMIN_SECTION.TOURNAMENT_PICKS) {
      return (
        <section className={styles.section} id="admin-tournament-picks" aria-labelledby="admin-tournament-picks-heading" data-admin-section="tournament-picks">
          <div className={styles.sectionHeader}><div><h3 id="admin-tournament-picks-heading">Tournament Picks</h3><p>The approved contract is ready here; executable outcome entry remains a Stage 17A dependency.</p></div></div>
          <AdminTournamentPicks readiness={data.controlRoom.tournamentPicks} />
        </section>
      )
    }
    return (
      <section className={styles.section} id="admin-audit" aria-labelledby="admin-audit-heading" data-admin-section="audit">
        <div className={styles.sectionHeader}><div><h3 id="admin-audit-heading">Administrator audit</h3><p>Filter and inspect up to 200 append-only operation events without changing or deleting evidence.</p></div></div>
        <AdminAuditTimeline events={data.operationEvents} />
      </section>
    )
  }

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
            <span className={styles.metaChip}>Section: {activeDestination.label}</span>
          </div>
        </div>
        <button type="button" className="foundation-secondary-button" onClick={load}>Refresh control room</button>
      </header>

      <nav className={styles.navigation} aria-label="Admin control-room sections">
        {ADMIN_SECTIONS.map(section => (
          <a
            key={section.key}
            href={section.hash}
            aria-current={section.key === activeSection ? 'page' : undefined}
            data-admin-section-link={section.key}
          >{section.label}</a>
        ))}
      </nav>

      {invalidSection && (
        <p className={styles.routeRecovery} role="status">Unknown admin section requested. Staying inside the protected control room and showing Overview.</p>
      )}

      {action.message && <p className={styles.actionMessage} data-state={action.status} role="status" aria-live="polite">{action.message}</p>}

      {renderSection()}
    </section>
  )
}
