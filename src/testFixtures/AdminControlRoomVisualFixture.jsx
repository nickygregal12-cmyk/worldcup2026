import React from 'react' // eslint-disable-line no-unused-vars
import AdminAuditTimeline from '../admin/AdminAuditTimeline.jsx'
import AdminFixtureOperations from '../admin/AdminFixtureOperations.jsx'
import AdminReadiness from '../admin/AdminReadiness.jsx'
import AdminScoringRecovery from '../admin/AdminScoringRecovery.jsx'
import AdminTournamentPicks from '../admin/AdminTournamentPicks.jsx'
import controlStyles from '../admin/AdminControlRoom.module.css'

const venues = Object.freeze([
  { venueId: 'hampden', venueName: 'Hampden Park', venueCity: 'Glasgow', venueTimezone: 'Europe/London' },
  { venueId: 'wembley', venueName: 'Wembley Stadium', venueCity: 'London', venueTimezone: 'Europe/London' },
])

const matches = Object.freeze(Array.from({ length: 8 }, (_, index) => Object.freeze({
  matchId: `visual-admin-match-${index + 1}`,
  matchNumber: index + 1,
  fixtureCode: `GS-A-${String(index + 1).padStart(2, '0')}`,
  stageName: 'Group stage',
  groupCode: index < 6 ? 'A' : 'B',
  homeTeamLabel: index % 2 ? 'Germany' : 'Scotland',
  awayTeamLabel: index % 2 ? 'Scotland' : 'Germany',
  fixtureRevision: index === 0 ? 3 : 1,
  scheduledDate: index < 4 ? `2028-06-${String(9 + index).padStart(2, '0')}` : null,
  kickoffAt: index === 0 ? '2028-06-09T19:00:00.000Z' : null,
  scheduleStatus: index === 0 ? 'official_datetime' : index < 4 ? 'official_date_venue' : 'provisional',
  participantsStatus: 'provisional',
  venueId: index < 4 ? venues[index % 2].venueId : null,
  venueName: index < 4 ? venues[index % 2].venueName : null,
  venueCity: index < 4 ? venues[index % 2].venueCity : null,
  venueTimezone: index < 4 ? 'Europe/London' : null,
  matchStatus: 'scheduled',
  resultStatus: 'pending',
  resultRevision: 0,
})))

const controlRoom = Object.freeze({
  lock: { isEffective: false, isIrreversible: false },
  health: {
    fixturesMissingDate: 47, fixturesMissingVenue: 47, fixturesMissingConfirmedKickoff: 50,
    officialDatetimeFixtures: 1, provisionalParticipantFixtures: 51, confirmedParticipantFixtures: 0,
    unresolvedParticipantSlots: 30, pendingResults: 51, confirmedResults: 0,
    manualReviewResults: 0, voidResults: 0, completedScoringRuns: 2, failedScoringRuns: 0,
    staleRunningScoringRuns: 0, completeTeamProfiles: 18, incompleteTeamProfiles: 6,
    disabledFeatures: 0, activeGraceWindows: 1, expiredUnrevokedGraceWindows: 0,
  },
})

const events = Object.freeze([
  { eventId: 'event-1', operationType: 'fixture_schedule_updated', matchId: matches[0].matchId, matchNumber: 1, performedByDisplayName: 'Nicky', note: 'Official date, venue and kick-off confirmed from the tournament schedule.', createdAt: '2026-07-03T13:15:00Z', payload: { before: { fixture_revision: 2, scheduled_date: '2028-06-09', venue_name: 'Hampden Park', schedule_status: 'official_date_venue' }, after: { fixture_revision: 3, scheduled_date: '2028-06-09', kickoff_at: '2028-06-09T19:00:00Z', venue_name: 'Hampden Park', venue_city: 'Glasgow', venue_timezone: 'Europe/London', schedule_status: 'official_datetime' } } },
  { eventId: 'event-2', operationType: 'tournament_points_reconciled', performedByDisplayName: 'Nicky', note: 'Complete replacement reconciliation after result review.', createdAt: '2026-07-03T13:25:00Z', payload: { scoring_run_id: 'visual-scoring-run', status: 'completed', prediction_total_rows: 38 } },
])

export default function AdminControlRoomVisualFixture() {
  return (
    <main className="content-stack legacy-page">
      <section className={`foundation-panel foundation-admin ${controlStyles.page}`}>
        <header className={controlStyles.hero}>
          <div className={controlStyles.heroCopy}>
            <span className="foundation-kicker">Tournament control room</span>
            <h1>Euro 2028 operations</h1>
            <p>Readiness, fixture scheduling, scoring recovery and append-only audit evidence.</p>
            <div className={controlStyles.heroMeta}><span className={controlStyles.metaChip}>Role: Owner</span><span className={controlStyles.metaChip}>Protected Euro staging</span><span className={controlStyles.metaChip}>Migration 018 active</span></div>
          </div>
          <button type="button" className="foundation-secondary-button">Refresh control room</button>
        </header>

        <section className={controlStyles.section}>
          <div className={controlStyles.sectionHeader}><div><h2>Operational readiness</h2><p>One consolidated view before shared tournament data changes.</p></div></div>
          <AdminReadiness controlRoom={controlRoom} />
        </section>

        <section className={`${controlStyles.section} ${controlStyles.matchArea}`}>
          <div className={controlStyles.sectionHeader}><div><h2>Fixture schedule operations</h2><p>Owner-only revision-safe scheduling.</p></div></div>
          <AdminFixtureOperations client={{}} tournamentId="visual-tournament" matches={matches} venues={venues} adminRole="owner" actionStatus="idle" runAction={() => {}} />
        </section>

        <section className={controlStyles.section}>
          <div className={controlStyles.sectionHeader}><div><h2>Scoring and recovery</h2><p>Separate Original and KO replacement totals.</p></div></div>
          <AdminScoringRecovery client={{}} tournamentId="visual-tournament" adminRole="owner" features={[]} runs={[{ scoringRunId: 'run-1', status: 'completed', startedAt: '2026-07-03T13:00:00Z', triggerMatchNumber: null }]} actionStatus="idle" runAction={() => {}} />
        </section>

        <section className={controlStyles.section}><AdminTournamentPicks readiness={{ contractReady: true, outcomeActivationReady: false }} /></section>
        <section className={controlStyles.section}><AdminAuditTimeline events={events} /></section>
      </section>
    </main>
  )
}
