import { describe, expect, it } from 'vitest'
import {
  buildAdminResultPayload,
  createAdminResultDraft,
  normaliseAdminAccess,
  normaliseAdminMatch,
  validateAdminResultDraft,
} from '../adminOperationsModel.js'

const groupMatch = Object.freeze({
  matchId: 'match-1',
  matchNumber: 1,
  matchStatus: 'scheduled',
  resultStatus: 'pending',
  resultRevision: 0,
  resultMethod: null,
  homeTeamId: 'home-team',
  awayTeamId: 'away-team',
  homeScore90: null,
  awayScore90: null,
  homeScoreAet: null,
  awayScoreAet: null,
  homePenalties: null,
  awayPenalties: null,
})

const knockoutMatch = Object.freeze({ ...groupMatch, matchId: 'match-37', matchNumber: 37 })

describe('admin operations model', () => {
  it('normalises access and match RPC rows', () => {
    expect(normaliseAdminAccess({ is_admin: true, admin_role: 'owner', tournament_id: 't' })).toEqual({
      isAdmin: true,
      adminRole: 'owner',
      tournamentId: 't',
    })

    expect(normaliseAdminMatch({
      match_id: 'm', match_number: 4, stage_code: 'GROUP', stage_name: 'Group stage',
      match_status: 'scheduled', result_status: 'pending', result_revision: 0,
      home_team_label: 'A1', away_team_label: 'A2', updated_at: '2026-07-01T12:00:00Z',
    })).toMatchObject({ matchId: 'm', matchNumber: 4, homeTeamLabel: 'A1', awayTeamLabel: 'A2' })
  })

  it('creates a draft from the current canonical result', () => {
    expect(createAdminResultDraft({
      ...knockoutMatch,
      matchStatus: 'completed',
      resultStatus: 'confirmed',
      resultMethod: 'penalties',
      homeScore90: 1,
      awayScore90: 1,
      homeScoreAet: 2,
      awayScoreAet: 2,
      homePenalties: 5,
      awayPenalties: 4,
    })).toMatchObject({
      decisionMethod: 'penalties',
      homeScore90: 1,
      homePenalties: 5,
    })
  })

  it('builds a valid group result and derives its winner', () => {
    const built = buildAdminResultPayload(groupMatch, {
      ...createAdminResultDraft(groupMatch),
      matchStatus: 'completed',
      resultStatus: 'confirmed',
      homeScore90: '2',
      awayScore90: '1',
      note: 'Confirmed from the official match report',
    })

    expect(built.payload).toMatchObject({
      normal_time_home_goals: 2,
      normal_time_away_goals: 1,
      decision_method: 'normal_time',
      winner_tournament_team_id: 'home-team',
    })
  })

  it('allows a drawn group result without a winner', () => {
    const built = buildAdminResultPayload(groupMatch, {
      ...createAdminResultDraft(groupMatch),
      matchStatus: 'completed', resultStatus: 'confirmed', homeScore90: 1, awayScore90: 1,
      note: 'Official group result confirmed',
    })
    expect(built.payload.winner_tournament_team_id).toBeNull()
  })

  it('validates a knockout penalty result and keeps shoot-out scores separate', () => {
    const built = buildAdminResultPayload(knockoutMatch, {
      ...createAdminResultDraft(knockoutMatch),
      matchStatus: 'completed', resultStatus: 'confirmed', decisionMethod: 'penalties',
      homeScore90: 1, awayScore90: 1, homeScoreAet: 2, awayScoreAet: 2,
      homePenalties: 5, awayPenalties: 4, note: 'Penalty result checked twice',
    })
    expect(built.payload).toMatchObject({
      after_extra_time_home_goals: 2,
      penalty_home_goals: 5,
      winner_tournament_team_id: 'home-team',
    })
  })

  it('rejects invalid knockout normal-time draws', () => {
    const result = validateAdminResultDraft(knockoutMatch, {
      ...createAdminResultDraft(knockoutMatch),
      matchStatus: 'completed', resultStatus: 'confirmed', homeScore90: 1, awayScore90: 1,
      note: 'Attempted official result entry',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('cannot be level')
  })

  it('clears score data for manual review and void operations', () => {
    const built = buildAdminResultPayload(knockoutMatch, {
      ...createAdminResultDraft(knockoutMatch),
      matchStatus: 'completed', resultStatus: 'manual_review',
      note: 'Result needs an official review',
    })
    expect(built.payload).toMatchObject({
      result_status: 'manual_review',
      normal_time_home_goals: null,
      winner_tournament_team_id: null,
    })
  })

  it('requires resolved participants and a meaningful audit note', () => {
    const result = validateAdminResultDraft({ ...groupMatch, homeTeamId: null }, {
      ...createAdminResultDraft(groupMatch),
      matchStatus: 'completed', resultStatus: 'confirmed', homeScore90: 1, awayScore90: 0,
      note: 'x',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(2)
  })
})
