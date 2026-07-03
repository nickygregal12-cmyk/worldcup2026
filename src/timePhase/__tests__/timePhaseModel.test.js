import { describe, expect, it } from 'vitest'
import { canApplyStagingTime, normaliseTimeControl, TIME_PHASE_PRESETS } from '../timePhaseModel.js'

describe('staging time and phase model', () => {
  it('fails closed outside an explicitly enabled staging build', () => {
    const control = normaliseTimeControl({ is_enabled: true, simulated_at: '2028-06-09T19:00:00Z' })
    expect(canApplyStagingTime({ appEnv: 'production', enableTimeTravel: true, control })).toBe(false)
    expect(canApplyStagingTime({ appEnv: 'staging', enableTimeTravel: false, control })).toBe(false)
  })
  it('allows an enabled control only in staging', () => {
    const control = normaliseTimeControl({ is_enabled: true, simulated_at: '2028-06-09T19:00:00Z' })
    expect(canApplyStagingTime({ appEnv: 'staging', enableTimeTravel: true, control })).toBe(true)
  })
  it('defines the required testing scenarios', () => {
    expect(TIME_PHASE_PRESETS.map(item => item.key)).toContain('tournament_complete')
    expect(TIME_PHASE_PRESETS.map(item => item.key)).toContain('match_live')
    expect(TIME_PHASE_PRESETS.map(item => item.key)).toContain('knockout_unresolved')
  })
})
