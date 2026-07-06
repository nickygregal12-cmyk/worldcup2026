import { describe, expect, it } from 'vitest'
import { buildKoPredictorLifecycleStatus, buildKoRoundProgress, deriveKoMatchPresentation, koMethodOptions, koRowIsComplete } from '../koPredictorPresentationModel.js'

const complete = { homeScore: 1, awayScore: 1, advancingTeamId: 'a', decisionMethod: 'penalties' }

describe('KO Predictor presentation model', () => {
  it('recognises a complete separate KO prediction', () => {
    expect(koRowIsComplete(complete)).toBe(true)
    expect(koRowIsComplete({ ...complete, decisionMethod: null })).toBe(false)
  })

  it('only offers extra time or penalties after a 90-minute draw', () => {
    expect(koMethodOptions({ homeScore: 1, awayScore: 1 }).map(item => item.value)).toEqual(['extra_time', 'penalties'])
    expect(koMethodOptions({ homeScore: 2, awayScore: 1 }).map(item => item.value)).toEqual(['normal_time'])
  })

  it('locks live and completed fixtures', () => {
    expect(deriveKoMatchPresentation({ status: 'live' }, complete)).toMatchObject({ locked: true, label: 'Live · locked' })
    expect(deriveKoMatchPresentation({ status: 'completed' }, complete)).toMatchObject({ locked: true, label: 'Finished' })
  })


  it('keeps KO Predictor closed until real fixtures are resolved', () => {
    const reference = { knockoutMatches: [
      { matchNumber: 37, participantsResolved: false },
      { matchNumber: 38, participantsResolved: false },
    ] }
    const status = buildKoPredictorLifecycleStatus(reference, { locked: true }, { complete: 0, available: 0 })

    expect(status.key).toBe('waiting-for-fixtures')
    expect(status.title).toBe('KO Predictor waits for real fixtures')
    expect(status.boundaryLabel).toContain('KO Predictor fixtures open only when real teams are known')
  })

  it('summarises available KO fixtures without mixing Original points', () => {
    const reference = { knockoutMatches: [
      { matchNumber: 37, participantsResolved: true },
      { matchNumber: 38, participantsResolved: false },
    ] }
    const status = buildKoPredictorLifecycleStatus(reference, { locked: false }, { complete: 1, available: 1 })

    expect(status.key).toBe('ready-for-review')
    expect(status.progressLabel).toBe('1/1 available KO predictions complete')
    expect(status.boundaryLabel).toContain('own points, jokers and standings')
  })

  it('summarises only resolved fixtures by round', () => {
    const reference = { knockoutMatches: [
      { matchNumber: 37, participantsResolved: true },
      { matchNumber: 38, participantsResolved: false },
      { matchNumber: 45, participantsResolved: true },
    ] }
    const draft = { rows: { '37': complete, '38': {}, '45': {} } }
    expect(buildKoRoundProgress(reference, draft)[0]).toMatchObject({ available: 1, complete: 1 })
    expect(buildKoRoundProgress(reference, draft)[1]).toMatchObject({ available: 1, complete: 0 })
  })
})
