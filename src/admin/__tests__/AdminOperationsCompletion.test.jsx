import React from 'react' // eslint-disable-line no-unused-vars
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AdminAuditTimeline from '../AdminAuditTimeline.jsx'
import AdminFixtureOperations from '../AdminFixtureOperations.jsx'
import AdminReadiness from '../AdminReadiness.jsx'
import AdminScoringRecovery from '../AdminScoringRecovery.jsx'
import AdminTournamentPicks from '../AdminTournamentPicks.jsx'

const match = Object.freeze({
  matchId: 'm', matchNumber: 1, fixtureCode: 'GS-A-01', stageName: 'Group stage', groupCode: 'A',
  homeTeamLabel: 'Scotland', awayTeamLabel: 'Germany', fixtureRevision: 2,
  scheduledDate: '2028-06-09', kickoffAt: '2028-06-09T19:00:00.000Z', scheduleStatus: 'official_datetime',
  participantsStatus: 'provisional', venueId: 'v', venueName: 'Hampden Park', venueCity: 'Glasgow', venueTimezone: 'Europe/London',
  matchStatus: 'scheduled', resultStatus: 'pending', resultRevision: 0,
})
const venue = Object.freeze({ venueId: 'v', venueName: 'Hampden Park', venueCity: 'Glasgow', venueTimezone: 'Europe/London' })
const controlRoom = Object.freeze({
  lock: { isEffective: false, isIrreversible: false },
  health: {
    fixturesMissingDate: 0, fixturesMissingVenue: 0, fixturesMissingConfirmedKickoff: 0,
    officialDatetimeFixtures: 51, provisionalParticipantFixtures: 24, confirmedParticipantFixtures: 27,
    unresolvedParticipantSlots: 14, pendingResults: 51, confirmedResults: 0, manualReviewResults: 0, voidResults: 0,
    completedScoringRuns: 1, failedScoringRuns: 0, staleRunningScoringRuns: 0,
    completeTeamProfiles: 20, incompleteTeamProfiles: 4, disabledFeatures: 0,
    activeGraceWindows: 0, expiredUnrevokedGraceWindows: 0,
  },
})

describe('Stage 13F-K2 control-room surfaces', () => {
  it('shows fixture mutation controls only to the owner', () => {
    const owner = renderToStaticMarkup(<AdminFixtureOperations client={{}} tournamentId="t" matches={[match]} venues={[venue]} adminRole="owner" actionStatus="idle" runAction={() => {}} />)
    const resultsAdmin = renderToStaticMarkup(<AdminFixtureOperations client={{}} tournamentId="t" matches={[match]} venues={[venue]} adminRole="results_admin" actionStatus="idle" runAction={() => {}} />)
    expect(owner).toContain('Save fixture schedule')
    expect(owner).toContain('Venue-local kick-off')
    expect(owner).toContain('ui-button ui-button--primary')
    expect(owner).not.toContain('The audit note must be between 5 and 500 characters.')
    expect(resultsAdmin).toContain('only the tournament owner')
    expect(resultsAdmin).not.toContain('Save fixture schedule')
  })

  it('keeps result validation neutral after refresh and uses the primary action style', () => {
    const source = readFileSync(new URL('../AdminMatchOperations.jsx', import.meta.url), 'utf8')
    expect(source).toContain('resultDirty && validation && !validation.valid')
    expect(source).toContain('!resultDirty && selectedMatch.resultRevision > 0')
    expect(source).toContain('ui-button ui-button--primary')
    expect(source).toContain('No canonical result changes detected.')
  })

  it('shows complete reconciliation only to the owner and preserves separate competition language', () => {
    const props = { client: {}, tournamentId: 't', features: [], runs: [], actionStatus: 'idle', runAction: () => {} }
    const owner = renderToStaticMarkup(<AdminScoringRecovery {...props} adminRole="owner" />)
    const resultsAdmin = renderToStaticMarkup(<AdminScoringRecovery {...props} adminRole="results_admin" />)
    expect(owner).toContain('Reconcile all points')
    expect(owner).toContain('Original Predictor and KO Predictor totals remain separate')
    expect(resultsAdmin).not.toContain('Reconcile all points')
  })

  it('renders consolidated readiness and a dependency-only Tournament Picks home', () => {
    const readiness = renderToStaticMarkup(<AdminReadiness controlRoom={controlRoom} />)
    const picks = renderToStaticMarkup(<AdminTournamentPicks readiness={{ contractReady: true, outcomeActivationReady: false }} />)
    expect(readiness).toContain('Fixture schedule')
    expect(readiness).toContain('Unresolved slots')
    expect(picks).toContain('Waiting for Stage 17A')
    expect(picks).not.toContain('Enter outcome')
  })

  it('shows fixture before/after detail and scoring-run identifiers without edit controls', () => {
    const html = renderToStaticMarkup(<AdminAuditTimeline events={[
      { eventId: 'e1', operationType: 'fixture_schedule_updated', matchId: 'm', matchNumber: 1, performedByDisplayName: 'Owner', note: 'Official update', createdAt: '2026-07-03T12:00:00Z', payload: { before: { fixture_revision: 1 }, after: { fixture_revision: 2 } } },
      { eventId: 'e2', operationType: 'tournament_points_reconciled', performedByDisplayName: 'Owner', note: 'Full rebuild', createdAt: '2026-07-03T12:05:00Z', payload: { scoring_run_id: 'run-1' } },
    ]} />)
    expect(html).toContain('Before')
    expect(html).toContain('After')
    expect(html).toContain('run-1')
    expect(html).not.toContain('Delete event')
  })
})
