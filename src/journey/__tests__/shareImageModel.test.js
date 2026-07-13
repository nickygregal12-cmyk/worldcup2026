import { describe, expect, it } from 'vitest'
import { BRACKET_TIE_COUNT, buildBracketShareModel, describeShareReadiness, shareTeamName } from '../shareImageModel.js'
import { VISUAL_BRACKET_DRAFT, VISUAL_GROUP_REFERENCE } from '../../testFixtures/visualFixture.js'
import { resolveGuestTournamentPreview } from '../../guest/index.js'

const reference = VISUAL_GROUP_REFERENCE

function modelFor(draft) {
  return buildBracketShareModel({ reference, draft, preview: resolveGuestTournamentPreview(reference, draft) })
}

describe('bracket share model', () => {
  it('is complete, with a champion, when all fifteen ties are picked', () => {
    const model = modelFor(VISUAL_BRACKET_DRAFT)
    expect(model.complete).toBe(true)
    expect(model.decided).toBe(BRACKET_TIE_COUNT)
    expect(model.remaining).toBe(0)
    expect(model.champion).not.toBeNull()
    expect(model.champion.label).toBeTruthy()
  })

  it('carries every tie, each naming its two teams and which one advances', () => {
    const model = modelFor(VISUAL_BRACKET_DRAFT)
    expect(Object.keys(model.tiesByMatchNumber)).toHaveLength(BRACKET_TIE_COUNT)
    for (const tie of Object.values(model.tiesByMatchNumber)) {
      expect(tie.slots).toHaveLength(2)
      expect(tie.slots.filter(slot => slot.advancing)).toHaveLength(1)
      expect(tie.decided).toBe(true)
    }
  })

  it('reports the seven converging lanes, final in the centre', () => {
    const model = modelFor(VISUAL_BRACKET_DRAFT)
    expect(model.columns.map(column => column.key)).toEqual([
      'r16-left', 'qf-left', 'sf-left', 'final-centre', 'sf-right', 'qf-right', 'r16-right',
    ])
  })

  it('reserves Top Scorer rather than inventing one — Stage 17A owns the pool', () => {
    expect(modelFor(VISUAL_BRACKET_DRAFT).topScorer).toBeNull()
  })

  it('auto-calculates the group-goals total from the 36 group scores', () => {
    const model = modelFor(VISUAL_BRACKET_DRAFT)
    const expected = Object.values(VISUAL_BRACKET_DRAFT.groupPredictions)
      .reduce((total, row) => total + row.homeScore + row.awayScore, 0)
    expect(model.groupGoals.total).toBe(expected)
    expect(model.groupGoals.complete).toBe(true)
  })

  it('offers the champion’s own three group matches as the optional score band', () => {
    const model = modelFor(VISUAL_BRACKET_DRAFT)
    expect(model.groupScores).toHaveLength(3)
    const championName = model.champion.label
    for (const score of model.groupScores) {
      expect([score.home.label, score.away.label]).toContain(championName)
      expect(Number.isInteger(score.homeScore)).toBe(true)
      expect(Number.isInteger(score.awayScore)).toBe(true)
    }
  })

  it('is incomplete, with no champion, when a tie is unpicked', () => {
    const draft = {
      ...VISUAL_BRACKET_DRAFT,
      bracketPredictions: {
        ...VISUAL_BRACKET_DRAFT.bracketPredictions,
        51: { matchNumber: 51, advancingTeamId: null, updatedAt: null },
      },
    }
    const model = modelFor(draft)
    expect(model.complete).toBe(false)
    expect(model.remaining).toBe(1)
    expect(model.champion).toBeNull()
    expect(model.groupScores).toEqual([])
  })
})

describe('share readiness copy', () => {
  it('invites a share once the bracket is finished', () => {
    expect(describeShareReadiness({ complete: true, remaining: 0 })).toEqual({
      ready: true, label: 'Share my bracket', hint: null,
    })
  })

  it('says exactly how many ties are left, and pluralises', () => {
    expect(describeShareReadiness({ complete: false, remaining: 4 }).hint).toBe('4 ties left to pick before you can share.')
    expect(describeShareReadiness({ complete: false, remaining: 1 }).hint).toBe('1 tie left to pick before you can share.')
  })

  it('does not count down from a bracket nobody has started', () => {
    expect(describeShareReadiness({ complete: false, remaining: BRACKET_TIE_COUNT }).hint)
      .toBe('Pick your way through the bracket to share it.')
  })
})

describe('broadcast short names', () => {
  it('abbreviates the names that cannot fit a lane, and leaves the rest alone', () => {
    expect(shareTeamName('Republic of Ireland')).toBe('Rep. Ireland')
    expect(shareTeamName('Northern Ireland')).toBe('N. Ireland')
    expect(shareTeamName('Netherlands')).toBe('Netherlands')
    expect(shareTeamName('Wales')).toBe('Wales')
  })
})
