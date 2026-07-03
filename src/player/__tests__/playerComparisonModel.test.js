import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { LEAGUE_COMPETITION } from '../../leagues/leagueModel.js'
import { buildAlignedPlayerComparison } from '../playerComparisonModel.js'

function originalBundle(score = [2, 1], winner = 'A1') {
  return {
    visible: true,
    display_name: 'Player',
    match_predictions: [{ match_number: 1, home_score_90: score[0], away_score_90: score[1] }],
    bracket_predictions: [{ match_number: 37, advancing_tournament_team_id: winner }],
  }
}

describe('aligned player comparison', () => {
  it('aligns every Original match and bracket position without combining competitions', () => {
    const model = buildAlignedPlayerComparison({
      currentBundle: originalBundle([2, 1], 'A1'),
      otherBundle: originalBundle([2, 1], 'B1'),
      reference: buildGuestReference(),
      competitionKey: LEAGUE_COMPETITION.ORIGINAL,
    })
    expect(model.rows).toHaveLength(51)
    expect(model.summary.comparedSelections).toBe(2)
    expect(model.summary.exactScoreMatches).toBe(1)
    expect(model.summary.bracketMatches).toBe(0)
    expect(model.competitionKey).toBe('original')
    expect(model.release.copy).toContain('global lock')
  })

  it('keeps pre-lock Original selections private in both aligned columns', () => {
    const model = buildAlignedPlayerComparison({
      currentBundle: { visible: false, reason: 'Private until lock' },
      otherBundle: { visible: false, reason: 'Private until lock' },
      reference: buildGuestReference(),
      competitionKey: LEAGUE_COMPETITION.ORIGINAL,
    })
    expect(model.summary.comparedSelections).toBe(0)
    expect(model.summary.privateSelections).toBe(51)
    expect(model.rows[0].current.visibility).toBe('private')
    expect(model.rows[0].other.visibility).toBe('private')
  })

  it('shows released KO fixtures while future rows remain protected', () => {
    const reference = buildGuestReference()
    reference.knockoutMatches[0].status = 'completed'
    const prediction = {
      match_number: 37,
      home_score_90: 1,
      away_score_90: 1,
      advancing_tournament_team_id: 'A1',
      decision_method: 'penalties',
    }
    const model = buildAlignedPlayerComparison({
      currentBundle: { visible: true, match_predictions: [prediction] },
      otherBundle: { visible: true, match_predictions: [prediction] },
      reference,
      competitionKey: LEAGUE_COMPETITION.KO_PREDICTOR,
    })
    expect(model.rows).toHaveLength(15)
    expect(model.summary.comparedMatches).toBe(1)
    expect(model.summary.advancingTeamMatches).toBe(1)
    expect(model.summary.methodMatches).toBe(1)
    expect(model.rows[1].other.visibility).toBe('private')
    expect(model.release.copy).toContain('fixture')
  })
})
