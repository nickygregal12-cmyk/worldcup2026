import { describe, expect, it } from 'vitest'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_EFFECTIVE_TIME_CASES,
  STAGE16A_P2_REQUIRED_PHASE_KEYS,
  WC26_PRODUCTION_PROJECT_REF,
  buildStage16aEffectiveTimePlan,
  validateStage16aEffectiveTimeCases,
} from '../lib/stage16aStagingEffectiveTime.mjs'

const approvedPhaseKeysForAudit = [
  'pre_lock',
  'global_lock',
  'grace_period',
  'group_live',
  'group_complete',
  'knockout_unresolved',
  'knockout_known',
  'ko_open',
  'fixture_locked',
  'match_live',
  'correction_review',
  'tournament_complete',
]

describe('Stage 16A-P2 staging-effective database time', () => {
  it('publishes the approved resettable time-phase evidence catalogue', () => {
    const validation = validateStage16aEffectiveTimeCases()

    expect(STAGE16A_P2_REQUIRED_PHASE_KEYS).toEqual(approvedPhaseKeysForAudit)
    expect(validation.caseCount).toBe(11)
    expect(validation.hasOriginalEvidence).toBe(true)
    expect(validation.hasKoEvidence).toBe(true)
    expect(validation.appliesRealGlobalLock).toBe(false)
    expect(validation.mutatesTournamentData).toBe(false)
  })

  it('keeps every case on existing phase presets and away from the real global lock', () => {
    for (const item of STAGE16A_EFFECTIVE_TIME_CASES) {
      expect(STAGE16A_P2_REQUIRED_PHASE_KEYS).toContain(item.phaseKey)
      expect(item.resettable).toBe(true)
      expect(item.appliesRealGlobalLock).toBe(false)
      expect(item.mutatesTournamentData).toBe(false)
    }
  })

  it('fails closed outside Euro staging and explicitly blocks WC26 production', () => {
    expect(buildStage16aEffectiveTimePlan({ projectRef: EURO28_STAGING_PROJECT_REF }).projectRef).toBe(EURO28_STAGING_PROJECT_REF)
    expect(() => buildStage16aEffectiveTimePlan({ projectRef: WC26_PRODUCTION_PROJECT_REF })).toThrow(/blocked against the WC26 production project/)
    expect(() => buildStage16aEffectiveTimePlan({ projectRef: 'random-project' })).toThrow(/requires Euro staging project/)
  })

  it('builds a guarded plan without users, prediction seeds or migrations', () => {
    const plan = buildStage16aEffectiveTimePlan()

    expect(plan.stage).toBe('16A-P2')
    expect(plan.usesExistingTimeControl).toBe(true)
    expect(plan.createsMigration).toBe(false)
    expect(plan.createsUsers).toBe(false)
    expect(plan.seedsPredictions).toBe(false)
    expect(plan.appliesRealGlobalLock).toBe(false)
    expect(plan.mutatesTournamentData).toBe(false)
  })

  it('rejects catalogue drift before seeded acceptance relies on it', () => {
    const badPhase = STAGE16A_EFFECTIVE_TIME_CASES.map(item => ({ ...item }))
    badPhase[0] = { ...badPhase[0], phaseKey: 'not_a_phase' }
    expect(() => validateStage16aEffectiveTimeCases({ cases: badPhase })).toThrow(/unknown phase/)

    const badLock = STAGE16A_EFFECTIVE_TIME_CASES.map(item => ({ ...item }))
    badLock[0] = { ...badLock[0], appliesRealGlobalLock: true }
    expect(() => validateStage16aEffectiveTimeCases({ cases: badLock })).toThrow(/real global lock/)
  })
})
