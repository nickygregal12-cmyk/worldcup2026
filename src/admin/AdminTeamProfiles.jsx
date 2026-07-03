import { useMemo, useState } from 'react'
import { createAdminTeamProfileDraft, validateAdminTeamProfileDraft } from './adminOperationsModel.js'
import { saveAdminTeamProfile } from './adminOperationsService.js'
import { SelectField } from '../design-system/index.jsx'

function AdminTeamProfileEditor({ client, tournamentId, profile, adminRole, runAction }) {
  const [draft, setDraft] = useState(() => createAdminTeamProfileDraft(profile))
  const [dirty, setDirty] = useState(false)
  const validation = validateAdminTeamProfileDraft(draft)
  const canEdit = adminRole === 'owner'
  const update = (key, value) => {
    setDirty(true)
    setDraft(previous => ({ ...previous, [key]: value }))
  }

  return (
    <>
      {profile.isProvisional && <p className="foundation-warning-text">This tournament identity is provisional. Any sample editorial content must remain clearly labelled.</p>}

      <div className="admin-team-profile-grid">
        <label><span>Ranking</span><input type="number" min="1" max="300" value={draft.ranking} onChange={event => update('ranking', event.target.value)} disabled={!canEdit} /></label>
        <label><span>Qualifying route</span><input maxLength="180" value={draft.qualifyingRoute} onChange={event => update('qualifyingRoute', event.target.value)} disabled={!canEdit} /></label>
        <label><span>Best EURO finish</span><input maxLength="120" value={draft.bestEuroFinish} onChange={event => update('bestEuroFinish', event.target.value)} disabled={!canEdit} /></label>
      </div>

      <label className="foundation-admin-note"><span>Editorial note</span><textarea maxLength="700" value={draft.editorialNote} onChange={event => update('editorialNote', event.target.value)} disabled={!canEdit} /></label>
      <label className="foundation-admin-note"><span>Audit note</span><textarea maxLength="500" value={draft.note} onChange={event => update('note', event.target.value)} disabled={!canEdit} placeholder="Explain the source or reason for this profile update." /></label>

      {!canEdit && <p className="foundation-empty-copy">Results administrators may inspect profile content, but only the tournament owner can edit it.</p>}
      {dirty && !validation.valid && canEdit && <ul className="foundation-admin-validation">{validation.errors.map(error => <li key={error}>{error}</li>)}</ul>}

      <button
        type="button"
        className="ui-button ui-button--primary"
        disabled={!canEdit || !validation.valid}
        onClick={() => runAction(
          () => saveAdminTeamProfile(client, tournamentId, profile, validation),
          `${profile.teamName} profile saved.`,
        )}
      >Save team profile</button>
    </>
  )
}

export default function AdminTeamProfiles({ client, tournamentId, profiles, adminRole, runAction }) {
  const [selectedId, setSelectedId] = useState(profiles[0]?.tournamentTeamId ?? '')
  const selected = useMemo(
    () => profiles.find(profile => profile.tournamentTeamId === selectedId) ?? profiles[0] ?? null,
    [profiles, selectedId],
  )

  if (!selected) return null

  return (
    <article className="foundation-results-card foundation-results-card--wide admin-team-profiles">
      <div className="foundation-results-card__heading">
        <div>
          <span className="foundation-kicker">Team Profile Sheet</span>
          <h3>Curated team facts</h3>
          <p>These facts are stored centrally and never hardcoded into the profile component.</p>
        </div>
        <small>Owner-edited · revision {selected.profileRevision}</small>
      </div>

      <SelectField
        label="Choose tournament team"
        value={selected.tournamentTeamId}
        onChange={setSelectedId}
        options={profiles.map(profile => ({
          value: profile.tournamentTeamId,
          label: `${profile.teamName} · ${profile.groupCode ? `Group ${profile.groupCode}` : profile.slotCode}`,
        }))}
      />

      <AdminTeamProfileEditor
        key={`${selected.tournamentTeamId}:${selected.profileRevision}`}
        client={client}
        tournamentId={tournamentId}
        profile={selected}
        adminRole={adminRole}
        runAction={runAction}
      />
    </article>
  )
}
