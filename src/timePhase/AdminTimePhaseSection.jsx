import AdminTimePhasePanel from './AdminTimePhasePanel.jsx'

export default function AdminTimePhaseSection({ client, tournamentId, adminRole, timeState, onChanged, sectionClass, headerClass }) {
  return (
    <section className={sectionClass} id="admin-time-phase" aria-labelledby="admin-time-phase-heading">
      <div className={headerClass}>
        <div>
          <h3 id="admin-time-phase-heading">Staging Time &amp; Phase</h3>
          <p>Test lock, grace, knockout and completion states through one audited application clock.</p>
        </div>
      </div>
      <AdminTimePhasePanel
        client={client}
        tournamentId={tournamentId}
        adminRole={adminRole}
        timeState={timeState}
        onChanged={onChanged}
      />
    </section>
  )
}
