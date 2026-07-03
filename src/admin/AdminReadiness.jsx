import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import styles from './AdminOperationsCompletion.module.css'

function ReadinessGroup({ title, state, summary, items }) {
  return (
    <article className={styles.readinessCard} data-state={state}>
      <div className={styles.readinessHeading}>
        <h4>{title}</h4>
        <span>{state === 'ready' ? 'Ready' : state === 'attention' ? 'Needs attention' : 'Blocked'}</span>
      </div>
      <p>{summary}</p>
      <dl>
        {items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </article>
  )
}

export default function AdminReadiness({ controlRoom }) {
  const health = controlRoom.health
  const fixtureIssues = health.fixturesMissingDate + health.fixturesMissingVenue + health.fixturesMissingConfirmedKickoff
  const participantIssues = health.unresolvedParticipantSlots + health.provisionalParticipantFixtures
  const resultIssues = health.manualReviewResults + health.voidResults
  const scoringIssues = health.failedScoringRuns + health.staleRunningScoringRuns
  const safeguardIssues = health.expiredUnrevokedGraceWindows + health.disabledFeatures

  const groups = [
    {
      title: 'Fixture schedule',
      state: fixtureIssues === 0 ? 'ready' : 'attention',
      summary: fixtureIssues === 0 ? 'Every match has a complete official schedule.' : 'Some dates, venues or confirmed kick-offs still need owner review.',
      items: [
        ['Missing date', health.fixturesMissingDate],
        ['Missing venue', health.fixturesMissingVenue],
        ['Missing confirmed kick-off', health.fixturesMissingConfirmedKickoff],
        ['Official datetime', health.officialDatetimeFixtures],
      ],
    },
    {
      title: 'Participants',
      state: participantIssues === 0 ? 'ready' : 'attention',
      summary: participantIssues === 0 ? 'All participants and resolver slots are confirmed.' : 'Provisional participants and unresolved knockout slots remain visible, not editable here.',
      items: [
        ['Provisional fixtures', health.provisionalParticipantFixtures],
        ['Confirmed fixtures', health.confirmedParticipantFixtures],
        ['Unresolved slots', health.unresolvedParticipantSlots],
      ],
    },
    {
      title: 'Results',
      state: resultIssues === 0 ? 'ready' : 'attention',
      summary: resultIssues === 0 ? 'No result is waiting for manual review or marked void.' : 'Review exceptional result states before relying on the full scoring picture.',
      items: [
        ['Pending', health.pendingResults],
        ['Confirmed', health.confirmedResults],
        ['Manual review', health.manualReviewResults],
        ['Void', health.voidResults],
      ],
    },
    {
      title: 'Scoring',
      state: scoringIssues === 0 ? 'ready' : 'blocked',
      summary: scoringIssues === 0 ? 'No failed or stale-running scoring run is recorded.' : 'A failed or stale run needs owner-led recovery.',
      items: [
        ['Completed runs', health.completedScoringRuns],
        ['Failed runs', health.failedScoringRuns],
        ['Stale running', health.staleRunningScoringRuns],
      ],
    },
    {
      title: 'Team profiles',
      state: health.incompleteTeamProfiles === 0 ? 'ready' : 'attention',
      summary: health.incompleteTeamProfiles === 0 ? 'Every tournament team has complete curated profile content.' : 'Some Team Profiles still have missing curated fields.',
      items: [
        ['Complete', health.completeTeamProfiles],
        ['Incomplete', health.incompleteTeamProfiles],
      ],
    },
    {
      title: 'Safeguards',
      state: safeguardIssues === 0 ? 'ready' : 'attention',
      summary: controlRoom.lock.isIrreversible ? 'The global lock has been permanently applied.' : 'The global lock remains reversible only until it is actually applied.',
      items: [
        ['Global lock effective', controlRoom.lock.isEffective ? 'Yes' : 'No'],
        ['Disabled features', health.disabledFeatures],
        ['Active grace windows', health.activeGraceWindows],
        ['Expired not revoked', health.expiredUnrevokedGraceWindows],
      ],
    },
  ]

  return <div className={styles.readinessGrid}>{groups.map(group => <ReadinessGroup key={group.title} {...group} />)}</div>
}
