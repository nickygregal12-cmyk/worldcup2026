import { describe, expect, it } from 'vitest'
import {
  calculateGroupGoalsTotal,
  GROUP_GOALS_COPY,
  GROUP_GOALS_SCORING_STATUS,
  scoreGroupGoalsTotal,
} from '../groupGoalsModel.js'

function draftWith(rows) {
  return { groupPredictions: Object.fromEntries(rows.map((row, index) => [String(index + 1), row])) }
}

describe('calculated group-stage goals total', () => {
  it('sums every entered group score', () => {
    const draft = draftWith([
      { homeScore: 2, awayScore: 1 },
      { homeScore: 0, awayScore: 0 },
      { homeScore: 3, awayScore: 2 },
    ])

    expect(calculateGroupGoalsTotal(draft, 3).total).toBe(8)
  })

  it('counts a 0-0 prediction as entered, not as missing', () => {
    const goals = calculateGroupGoalsTotal(draftWith([{ homeScore: 0, awayScore: 0 }]), 1)

    expect(goals.entered).toBe(1)
    expect(goals.total).toBe(0)
    expect(goals.complete).toBe(true)
  })

  it('sums a partial predictor and reports it as incomplete', () => {
    const draft = draftWith([
      { homeScore: 2, awayScore: 1 },
      { homeScore: null, awayScore: null },
      { homeScore: 1, awayScore: null },
    ])
    const goals = calculateGroupGoalsTotal(draft, 3)

    expect(goals.total).toBe(3)
    expect(goals.entered).toBe(1)
    expect(goals.complete).toBe(false)
  })

  it('is complete only when all 36 group matches are scored', () => {
    const rows = Array.from({ length: 36 }, () => ({ homeScore: 1, awayScore: 1 }))

    expect(calculateGroupGoalsTotal(draftWith(rows)).complete).toBe(true)
    expect(calculateGroupGoalsTotal(draftWith(rows.slice(0, 35))).complete).toBe(false)
  })

  it('tolerates an empty or absent draft', () => {
    expect(calculateGroupGoalsTotal({}).total).toBe(0)
    expect(calculateGroupGoalsTotal(undefined).total).toBe(0)
  })

  it('offers no setter — the total is derived, never entered', () => {
    const model = { calculateGroupGoalsTotal, scoreGroupGoalsTotal }

    expect(Object.keys(model).some(key => /^set|^update|^save/.test(key))).toBe(false)
  })
})

describe('group-goals scoring', () => {
  it('is explicitly not built, and awards no points', () => {
    const result = scoreGroupGoalsTotal()

    expect(result.status).toBe(GROUP_GOALS_SCORING_STATUS.NOT_BUILT)
    expect(result.points).toBeNull()
  })
})

describe('group-goals copy', () => {
  it('states the mechanic without claiming a scoring rule', () => {
    expect(GROUP_GOALS_COPY.note).toBe('Calculated automatically from your 36 group-stage score predictions. Not editable.')
    expect(GROUP_GOALS_COPY.note).not.toMatch(/point|nearest|within|exact/i)
  })
})
